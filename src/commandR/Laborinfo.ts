//src\commandR\Laborinfo.ts

import { Context } from 'koishi'

export function Laborinfo(ctx: Context) {
  ctx.command('查看地区劳动力')
  .action(async ( {session} ) => {
    const username = session?.author?.name || '未知用户'
    const guildId = session?.guildId  || '未知频道'
    const userId = session?.userId                         //我们正在考虑commandR到底要不要写上username和userId
    if (!session) {
      return '会话不存在'
    }
      return `
=====[地区劳动力]=====
地区：${guildId}
■总劳动力：未完成
■繁忙劳动力：未完成
■空闲劳动力：未完成
■固定劳动力：未完成
`.trim()
    })
}

