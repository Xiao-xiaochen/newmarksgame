//src\commandP\MetallurgyInfo.ts

import { Context } from 'koishi'

export function MetallurgyInfo(ctx: Context) {
  ctx.command('查看地区冶金')
    .action(async ({ session }) => {
      if (!session) {
        return '会话不存在'
      }
      const username = session?.author?.name || '未知用户'
      return `
待构思
`.trim()
    })
}
