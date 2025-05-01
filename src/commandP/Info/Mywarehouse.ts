import { Context } from 'koishi';
import { userdata } from '../../types'; // 导入 userdata 类型

// 辅助函数：格式化仓库内容
function formatWarehouse(title: string, warehouse: object | null | undefined, capacity: number, occupied: number): string {
  if (!warehouse) {
    return `■ ${title}: (无数据)`;
  }
  const items = Object.entries(warehouse)
    .filter(([key, value]) => typeof value === 'number' && value > 0) // 只显示数量大于0的物品
    .map(([key, value]) => `  -${key}: ${value}`)
    .join('\n');

  const capacityInfo = `${occupied} / ${capacity}`;
  // 如果仓库为空，显示 (空)；否则显示物品列表
  const itemsDisplay = items.length > 0 ? items : '  (空)';
  return `■ ${title}: ${capacityInfo}\n${itemsDisplay}`;
}

export function MyWarehouse(ctx: Context) {
  ctx.command('我的仓库', '查看你的个人仓库信息')
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
======[仓库]=====
${username} 同志！
您尚未建立档案！请先发送"阅读报告"进行登记。
`.trim(); // <--- 确保 return 在这里结束
        }
        // --- 修正结束 ---

        const user = userDataResult[0]; // 这行现在应该在正确的位置

        // 2. 提取仓库信息
        const civilianWarehouse = user.warehouse;
        const civilianCapacity = user.warehouseCapacity || 0;
        const civilianOccupied = user.OwarehouseCapacity || 0;


        // 3. 格式化输出
        const civilianOutput = formatWarehouse('仓库', civilianWarehouse, civilianCapacity, civilianOccupied);

        const output = `
=====[仓库]=====
${username} 同志！
${civilianOutput}
`.trim();

        return output;

      } catch (error) {
        console.error(`查询仓库信息时出错 (用户: ${userId}):`, error);
        return '查询仓库信息时发生内部错误。';
      }
    });
}