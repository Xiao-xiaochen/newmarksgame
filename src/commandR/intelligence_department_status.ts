//src\commandR\intelligence_department_status.ts
import { Context } from 'koishi'
//import { intelligence_department_status } from '../core/Player'    等待制作
export function Playerinfo(ctx: Context) {
  ctx.command('我的情报部')
    .action(async ({ session }) => {        //session是会话
      if (!session) {
        return '会话不存在'
      }
      const username = session?.author?.name || '未知用户'
      return `
====[情报机构]====
情报部：
■民政部：待组建
■陆军部：待组建
■空军部：待组建
`.trim()
    })
}

