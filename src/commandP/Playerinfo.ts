//src\commandP\Playerinfo.ts

import { Context } from 'koishi'
//import { Playerinfo } from '../core/Player'    等待制作

export function Playerinfo(ctx: Context) {
  ctx.command('我的全部资料')
    .action(async ({ session }) => {
      if (!session) {
        return '会话不存在'
      }
      const username = session?.author?.name || '未知用户'
      return `
=====[全部资料]=====
${username}
□地区人口：30万
□基础设施：30/50
□第一产业数量：10
□第二产业数量：11
`.trim()
    })
    
}

