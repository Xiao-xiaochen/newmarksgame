//src\commandR\RegionFarminfo.ts

import { Context } from 'koishi'

export function RegionFarminfo(ctx: Context) {
  ctx.command('查看地区第一产业')
  .action(async ( {session} ) => {
    const username = session?.author?.name || '未知用户'
    const userId = session?.userId
    if (!session) {
      return '会话不存在'
    }
      return `
===[地区第一产业信息]===
■农田：未完成
■固定劳动力：未完成
■空闲农田：未完成
■作物类型：
□橡胶作物：未完成
`.trim()
    })
    
}