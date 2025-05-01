import { Context, h } from 'koishi'; // 导入 h 以便可能使用 @

export function Mycountry(ctx: Context) {
  ctx.command('我的国家', '查看你所在国家的信息')
    .action(async ({ session }) => {
      if (!session || !session.userId || !session.author) {
        return '无法获取用户信息。';
      }
      const userId = session.userId;
      const username = session.author.name || '未知用户';

      try {
        // 1. 获取用户数据，检查是否注册以及是否有国家
        const userDataResult = await ctx.database.get('userdata', { userId: userId });
        if (!userDataResult || userDataResult.length === 0) {
          return `
======[国家]=====
${username} 同志！
您尚未注册！请先发送"阅读报告"进行注册。
`.trim();
        }
        const user = userDataResult[0];

        const userCountryName = user.countryName;
        if (!userCountryName) {
          return `
======[国家]=====
${username} 同志！
您当前不属于任何国家。
可以使用“组建国家 [名称]”来创建自己的国家。
`.trim();
        }

        // 2. 获取国家数据
        const countryData = await ctx.database.get('country', { name: userCountryName });
        if (!countryData || countryData.length === 0) {
          console.error(`数据不一致：用户 ${userId} 的国家 ${userCountryName} 在 country 表中未找到。`);
          await ctx.database.set('userdata', { userId: userId }, { countryName: null, isLeader: false });
          return `发生数据错误，似乎您所在的国家 ${userCountryName} 不存在了。已将您移出该国。`;
        }

        const country = countryData[0];
        const memberIds = country.members || [];

        // 3. 获取领袖信息 (名字和ID)
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

        // 4. 获取首都地区信息 (如果存在)
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

        // 5. 格式化输出 (严格按照指定格式)
        const output = `
=====[国家信息]=====
■国家名: ${country.name}
■领导人: ${leaderName}
■首都地区: ${capitalInfo}
■行政区数：${memberIds.length} (个)
`.trim();

        return output;

      } catch (error) {
        console.error(`查询我的国家信息时出错 (用户: ${userId}):`, error);
        return '查询国家信息时发生内部错误。';
      }
    });
}