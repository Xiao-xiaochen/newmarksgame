import { Context } from 'koishi'
export function Playerinfo(ctx: Context) {
  ctx.command('指令名')
    .action(async ({ session }) => {
      if (!session) {
        return '会话不存在'
      }
      const username = session?.author?.name || '未知用户'
      return `
===[地区资源储量]===
资源单位：（吨）
■稀土资源：未完成
■稀有金属：未完成
■铁矿：未完成
■煤矿：未完成
■铝矿：未完成
■原油：未完成
`.trim()
    })
}
