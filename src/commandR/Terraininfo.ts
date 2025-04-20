import { Context } from 'koishi'
import { TRandom } from '../utils/Random'
import { Region } from '../types'

export function Terraininfo(ctx: Context) {
  ctx.command('勘探地区资源储量').alias('查看地区资源储量').alias('查看地区资源').alias('勘探地区资源')
    .action(async ({ session }) => {
      if (!session) {
        return '会话不存在'
      }
      const guildId = session?.guildId || '未知频道'
      const username = session.author?.name || '未知用户'
      
      try {
        let Regioninfo = await ctx.database.get('regiondata', { guildId: guildId }) as Region[];
        if (!Regioninfo || Regioninfo.length === 0) {
          return `
===[地区资源储量]===
${username} 同志！
地区尚未被探索！
请发送：查看地区
`.trim()
        }
        // 如果地区已存在，获取资源数据
        const regiondata = Regioninfo[0];
        // 如果地区存在但没有资源数据，更新地区数据
        if ( !regiondata.resources?.ironOre ) {
          // 生成新的资源数据
          const ironOre = TRandom(30000, 150000, 80000);
          const coal = TRandom(50000, 250000, 120000);
          const aluminum = TRandom(0, 100000, 30000);
          const rareEarth = TRandom(0, 30000, 15000);
          const oil = TRandom(0, 100000, 60000);
          const rareMetal = TRandom(0, 60000, 30000);
          // 创建资源对象
          const newResources = {
            ironOre,
            coal,
            aluminum,
            rareEarth,
            oil,
            rareMetal
          };
          await ctx.database.set('regiondata', { guildId: guildId }, {resources: newResources});
          // 重新获取更新后的数据
          Regioninfo = await ctx.database.get('regiondata', { guildId: guildId }) as Region[];
          if (!Regioninfo || Regioninfo.length === 0) {
            return '更新地区资源数据失败';
          } 
          return `
===[地区资源储量]===
地区：${guildId}
资源单位：（吨）
■稀土资源：${ironOre.toLocaleString()}
■稀有金属：${rareMetal.toLocaleString()}
■铁矿：${ironOre.toLocaleString()}
■煤矿：${coal.toLocaleString()}
■铝矿：${aluminum.toLocaleString()}
■原油：${oil.toLocaleString()}
`.trim();
        }
        return `
===[地区资源储量]===
地区：${guildId}
资源单位：（吨）
■稀土资源：${regiondata.resources.rareEarth.toLocaleString()}
■稀有金属：${regiondata.resources.rareMetal.toLocaleString()}
■铁矿：${regiondata.resources.ironOre.toLocaleString()}
■煤矿：${regiondata.resources.coal.toLocaleString()}
■铝矿：${regiondata.resources.aluminum.toLocaleString()}
■原油：${regiondata.resources.oil.toLocaleString()}
`.trim();
      } catch (error) {
        console.error('查询地区资源时出错:', error);
        return '查询地区资源时出错';
      }
    });
}

