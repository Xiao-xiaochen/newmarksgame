import { Context, Session } from 'koishi';
import { Region, userdata, Army, ArmyStatus } from '../types'; // 导入所需类型

const MAX_ARMIES_PER_REGION = 9; // 每个地区最多9支军队
const INITIAL_ARMY_MANPOWER = 0; // 初始兵力
const INITIAL_ARMY_FOOD = 0;     // 初始粮食

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
        if (existingArmies.length >= MAX_ARMIES_PER_REGION) {
          return `地区 ${regionId} 的军队数量已达上限 (${MAX_ARMIES_PER_REGION}支)。`;
        }

        // 5. 生成新的军队ID和名称
        let nextArmyIndex = 1;
        const existingIndices = new Set(existingArmies.map(army => parseInt(army.armyId.slice(-1)))); // 获取末尾数字
        while (existingIndices.has(nextArmyIndex)) {
          nextArmyIndex++;
          if (nextArmyIndex > MAX_ARMIES_PER_REGION) {
            // 理论上不会发生，因为前面检查了总数，但作为保险
            return `无法为新军队分配编号，请联系管理员。`;
          }
        }

        const newArmyId = `${regionId}${nextArmyIndex}`;
        const newArmyName = `${regionId}第${nextArmyIndex}军`; // 使用中文数字或阿拉伯数字均可

        // 6. 创建军队数据
        const newArmy: Army = {
          armyId: newArmyId,
          name: newArmyName,
          commanderId: userId, // 组建者默认为指挥官
          regionId: regionId,
          manpower: INITIAL_ARMY_MANPOWER,
          equipment: {}, // 初始无装备
          foodSupply: INITIAL_ARMY_FOOD,
          status: ArmyStatus.GARRISONED, // 初始状态为驻扎
          targetRegionId: undefined, // null 或 undefined 均可
          marchEndTime: undefined,
        };

        // 7. 存入数据库
        await ctx.database.create('army', newArmy);

        return `组建成功！新的军队已建立：\n名称：${newArmyName}\n编号：${newArmyId}\n指挥官：${username}`;

      } catch (error) {
        console.error(`处理组建军队命令时出错 (用户: ${userId}, 地区: ${guildId}):`, error);
        const errorMessage = (error as Error).message;
        return `处理组建军队命令时发生内部错误: ${errorMessage}`;
      }
    });
}