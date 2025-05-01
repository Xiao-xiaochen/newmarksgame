import { Context } from 'koishi';
import { userdata, Country } from '../types'; // 确保导入 userdata 和 Country 类型

export function ExitCountry(ctx: Context) {
  ctx.command('宣布独立', '离开你当前所在的国家 (领袖无法退出)').alias('退出国家')
    .action(async ({ session }) => {
      if (!session || !session.userId || !session.author) {
        return '无法获取用户信息。';
      }

      const userId = session.userId;
      const username = session.author.name || '未知用户';

      try {
        // 1. 获取用户数据
        const userDataResult = await ctx.database.get('userdata', { userId: userId });
        if (!userDataResult || userDataResult.length === 0) {
          return `${username} 同志，你尚未注册。`;
        }
        const user = userDataResult[0];

        // 2. 检查用户是否属于某个国家
        if (!user.countryName) {
          return `${username} 同志，你当前不属于任何国家。`;
        }
        const countryName = user.countryName;

        // 3. 检查用户是否为领袖
        if (user.isLeader) {
          return `${username} 同志，你是国家 【${countryName}】 的领袖，无法直接退出国家。请先转让领袖职位或解散国家。`;
        }

        // 4. 获取国家数据
        const countryData = await ctx.database.get('country', { name: countryName });
        if (!countryData || countryData.length === 0) {
          // 数据不一致，用户表有国家名但国家表没有
          console.warn(`数据不一致：用户 ${userId} 的国家 ${countryName} 在 country 表中未找到，但用户仍尝试退出。将直接清理用户数据。`);
          await ctx.database.set('userdata', { userId: userId }, { countryName: null, isLeader: false });
          return `发生数据错误，似乎您所在的国家 ${countryName} 不存在了。已将您移出该国。`;
        }
        const country = countryData[0];

        // 5. 从国家成员列表中移除用户
        const updatedMembers = country.members.filter(memberId => memberId !== userId);

        // 6. 更新国家和用户数据
        await ctx.database.set('country', { name: countryName }, { members: updatedMembers });
        await ctx.database.set('userdata', { userId: userId }, { countryName: null, isLeader: false }); // isLeader 设为 false 以防万一

        return `${username} 同志，你已成功退出国家 【${countryName}】。`;

      } catch (error) {
        console.error(`退出国家时出错 (用户: ${userId}):`, error);
        return '退出国家时发生内部错误。';
      }
    });
}