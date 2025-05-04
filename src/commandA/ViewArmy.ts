import { Context, Session } from 'koishi';
import { Army, ArmyStatus } from '../types'; // 导入 Army 类型 和 ArmyStatus 枚举
import { findArmyByTarget } from '../utils/ArmyUtils'; // 导入查找军队的工具函数

export function ViewArmy(ctx: Context) {
  ctx.command('查看军队 <target:string>', '查看指定军队的详细信息（仅限指挥官）')
    .usage('查看军队 <军队名称或编号>')
    .example('查看军队 33481')
    .example('查看军队 3348第一军')
    .action(async ({ session }, target) => {
      if (!session || !session.userId || !session.author) {
        return '无法获取用户信息。';
      }
      // 注意：此命令不需要 guildId，因为军队查找不一定局限于当前群聊绑定的地区
      // 但如果需要基于群聊地区查找，则需要添加 guildId 检查和地区数据获取
      if (!target) {
        return '请输入有效的军队名称或编号。';
      }

      const userId = session.userId;
      const username = session.author.name || '未知用户';

      try {
        // 1. 查找目标军队 (不限制地区，因为指挥官可能在任何地方查看自己的军队)
        const army = await findArmyByTarget(ctx, target); // 不传入 regionId
        if (!army) {
          return `未找到指定的军队 "${target}"。`;
        }

        // 2. 检查权限 - 必须是军队指挥官
        if (army.commanderId !== userId) {
          return `您不是军队 ${army.name} (${army.armyId}) 的指挥官，无权查看其详细信息。`;
        }

        // 3. 格式化并返回军队信息
        const armyId = army.armyId;
        const regionId = army.regionId; // 驻扎地区 ID
        const manpower = army.manpower || 0;
        // 假设战斗人员数量等于步兵装备数量
        const combatPersonnel = army.equipment?.InfantryEquipment || 0;

        // 根据军队状态生成任务描述
        let taskDescription = '状态：未知';
        if (army.status === ArmyStatus.MARCHING && army.targetRegionId && army.marchEndTime) {
          const endTime = new Date(army.marchEndTime);
          const now = new Date();
          const remainingTimeMs = endTime.getTime() - now.getTime();
          if (remainingTimeMs > 0) {
            // 简单的毫秒转时分秒
            const totalSeconds = Math.floor(remainingTimeMs / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            const remainingTimeString = `${hours}小时${minutes}分钟${seconds}秒`;
            taskDescription = `状态：行军中
目标地区：${army.targetRegionId}
预计到达：${remainingTimeString}后`;
          } else {
            taskDescription = `状态：行军已结束（等待处理）
目标地区：${army.targetRegionId}`;
          }
        } else if (army.status === ArmyStatus.FIGHTING) {
          taskDescription = '状态：战斗中';
        } else if (army.status === ArmyStatus.GARRISONED) {
          taskDescription = '状态：驻扎中';
        } else {
          // 处理未知的状态，或者可以记录一个警告
          taskDescription = `状态：未知 (${army.status || '空'})`;
          console.warn(`未知的军队状态: ${army.status} for army ${army.armyId}`);
        }

        const response = [
          '=====[军队信息]=====',
          `军队编号：${armyId}`,
          `驻扎地区：${regionId}`,
          `军队人数：${manpower}人`,
          `战斗人员：${combatPersonnel} 人`,
          taskDescription
        ].join('\n');

        return response;

      } catch (error) {
        console.error(`处理查看军队命令时出错 (用户: ${userId}, 军队目标: ${target}):`, error);
        const errorMessage = (error as Error).message;
        return `处理查看军队命令时发生内部错误: ${errorMessage}`;
      }
    });
}