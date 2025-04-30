import { Context } from 'koishi';
import { Country, userdata } from '../types'; // 确保导入 Country 和 userdata 类型

export function MemberList(ctx: Context) {
  ctx.command('国家成员列表', '查看本国所有成员 (仅限领袖)', { authority: 1 }) // 基础权限1，代码内检查领袖身份
    .action(async ({ session }) => {
      if (!session || !session.userId || !session.author) {
        return '无法获取用户信息。';
      }

      const leaderId = session.userId;
      const leaderName = session.author.name || '未知用户';

      try {
        // 1. 检查用户是否为领袖
        const leaderData = await ctx.database.get('userdata', { userId: leaderId });
        if (!leaderData || leaderData.length === 0) {
          return `${leaderName} 同志，你尚未注册。`;
        }
        if (!leaderData[0].isLeader || !leaderData[0].countryName) {
          return `${leaderName} 同志，你不是国家领袖，无法查看成员列表。`;
        }
        const countryName = leaderData[0].countryName;

        // 2. 获取国家信息
        const countryData = await ctx.database.get('country', { name: countryName });
        if (!countryData || countryData.length === 0) {
          return `错误：找不到你的国家 ${countryName} 的信息。`;
        }
        const country = countryData[0];
        const memberIds = country.members;

        if (!memberIds || memberIds.length === 0) {
          return `国家 ${countryName} 当前没有成员。`; // 理论上至少有领袖
        }

        // 3. 获取所有成员的详细信息
        const membersData = await ctx.database.get('userdata', { userId: { $in: memberIds } });

        // 4. 格式化成员列表
        const memberListFormatted = membersData.map(member => {
          // 可以根据需要添加更多信息，如在线状态、贡献等
          return `■${member.userId}`;
        }).join('\n');

        // 5. 返回结果
        return `
====[成员列表]====
国家名: ${countryName}
★领导人: ${leaderName}
成员列表：
${memberListFormatted}
`.trim();

      } catch (error) {
        console.error(`查询国家成员列表时出错 (领袖: ${leaderId}, 国家: ${leaderName}):`, error);
        return '查询成员列表时发生内部错误。';
      }
    });
}