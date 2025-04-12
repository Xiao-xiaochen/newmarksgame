//src\commandR\RegionFactory.ts

import { Context } from 'koishi'

export function RegionFactory(ctx: Context) {
  ctx.command('查看地区第二产业')
  .action(async ( {session} ) => {
    const username = session?.author?.name || '未知用户'
    const guildId = session?.guildId  || '未知频道'
    const userId = session?.userId
    if (!session) {
      return '会话不存在'
    }
      return `
[地区第二产业信息]
地区：${guildId}
■轻工业：未完成
■建筑业：未完成
■重工业：未完成
■军工业：未完成
`.trim()
    })
    
}