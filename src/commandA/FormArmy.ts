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
        const originRegionId = region.RegionId; // 这是新军队的“出生地区ID”

        // 3. 检查权限和归属
        if (!user.countryName || user.countryName !== region.owner) {
          return `您 (${user.countryName || '无国家'}) 不属于控制该地区 (${originRegionId}) 的国家 (${region.owner || '无主地'})，无法在此组建军队。`;
        }
        const countrylearder = await ctx.database.get('userdata', { userId: region.leader });
        if ( user.isLeader !== true ) {
           return `只有地区领导 (${region.leader || '未指定'}) 才能组建军队。`;
        }

        // 4. 检查军队数量限制
        // 首先，检查以此地为“出生地”的军队总数是否已达上限
        // 使用正则表达式进行前缀匹配: ^ 表示字符串的开始
        const allArmiesFromThisOrigin = await ctx.database.get('army', { armyId: new RegExp(`^${originRegionId}`) });
        if (allArmiesFromThisOrigin.length >= ctx.config.MaxArmiesPerRegion) {
          return `以地区 ${originRegionId} 为初始地的军队数量已达上限 (${ctx.config.MaxArmiesPerRegion}支)。`;
        }

        // 5. 生成新的军队ID和名称，并处理可能的并发冲突
        let armyCreated = false;
        let newArmyId = '';
        let newArmyName = '';
        let attempts = 0;
        const MAX_CREATION_ATTEMPTS = 5; // 最多尝试5次以防ID冲突

        while (!armyCreated && attempts < MAX_CREATION_ATTEMPTS) {
            attempts++;

            // 在每次尝试前重新获取所有以此地为“出生地”的军队，以获取最新状态应对并发
            // 使用正则表达式进行前缀匹配: ^ 表示字符串的开始
            const currentArmiesWithSameOrigin = await ctx.database.get('army', { armyId: new RegExp(`^${originRegionId}`) });
            
            // 再次检查上限，因为并发情况下其他请求可能已创建军队
            if (currentArmiesWithSameOrigin.length >= ctx.config.MaxArmiesPerRegion) {
                return `以地区 ${originRegionId} 为初始地的军队数量已达上限 (${ctx.config.MaxArmiesPerRegion}支)。`;
            }

            let nextArmyIndex = 1;
            const existingIndices = new Set<number>();
            for (const army of currentArmiesWithSameOrigin) {
                if (army.armyId.startsWith(originRegionId)) { // 这里 .startsWith() 是字符串方法，用于逻辑判断，是正确的
                    const indexStr = army.armyId.substring(originRegionId.length);
                    const index = parseInt(indexStr);
                    if (!isNaN(index) && index > 0) {
                        existingIndices.add(index);
                    }
                }
            }

            while (existingIndices.has(nextArmyIndex)) {
                nextArmyIndex++;
            }

            // 安全检查，防止 nextArmyIndex 超出合理范围
            // 这里的 MaxArmiesPerRegion 应该是指每个“出生地区”能产生的最大军队数
            if (nextArmyIndex > ctx.config.MaxArmiesPerRegion && currentArmiesWithSameOrigin.length >= ctx.config.MaxArmiesPerRegion) {
                console.warn(`[FormArmy] Origin Region ${originRegionId} is full or next index ${nextArmyIndex} exceeds max ${ctx.config.MaxArmiesPerRegion}. Army count: ${currentArmiesWithSameOrigin.length}.`);
                return `以地区 ${originRegionId} 为初始地的军队数量已达上限 (${ctx.config.MaxArmiesPerRegion}支) 或无法找到可用编号。`;
            } else if (nextArmyIndex > 9999 && ctx.config.MaxArmiesPerRegion > 9999) { // 假设序号最大4位，除非配置允许更大
                console.warn(`[FormArmy] Calculated nextArmyIndex ${nextArmyIndex} for origin region ${originRegionId} is too large.`);
                return `无法为地区 ${originRegionId} 的新军队找到合适的编号（序号过大）。`;
            }

            newArmyId = `${originRegionId}${nextArmyIndex}`;
            newArmyName = `${originRegionId}第${nextArmyIndex}军`;

            const newArmy: Army = {
              armyId: newArmyId,
              name: newArmyName,
              commanderId: userId,
              regionId: originRegionId, 
              manpower: ctx.config.InitialArmyManPower,
              equipment: {},
              foodSupply: ctx.config.InitialArmyFood,
              status: ArmyStatus.GARRISONED,
              targetRegionId: undefined,
              marchEndTime: undefined,
              organization: ctx.config.InitialArmyManPower * 0.5,
              //ownerGuildId: ''
            };

            try {
                await ctx.database.create('army', newArmy);
                armyCreated = true; // 标记成功创建
            } catch (dbError) {
                if (dbError.message.includes('UNIQUE constraint failed')) {
                    if (attempts >= MAX_CREATION_ATTEMPTS) {
                        console.error(`Failed to create army for origin region ${originRegionId} for user ${userId} after ${MAX_CREATION_ATTEMPTS} attempts due to ID collision with ID ${newArmyId}.`);
                        return `创建军队时ID (${newArmyId}) 持续冲突，请稍后再试或联系管理员。`;
                    }
                    console.warn(`Army ID ${newArmyId} collision on attempt ${attempts} for origin region ${originRegionId}. Retrying.`);
                } else {
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
