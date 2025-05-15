import { Context, Session } from 'koishi';
import { Region, userdata, Army, ArmyStatus } from '../types'; // 导入所需类型

//config
//MaxArmiesPerRegion:number; //每个地区最大军队
//InitialArmyManPower:number; //地区初始兵力
//InitialArmyFood:number;  //地区初始食物

export function FormArmy(ctx: Context) {
  ctx.command('组建军队', '在当前地区组建一支新的陆军部队')
    .alias('建立军队')
    .action(async ({ session }) => {
      if (!session || !session.userId || !session.author) {
        return '无法获取用户信息。';
      }
      if (!session.guildId) {
        return '此命令只能在群聊中使用。';
      }

      const userId = session.userId;
      const guildId = session.guildId;
      const username = session.author.name || '未知用户';

      try {
        // 1. 获取用户数据
        const userDataResult = await ctx.database.get('userdata', { userId: userId });
        if (!userDataResult || userDataResult.length === 0) {
          return `${username} 同志，您尚未注册。`;
        }
        const user: userdata = userDataResult[0];

        // 2. 获取当前群聊绑定的地区数据
        const regionDataResult = await ctx.database.get('regiondata', { guildId: guildId });
        if (!regionDataResult || regionDataResult.length === 0) {
          return `当前群聊 (${guildId}) 未绑定任何地区。`;
        }
        const region: Region = regionDataResult[0];
        const regionId = region.RegionId;

        // 3. 检查权限和归属
        if (!user.countryName || user.countryName !== region.owner) {
          return `您 (${user.countryName || '无国家'}) 不属于控制该地区 (${regionId}) 的国家 (${region.owner || '无主地'})，无法在此组建军队。`;
        }
        const countrylearder = await ctx.database.get('userdata', { userId: region.leader });
        if ( user.isLeader !== true ) {
           return `只有地区领导 (${region.leader || '未指定'}) 才能组建军队。`;
        }

        // 4. 检查军队数量限制
        const existingArmies = await ctx.database.get('army', { regionId: regionId });
        if (existingArmies.length >= ctx.config.MaxArmiesPerRegion) {
          return `地区 ${regionId} 的军队数量已达上限 (${ctx.config.MaxArmiesPerRegion}支)。`;
        }

        // 5. 生成新的军队ID和名称，并处理可能的并发冲突
        let armyCreated = false;
        let newArmyId = '';
        let newArmyName = '';
        let attempts = 0;
        const MAX_CREATION_ATTEMPTS = 5; // 最多尝试5次以防ID冲突

        while (!armyCreated && attempts < MAX_CREATION_ATTEMPTS) {
            attempts++;

            // 在每次尝试前重新获取当前地区的军队，以获取最新状态应对并发
            const currentArmiesInRegion = await ctx.database.get('army', { regionId: regionId });
            if (currentArmiesInRegion.length >= ctx.config.MaxArmiesPerRegion) {
                // 如果在第一次尝试时就满了，直接返回
                // 如果是重试时发现满了，说明在并发情况下其他请求成功创建了军队
                return `地区 ${regionId} 的军队数量已达上限 (${ctx.config.MaxArmiesPerRegion}支)。`;
            }

            let nextArmyIndex = 1;
            const existingIndices = new Set<number>();
            for (const army of currentArmiesInRegion) {
                if (army.armyId.startsWith(regionId)) {
                    // 从 regionId 之后的部分提取序号
                    const indexStr = army.armyId.substring(regionId.length);
                    const index = parseInt(indexStr);
                    if (!isNaN(index) && index > 0) { // 确保是有效的正整数序号
                        existingIndices.add(index);
                    }
                }
            }
            
            while (existingIndices.has(nextArmyIndex)) {
                nextArmyIndex++;
            }

            // 安全检查，防止 nextArmyIndex 超出合理范围
            // 理论上，如果 currentArmiesInRegion.length < ctx.config.MaxArmiesPerRegion，总能找到一个 <= ctx.config.MaxArmiesPerRegion 的可用 nextArmyIndex
            if (nextArmyIndex > ctx.config.MaxArmiesPerRegion) {
                 // 这种情况通常不应该发生，除非 ctx.config.MaxArmiesPerRegion 设置得非常小，
                 // 或者 existingIndices 的计算逻辑有误，或者数据库中存在不符合 "regionId + 数字序号" 格式的脏数据
                console.warn(`Calculated nextArmyIndex ${nextArmyIndex} for region ${regionId} which is > ctx.config.MaxArmiesPerRegion ${ctx.config.MaxArmiesPerRegion}. Army count: ${currentArmiesInRegion.length}. Indices: ${Array.from(existingIndices).join(',')}`);
                // 尝试寻找一个在[1, ctx.config.MaxArmiesPerRegion]范围内未被占用的序号作为回退
                let fallbackIndexFound = false;
                for (let i = 1; i <= ctx.config.MaxArmiesPerRegion; i++) {
                    if (!existingIndices.has(i)) {
                        nextArmyIndex = i;
                        fallbackIndexFound = true;
                        break;
                    }
                }
                if (!fallbackIndexFound) {
                    // 如果连回退都找不到（例如所有1-9的序号都被非标准ID占用了），则确实无法创建
                    return `无法为地区 ${regionId} 的新军队找到合适的编号 (${ctx.config.MaxArmiesPerRegion}个已满或冲突)，请检查数据或联系管理员。`;
                }
            }

            newArmyId = `${regionId}${nextArmyIndex}`;
            newArmyName = `${regionId}第${nextArmyIndex}军`;

            const newArmy: Army = {
                armyId: newArmyId,
                name: newArmyName,
                commanderId: userId,
                regionId: regionId,
                manpower: ctx.config.InitialArmyManPower,
                equipment: {},
                foodSupply: ctx.config.InitialArmyFood,
                status: ArmyStatus.GARRISONED,
                targetRegionId: undefined,
                marchEndTime: undefined,
                organization: 0, // 根据模型定义，添加 organization 字段并设初始值
            };

            try {
                await ctx.database.create('army', newArmy);
                armyCreated = true; // 标记成功创建
            } catch (dbError) {
                if (dbError.message.includes('UNIQUE constraint failed')) {
                    if (attempts >= MAX_CREATION_ATTEMPTS) {
                        console.error(`Failed to create army in region ${regionId} for user ${userId} after ${MAX_CREATION_ATTEMPTS} attempts due to ID collision with ID ${newArmyId}.`);
                        // 当达到最大尝试次数后，仍然冲突，则返回错误给用户
                        return `创建军队时ID (${newArmyId}) 持续冲突，请稍后再试或联系管理员。`;
                    }
                    // 发生ID冲突，记录警告，外层while循环将进行下一次尝试
                    console.warn(`Army ID ${newArmyId} collision on attempt ${attempts} for region ${regionId}. Retrying.`);
                } else {
                    // 如果是其他类型的数据库错误，则直接抛出，由后续的catch块处理
                    throw dbError;
                }
            }
        } // 结束 while 循环

        if (armyCreated) {
            return `组建成功！新的军队已建立：\n名称：${newArmyName}\n编号：${newArmyId}\n指挥官：${username}`;
        } else {
            // 如果循环结束仍未成功创建军队（通常是因为达到最大尝试次数）
            return `创建军队失败，可能由于ID冲突或地区军队已满。请稍后再试。`;
        }

      } catch (error) {
        console.error(`处理组建军队命令时出错 (用户: ${userId}, 地区ID: ${session.guildId ? (await ctx.database.get('regiondata', { guildId: session.guildId }))[0]?.RegionId : 'N/A'}):`, error);
        const errorMessage = (error as Error).message;
        return `处理组建军队命令时发生内部错误: ${errorMessage}`;
      }
    });
}
