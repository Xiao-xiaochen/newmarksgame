import { Context } from 'koishi'
import { TRandom } from '../utils/Random'

export function Terraininfo(ctx: Context) {
  ctx.command('勘探地区资源储量')
    .action(async ({ session }) => {
      if (!session) {
        return '会话不存在'
      }
      const guildId = session?.guildId || '未知频道'
      const username = session.author?.name || '未知用户'
      
      try {
        let Regioninfo = await ctx.database.get('regiondata', { guildId: guildId })
        
        if (!Regioninfo || Regioninfo.length === 0) {
          return `
===[地区资源储量]===
${username} 同志！
地区尚未勘探！
`.trim()
        }
        
        // 如果地区已存在，获取资源数据
        const regiondata = Regioninfo[0]
        const resources = regiondata.resources || {
          ironOre: TRandom(30000, 150000, 80000),
          coal: TRandom(50000, 250000, 120000),
          aluminum: TRandom(0, 100000, 30000),
          rareEarth: TRandom(0, 30000, 15000),
          oil: TRandom(0, 100000, 60000),
          rareMetal: TRandom(0, 60000, 30000)
        };
        
        // 如果地区存在但没有资源数据，更新地区数据
        if (!regiondata.resources) {
          await ctx.database.set('regiondata', { guildId: guildId }, { resources });
        }
        
        return `
===[地区资源储量]===
地区：${guildId}
资源单位：（吨）
■稀土资源：${resources.rareEarth.toLocaleString()}
■稀有金属：${resources.rareMetal.toLocaleString()}
■铁矿：${resources.ironOre.toLocaleString()}
■煤矿：${resources.coal.toLocaleString()}
■铝矿：${resources.aluminum.toLocaleString()}
■原油：${resources.oil.toLocaleString()}
`.trim()
      } catch (error) {
        console.error('查询地区资源时出错:', error)
        return '查询地区资源时出错'
      }
    })
}

