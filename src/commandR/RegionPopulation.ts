
//src\commandR\Terraininfo.ts

import { Context } from 'koishi'

export function Terraininfo(ctx: Context) {
  ctx.command('查看地区人口')
  .action(async ( {session} ) => {
    const username = session?.author?.name || '未知用户'
    const userId = session?.userId
    if (!session) {
      return '会话不存在'
    }
      return `  
===[地区人口]===
■地区人口：67万
■劳动人口：40万
□人口变化：+1%/天
■民生需求：
□粮食: 67
□生活消费品：34
`.trim()
    })
}