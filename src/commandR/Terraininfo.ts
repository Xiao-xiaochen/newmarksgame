//src\commandR\Terraininfo.ts

import { Context } from 'koishi'

export function Terraininfo(ctx: Context) {
  ctx.command('查看地区特质')
  .action(async ( {session} ) => {
    const username = session?.author?.name || '未知用户'
    const guildId = session?.guildId  || '未知频道'
    const userId = session?.userId
    if (!session) {
      return '会话不存在'
    }
      return `
=====[地区特质]=====
地区：${guildId}
■建筑位：未完成
■地形特质：
□山地：未完成
□丘陵：未完成
□平原：未完成
□河流：未完成
□森林覆盖率：未完成
`.trim()
    })
    
}
