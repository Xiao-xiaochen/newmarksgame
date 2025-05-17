import { Context, Session } from 'koishi';
import { Region, userdata, Army } from '../types'; // 导入所需类型
import { findArmyByTarget } from '../utils/ArmyUtils'; // 假设有一个工具函数来查找军队

export function AllocateManpowerToArmy(ctx: Context) {
  ctx.command('分配人力 <target:string> <amount:number>', '为指定军队分配人力（从地区人口和劳动力中抽取）')
    .alias('分配兵力', '征兵')
    .usage('分配人力 <军队名称或编号> <数量>')
    .example('分配人力 11451 10000')
    .example('分配人力 1145第一军 5000')
    .action(async ({ session }, target, amount) => {
      if (!session || !session.userId || !session.author) {
        return '无法获取用户信息。';
      }
      if (!session.guildId) {
        return '此命令只能在群聊中使用。';
      }
      if (!target || !amount) {
        return '请输入有效的军队名称/编号和要分配的人力数量。';
      }
      if (amount <= 0 || !Number.isInteger(amount)) {
        return '分配的人力数量必须是正整数。';
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

        // 3. 查找目标军队
        const army = await findArmyByTarget(ctx, target, regionId); // 使用工具函数查找
        if (!army) {
          return `在地区 ${regionId} 未找到指定的军队 "${target}"。`;
        }

        // 4. 检查权限
        // 允许军队指挥官或地区领导分配人力
        if (army.commanderId !== userId && region.leader !== userId) {
          return `您不是军队 ${army.name} (${army.armyId}) 的指挥官，也不是地区 ${regionId} 的领导，无权分配人力。`;
        }

        // 5. 检查地区空闲劳动力、总劳动力和总人口
        const currentPopulation = region.population || 0;
        const currentTotalLabor = region.labor || 0;
        const currentIdleLabor = region.Busylabor || 0;

        if (currentIdleLabor < amount) {
          return `地区 ${regionId} 的空闲劳动力不足 (${currentIdleLabor})，无法分配 ${amount} 人力。`;
        }
        if (currentTotalLabor < amount) {
          // 理论上 currentIdleLabor <= currentTotalLabor，此检查可能冗余，但为保险起见保留
          return `地区 ${regionId} 的总劳动力不足 (${currentTotalLabor})，无法分配 ${amount} 人力。`;
        }
        if (currentPopulation < amount) {
          return `地区 ${regionId} 的总人口不足 (${currentPopulation})，无法分配 ${amount} 人力。`;
        }

        // 6. 执行分配
        const updatedRegionPopulation = currentPopulation - amount;
        const updatedRegionTotalLabor = currentTotalLabor - amount;
        const updatedRegionIdleLabor = currentIdleLabor - amount;
        const updatedArmyManpower = (army.manpower || 0) + amount;

        // 更新数据库
        await ctx.database.set('regiondata', { RegionId: regionId }, {
          population: updatedRegionPopulation,
          labor: updatedRegionTotalLabor,
          Busylabor: updatedRegionIdleLabor
        });
        await ctx.database.set('army', { armyId: army.armyId }, { manpower: updatedArmyManpower });

        return `成功为军队 ${army.name} (${army.armyId}) 分配了 ${amount} 人力。
地区剩余人口：${updatedRegionPopulation}
地区剩余总劳动力：${updatedRegionTotalLabor}
地区剩余空闲劳动力：${updatedRegionIdleLabor}
军队当前总兵力：${updatedArmyManpower}`;

      } catch (error) {
        console.error(`处理分配人力命令时出错 (用户: ${userId}, 军队目标: ${target}, 数量: ${amount}):`, error);
        const errorMessage = (error as Error).message;
        return `处理分配人力命令时发生内部错误: ${errorMessage}`;
      }
    });
}

// 注意：你需要创建一个 src/utils/ArmyUtils.ts 文件并实现 findArmyByTarget 函数
// findArmyByTarget 的大致逻辑是：
// 1. 尝试按 armyId 查询 army 表
// 2. 如果没找到，则按 name 和 regionId 查询 army 表
// 3. 返回找到的 Army 对象或 null