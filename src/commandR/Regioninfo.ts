//src\commandR\Regioninfo.ts

import { Context } from 'koishi'
import { TRandom } from '../utils/Random'
import { Region } from '../types'

export function Regioninfo(ctx: Context) {
  ctx.command('查看地区')
  .action(async ( {session} ) => {
    if (!session) {
      return '会话不存在'
    }
    const userId = session.userId
    if (!userId) {
      return '无法获取用户ID'
    }
    const guildId = session?.guildId  || '未知频道'
    const member = (await session.bot.getGuildMemberList(guildId)).data.length

    try {
      let Regioninfo = await ctx.database.get('regiondata', { guildId: guildId })

      if (!Regioninfo || Regioninfo.length === 0) {

        const userdata = await ctx.database.get('userdata', { userId: userId })
        const countryName = userdata[0].countryName || '无国家'

        const InitialPopulation = TRandom( ( member * 6000 ), ( member * 10000 ), ( member * 12000 ));
        const Labor = Math.floor( InitialPopulation * 0.6 );
        const base = Math.max( 1, Math.floor( member * 1.5  ));
        const InitialFarms = Math.max( 1, Math.floor( (InitialPopulation / 30000) * TRandom( 0.5, 0.7, 0.9, false ) ) );

        const newregion: Region = {
          guildId: guildId,
          owner: countryName,
          leader: userId,
          population: InitialPopulation,
          labor: Labor,
          base: base,
          Department: 0,
          farms: InitialFarms,
        }
        await ctx.database.create('regiondata', newregion)
      }
      const regiondata = Regioninfo[0]
      return `
=====[地区信息]=====
地区：${guildId}
■控制方：${regiondata.owner}
■领导人：${regiondata.leader}
  □地区人口：${regiondata.population}
  □基础设施：${regiondata.base}
  □地区仓库： 未完成
  □第一产业数量：${regiondata.farms}
  □第二产业数量：${regiondata.Department}
■地区驻军：未完成
`.trim()
    } catch (error) {
      console.error('数据库查询错误:', error)
      return '数据库查询错误'
      }
  })
}




