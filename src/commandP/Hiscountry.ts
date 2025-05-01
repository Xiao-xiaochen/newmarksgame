import { Context, h } from 'koishi';
import { userdata, Country, Region } from '../types'; // 确保导入 userdata, Country 和 Region 类型

export function Hiscountry(ctx: Context) {
  ctx.command('他的国家 <target:user>', '查询指定玩家的国家信息')
    .action(async ({ session }, target) => {
      if (!target) {
        return '请指定要查询的玩家，例如：他的国家 @张三 或 他的国家 123456789';
      }

      let targetUserId: string | null = null;
      if (target.includes(':')) {
        targetUserId = target.split(':')[1];
      } else if (/^\d+$/.test(target)) {
        targetUserId = target;
      } else {
         const mentionMatch = target.match(/id="([^"]+)"/);
         if (mentionMatch && mentionMatch[1]) {
             targetUserId = mentionMatch[1];
         }
      }

      if (!targetUserId) {
        return '无法解析目标用户信息。请确保输入了正确的QQ号或 @ 了用户。';
      }

      if (session?.userId === targetUserId) {
          return '请使用 “我的国家” 指令查询自己的信息。';
      }

      try {
        // 1. 查询目标用户信息
        const targetUserData = await ctx.database.get('userdata', { userId: targetUserId });
        if (!targetUserData || targetUserData.length === 0) {
          const targetIdentifier = h('at', { id: targetUserId });
          return `未找到玩家 ${targetIdentifier} 的注册信息。`;
        }
        const targetUser = targetUserData[0];
        const targetUsername = targetUser.userId || targetUserId;

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
        const memberIds = country.members || [];

        // 4. 获取领袖信息 (名字和ID)
        let leaderName = '未知';
        let leaderId = country.leaderId || '未知'; // 获取领袖ID
        if (country.leaderId) {
            const leaderInfo = await ctx.database.get('userdata', { userId: country.leaderId });
            if (leaderInfo && leaderInfo.length > 0) {
                // 修正：优先使用数据库中的 username
                leaderName = leaderInfo[0].userId || country.leaderId;
            } else {
                leaderName = country.leaderId; // 回退到ID
            }
        }

        // 5. 获取首都地区信息 (如果存在)
        let capitalInfo = '未指定';
        if (country.capitalRegionId) {
            const capitalRegionData = await ctx.database.get('regiondata', { RegionId: country.capitalRegionId });
            if (capitalRegionData && capitalRegionData.length > 0) {
                const region = capitalRegionData[0];
                capitalInfo = `${region.RegionId} (${region.Terrain || '未知地形'})`; // 格式：ID (地形)
            } else {
                capitalInfo = `${country.capitalRegionId} (信息缺失)`;
            }
        }

        // 6. 格式化输出 (严格按照指定格式)
        const output = `
=====[国家信息]=====
■国家名: ${country.name}
■领导人: ${leaderName}
■首都地区: ${capitalInfo}
■行政区数：${memberIds.length} (个)
`.trim();

        return output;

      } catch (error) {
        console.error(`查询玩家 ${targetUserId} 的国家信息时出错:`, error);
        return '查询国家信息时发生内部错误。';
      }
    });
}