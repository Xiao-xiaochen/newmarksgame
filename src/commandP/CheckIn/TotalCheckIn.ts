// src/commandP/CheckIn.ts

import { Context, Schema } from 'koishi'

export function CheckIn(ctx: Context) {
  ctx.command('阅读报告')
    .action(async ( {session} ) => {
      const username = session?.author?.name || '未知用户'
      const userId = session?.userId
      if (!session) {
        return '会话不存在'
      }
          return `
===[新马列文游]===
${username}
获得物资：
■ 人口：未完成
■ 基础设施：未完成
■ 建筑部门：未完成
■ 轻工厂：未完成
■ 农田：未完成
■ 粮食：未完成
`.trim()
    }
  )
}
