import { Context } from 'koishi';
import { userdata, Region, Country } from '../types'; // 确保导入 Country 类型

export function RegionList(ctx: Context) {
  ctx.command('国家地区列表', '查看本国控制的所有地区 (仅限成员)', { authority: 1 }) // 基础权限1，代码内检查成员身份
    .action(async ({ session }) => {
      if (!session || !session.userId || !session.author) {
        return '无法获取用户信息。';
      }

      const userId = session.userId;
      const username = session.author.name || '未知用户';

      try {
        // 1. 检查用户是否已注册并属于某个国家
        const userDataResult = await ctx.database.get('userdata', { userId: userId });
        if (!userDataResult || userDataResult.length === 0) {
          return `${username} 同志，你尚未注册。`;
        }
        const user = userDataResult[0]; // 重命名为 user 避免混淆
        if (!user.countryName) {
          return `${username} 同志，你当前不属于任何国家，无法查看国家地区列表。`;
        }
        const countryName = user.countryName;

        // 新增：获取国家数据以获取首都 ID
        const countryData = await ctx.database.get('country', { name: countryName });
        if (!countryData || countryData.length === 0) {
          // 理论上不应该发生，因为用户数据里有国家名
          console.error(`数据不一致：用户 ${userId} 的国家 ${countryName} 在 country 表中未找到。`);
          return `错误：无法找到国家 ${countryName} 的信息。`;
        }
        const country = countryData[0];
        const capitalRegionId = country.capitalRegionId; // 获取首都 ID

        // 2. 查询该国家控制的所有地区
        const controlledRegions = await ctx.database.get('regiondata', { owner: countryName });

        if (!controlledRegions || controlledRegions.length === 0) {
          return `国家 【${countryName}】 当前未控制任何地区。`;
        }

        // 3. 格式化地区列表
        const regionListFormatted = controlledRegions.map(region => {
          // 使用从 country 数据获取的 capitalRegionId 进行比较
          return `■${region.RegionId} (${region.Terrain})`; // 标记首都
        }).join('\n');

        // 4. 返回结果
        return `
=====[地区列表]=====
国家：${countryName}
地区编号：
★首都：${capitalRegionId}
${regionListFormatted}
`.trim();

      } catch (error) {
        console.error(`查询国家地区列表时出错 (用户: ${userId}, 国家: ${username}):`, error);
        return '查询地区列表时发生内部错误。';
      }
    });
}