import { Context, h } from 'koishi';
import { userdata, Country, Region } from '../types'; // 确保导入 userdata, Country 和 Region 类型

export function Hiscountry(ctx: Context) {
  // 使用 <target:user> 可以更好地处理 @提及 和 用户ID
  ctx.command('他的国家 <target:user>', '查询指定玩家的国家信息')
    .action(async ({ session }, target) => {
      // ... (之前的代码 1-3，获取 targetUserId, targetUser, countryName, country) ...
      if (!target) {
        return '请指定要查询的玩家，例如：他的国家 @张三 或 他的国家 123456789';
      }

      // Koishi 的 <target:user> 类型通常会返回 "platform:userId" 格式
      // 如果直接输入数字ID，可能需要额外处理，但 :user 应该能覆盖多数情况
      let targetUserId: string | null = null;
      if (target.includes(':')) {
        targetUserId = target.split(':')[1];
      } else if (/^\d+$/.test(target)) { // 兼容纯数字ID输入的情况
        targetUserId = target;
      } else {
         // 尝试从 @ 解析（如果 :user 未完全处理）
         const mentionMatch = target.match(/id="([^"]+)"/);
         if (mentionMatch && mentionMatch[1]) {
             targetUserId = mentionMatch[1];
         }
      }


      if (!targetUserId) {
        return '无法解析目标用户信息。请确保输入了正确的QQ号或 @ 了用户。';
      }

      // 阻止使用此命令查询自己的信息
      if (session?.userId === targetUserId) {
          return '请使用 “我的国家” 指令查询自己的信息。';
      }


      try {
        // 1. 查询目标用户信息
        const targetUserData = await ctx.database.get('userdata', { userId: targetUserId });
        if (!targetUserData || targetUserData.length === 0) {
          // 尝试获取用户名以提高可读性，如果失败则用ID
          const targetIdentifier = h('at', { id: targetUserId }); // 尝试 @ 用户
          return `未找到玩家 ${targetIdentifier} 的注册信息。`;
        }
        const targetUser = targetUserData[0];
        const targetUsername = targetUser.userId || targetUserId; // 使用数据库中的用户名或ID

        // 2. 检查目标用户是否属于国家
        if (!targetUser.countryName) {
          return `玩家 ${targetUsername} 当前不属于任何国家。`;
        }
        const countryName = targetUser.countryName;

        // 3. 查询国家详细信息
        const countryData = await ctx.database.get('country', { name: countryName });
        if (!countryData || countryData.length === 0) {
          console.error(`数据不一致：用户 ${targetUserId} 的国家 ${countryName} 在 country 表中未找到。`);
          return `错误：找不到玩家 ${targetUsername} 所属国家 ${countryName} 的详细信息。`;
        }
        const country = countryData[0];
        const memberIds = country.members || []; // 获取成员ID列表

        // 4. 获取领袖信息
        let leaderName = '未知';
        let leaderIdentifier: string | h = '未知';
        if (country.leaderId) {
            const leaderInfo = await ctx.database.get('userdata', { userId: country.leaderId });
            if (leaderInfo && leaderInfo.length > 0) {
                leaderName = leaderInfo[0].userId || country.leaderId; // 优先用用户名
                leaderIdentifier = h('at', { id: country.leaderId }); // 尝试 @ 领袖
            } else {
                leaderName = country.leaderId; // 回退到ID
                leaderIdentifier = country.leaderId;
            }
        }

        // 新增：获取首都地区信息
        let capitalInfo = '未设定';
        if (country.capitalRegionId) {
            const capitalRegionData = await ctx.database.get('regiondata', { RegionId: country.capitalRegionId });
            if (capitalRegionData && capitalRegionData.length > 0) {
                capitalInfo = `${country.capitalRegionId} (${capitalRegionData[0].Terrain})`;
            } else {
                capitalInfo = `${country.capitalRegionId} (信息缺失)`;
            }
        }

        // 5. 格式化输出 (修正后，参照 Mycountry 风格)
        const output = [
          `======[${targetUsername} 的国家信息]======`,
          `国家名称：${country.name}`,
          `国家领袖：${leaderName} (${leaderIdentifier})`, // 显示名字和 @
          `国家成员：${memberIds.length} 人`, // 使用正确的成员数量
          `首都地区：${capitalInfo}`, // 使用查询到的首都信息
          // 可以添加更多信息，例如：
          // `国家资源：...`
          // `国家科技：...`
        ];

        return output.join('\n');

      } catch (error) {
        console.error(`查询玩家 ${targetUserId} 的国家信息时出错:`, error);
        return '查询国家信息时发生内部错误。';
      }
    });
}