import { Context } from 'koishi';
import { TRandom } from '../../utils/Random';
import { Region } from '../../types';

export function ResourceInfo(ctx: Context) {
  ctx.command('勘探地区资源储量').alias('勘探地区资源')
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

        if ( !regiondata.resources?.ironOre ) {
          const newResources: Region['resources'] = {
            rareMetal: TRandom(0, 60000, 30000),
            rareEarth: TRandom(0, 30000, 15000),
            ironOre: TRandom(30000, 150000, 80000),
            coal: TRandom(50000, 250000, 120000),
            aluminum: TRandom(0, 100000, 30000),
            oil: TRandom(0, 100000, 60000),
          };
        await ctx.database.set( 'regiondata', { guildId }, { resources: newResources } );
        return `
===[地区资源储量]===
地区：${guildId}
资源单位：（吨）
■稀土资源：${format(newResources.rareEarth)}
■稀有金属：${format(newResources.rareMetal)}
■铁矿：${format(newResources.ironOre)}
■煤矿：${format(newResources.coal)}
■铝矿：${format(newResources.aluminum)}
■原油：${format(newResources.oil)}
`.trim();
        }
      } catch (error) {
        console.error('查询地区资源时出错:', error);
        return '查询地区资源时出错';
        }
    });

  ctx.command('查看地区资源储量').alias('查看地区资源')
    .action(async ({ session }) => {
      if (!session) {
        return '会话不存在';
      }
      const guildId = session?.guildId || '未知频道';
      const username = session.author?.name || '未知用户';
      const format = (num: number) => num.toLocaleString();

      try {

        let Regioninfo = (await ctx.database.get('regiondata', { guildId: guildId })) as Region[];
        const regiondata = Regioninfo[0];

        if (!Regioninfo || Regioninfo.length === 0) {
        return `
===[地区资源储量]===
${username} 同志！
地区尚未被探索！
请发送：查看地区
`.trim();
        }
        if ( regiondata.resources?.ironOre ) {
          return `
===[地区资源储量]===
地区：${guildId}
资源单位：（吨）
■稀土资源：${format(regiondata.resources.rareEarth)}
■稀有金属：${format(regiondata.resources.rareMetal)}
■铁矿：${format(regiondata.resources.ironOre)}
■煤矿：${format(regiondata.resources.coal)}
■铝矿：${format(regiondata.resources.aluminum)}
■原油：${format(regiondata.resources.oil)}
`.trim();
        } else {
          return `
===[地区资源储量]===
${username} 同志！
地区尚未勘探资源！
请发送：勘探地区资源
`.trim();
        }
    } catch (error) {
      console.error('查询地区资源时出错:', error);
      return '查询地区资源时出错';
      }
  });
}
