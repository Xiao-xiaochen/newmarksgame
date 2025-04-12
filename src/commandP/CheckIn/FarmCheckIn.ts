// src\commandP\CheckIn\FarmCheckIn.ts

import { Context, Schema } from 'koishi'

export function PFarmCheckIn(ctx: Context) {
  ctx.command('阅读我的农业报告')
    .action(async ( {session} ) => {
      const username = session?.author?.name || '未知用户'
      const userId = session?.userId
      if (!session) {
        return '会话不存在'
      }
          return `
===[农业报告]===
${username}
■农田：20
□粮食产出：54
□橡胶产出：2
`.trim()
    }
  )
}
