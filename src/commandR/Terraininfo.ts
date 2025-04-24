import { Context } from 'koishi';
import { TRandom } from '../utils/Random';
import { Region } from '../types';

export function Terraininfo(ctx: Context) {
  ctx.command('勘探地区资源储量')
    .alias('查看地区资源储量')
    .alias('查看地区资源')
    .alias('勘探地区资源')
    .action(async ({ session }) => {
      if (!session) {
        return '会话不存在';
      }

      const guildId = session?.guildId || '未知频道';
      const username = session.author?.name || '未知用户';
      const format = (num: number) => num.toLocaleString();

      try {
        let Regioninfo = (await ctx.database.get('regiondata', { guildId: guildId })) as Region[];
        if (!Regioninfo || Regioninfo.length === 0) {
          return `
===[地区资源储量]===
${username} 同志！
地区尚未被探索！
请发送：查看地区
`.trim();
        }

        const regiondata = Regioninfo[0];

        if (!regiondata.resources?.minerals?.ironOre) {
          const newResources: Region['resources'] = {
            minerals: {
              ironOre: TRandom(30000, 150000, 80000),
              coal: TRandom(50000, 250000, 120000),
              aluminum: TRandom(0, 100000, 30000),
              rareEarth: TRandom(0, 30000, 15000),
              oil: TRandom(0, 100000, 60000),
              rareMetal: TRandom(0, 60000, 30000),
            },
            terrain: {
              mountain: TRandom(1, 10, 5),
              hill: TRandom(1, 10, 5),
              plain: TRandom(1, 10, 5),
              river: TRandom(1, 10, 5),
              forest: TRandom(1, 10, 5),
            },
          };
          await ctx.database.set('regiondata', { guildId: guildId }, { resources: newResources });

          return `
===[地区资源储量]===
地区：${guildId}
资源单位：（吨）
■稀土资源：${format(newResources.minerals.rareEarth)}
■稀有金属：${format(newResources.minerals.rareMetal)}
■铁矿：${format(newResources.minerals.ironOre)}
■煤矿：${format(newResources.minerals.coal)}
■铝矿：${format(newResources.minerals.aluminum)}
■原油：${format(newResources.minerals.oil)}
`.trim();
        }

        const { rareEarth, rareMetal, ironOre, coal, aluminum, oil } = regiondata.resources.minerals;
        return `
===[地区资源储量]===
地区：${guildId}
资源单位：（吨）
■稀土资源：${format(rareEarth)}
■稀有金属：${format(rareMetal)}
■铁矿：${format(ironOre)}
■煤矿：${format(coal)}
■铝矿：${format(aluminum)}
■原油：${format(oil)}
`.trim();
      } catch (error) {
        console.error('查询地区资源时出错:', error);
        return '查询地区资源时出错';
      }
    });
}
