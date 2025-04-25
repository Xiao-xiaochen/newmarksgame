
//src\commandR\RegionPopulation.ts

import { Context } from 'koishi'

export function RegionPopulation(ctx: Context) {
  ctx.command('查看地区人口')
  .action(async ( {session} ) => {
    const username = session?.author?.name || '未知用户'
    const guildId = session?.guildId  || '未知频道'
    const userId = session?.userId
    if (!session) {
      return '会话不存在'
    }
      return `
===[地区人口]===
地区：${guildId}
■地区人口：未完成
■劳动人口：未完成
  □人口变化：+1%/天
■民生需求：
  □粮食: 未完成
  □生活消费品：未完成
`.trim()
    })
}
