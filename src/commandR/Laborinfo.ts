//src\commandR\Laborinfo.ts

import { Context } from 'koishi'

export function Laborinfo(ctx: Context) {
  ctx.command('查看地区劳动力')
  .action(async ( {session} ) => {
    const username = session?.author?.name || '未知用户'
    const userId = session?.userId
    if (!session) {
      return '会话不存在'
    }
      return `
=====[地区劳动力]=====
■总劳动力：39万人
■繁忙劳动力：19万人
■空闲劳动力：10万人
■固定劳动力：10万人
`.trim()
    })
}

