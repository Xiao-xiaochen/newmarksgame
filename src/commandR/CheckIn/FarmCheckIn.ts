// src\commandP\CheckIn\FarmCheckIn.ts

import { Context, Schema } from 'koishi'

export function RFarmCheckIn(ctx: Context) {
  ctx.command('阅读地区农业报告')
    .action(async ( {session} ) => {
      const username = session?.author?.name || '未知用户'
      const userId = session?.userId
      if (!session) {
        return '会话不存在'
      }
          return `
===[地区农业报告]===
${username}
■农田：未完成
  □粮食产出：未完成
  □橡胶产出：未完成
`.trim()
    }
  )
}
