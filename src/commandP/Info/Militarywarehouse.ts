import { Context } from 'koishi';
import { userdata } from '../../types'; // 导入 userdata 类型

// 辅助函数：格式化军事仓库内容
function formatMilitaryWarehouse(warehouse: object | null | undefined, capacity: number, occupied: number): string {
  if (!warehouse) {
    return `■ 军事仓库: (无数据)`;
  }
  const items = Object.entries(warehouse)
    .filter(([key, value]) => typeof value === 'number' && value > 0) // 只显示数量大于0的单位
    .map(([key, value]) => `  -${key}: ${value}`)
    .join('\n');

  const capacityInfo = `${occupied} / ${capacity}`;
  // 如果仓库为空，显示 (空)；否则显示物品列表
  const itemsDisplay = items.length > 0 ? items : '  (空)';
  return `■ 军事仓库: ${capacityInfo}\n${itemsDisplay}`;
}

export function MyMilitaryWarehouse(ctx: Context) {
  ctx.command('我的军事仓库', '查看你的军事仓库信息')
    .action(async ({ session }) => {
      if (!session || !session.userId || !session.author) {
        return '无法获取用户信息。';
      }

      const userId = session.userId;
      const username = session.author.name || '未知用户';

      try {
        // 1. 获取用户数据
        const userDataResult = await ctx.database.get('userdata', { userId: userId });

        // --- 修正：确保 return 语句正确结束 ---
        if (!userDataResult || userDataResult.length === 0) {
          return `
======[军事仓库]=====
${username} 同志！
您尚未建立档案！请先发送"阅读报告"进行登记。
`.trim(); // <--- 确保 return 在这里结束
        }
        // --- 修正结束 ---

        const user = userDataResult[0]; // 这行现在应该在正确的位置

        // 2. 提取军事仓库信息
        const militaryWarehouse = user.militarywarehouse;
        const militaryCapacity = user.militarywarehouseCapacity || 0;
        const militaryOccupied = user.OmilitarywarehouseCapacity || 0;

        // 3. 格式化输出
        const militaryOutput = formatMilitaryWarehouse(militaryWarehouse, militaryCapacity, militaryOccupied);

        const output = `
=====[的军事仓库 ]=====
${username} 同志！
${militaryOutput}
`.trim();

        return output;

      } catch (error) {
        console.error(`查询军事仓库信息时出错 (用户: ${userId}):`, error);
        return '查询军事仓库信息时发生内部错误。';
      }
    });
}