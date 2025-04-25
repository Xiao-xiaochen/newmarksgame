import { Context } from 'koishi';
import { TRandom } from '../../utils/Random';
import { Region } from '../../types';

export function Regioninfo(ctx: Context) {
  ctx.command('查看地区')
    .action(async ({ session }) => {
      if (!session) {
        return '会话不存在';
      }

      const userId = session.userId;
      if (!userId) {
        return '无法获取用户ID';
      }

      const guildId = session?.guildId || '未知频道';
      const username = session.author?.name || '未知用户';
      const memberCount = (await session.bot.getGuildMemberList(guildId)).data.length;

      try {
        // 检查用户是否注册
        const Userinfo = await ctx.database.get('userdata', { userId: userId });
        if (!Userinfo || Userinfo.length === 0) {
          return `
====[错误]====
${username} 同志！
您尚未注册！
请先发送“阅读报告”
`.trim();
        }

        // 检查地区是否已存在
        let Regioninfo = await ctx.database.get('regiondata', { guildId: guildId });
        if (!Regioninfo || Regioninfo.length === 0) {
          const userdata = await ctx.database.get('userdata', { userId: userId });
          const countryName = userdata[0]?.countryName || '无国家';

          // 初始化地区数据
          const InitialPopulation = TRandom(memberCount * 6000, memberCount * 10000, memberCount * 12000);
          const Labor = Math.floor(InitialPopulation * 0.6);
          const base = Math.max(1, Math.floor(memberCount * 1.5));
          const maxBase = Math.max(base * 2, 10); // 假设 max_base 是 base 的两倍，最小值为 10
          const InitialFarms = Math.max(
            1,
            Math.floor((InitialPopulation / 30000) * TRandom(0.5, 0.7, 0.9, false))
            );
  
            const newregion: Region = {
              guildId: guildId,
              owner: countryName,
              leader: userId,
              population: InitialPopulation,
              labor: Labor,
              base: base,
              max_base: maxBase, // 添加 max_base 属性
              Department: 0,
              farms: InitialFarms,
              resources: {
                rareMetal: 0,
                rareEarth: 0,
                coal: 0,
                ironOre: 0,
                aluminum: 0,
                oil: 0
              },
              terrain: {
                mountain: 0,
                hill: 0,
                plain: 0,
                river: 0,
                forest: 0
              }
            };

          await ctx.database.create('regiondata', newregion);
        }

        // 获取地区数据并返回信息
        const regiondata = (await ctx.database.get('regiondata', { guildId: guildId }))[0];
        const FormalPopulation = (regiondata.population / 10000).toFixed(2);
        return `
=====[地区信息]=====
地区：${guildId}
■控制方：${regiondata.owner}
■领导人：${regiondata.leader}
□地区人口：${FormalPopulation} 万
□基础设施：${regiondata.base}/${regiondata.max_base}
□地区仓库： 未完成
□第一产业数量：${regiondata.farms}
□第二产业数量：${regiondata.Department}
■地区驻军：未完成
`.trim();
      } catch (error) {
        console.error('数据库查询错误:', error);
        return '数据库查询错误';
        }
    });
}
