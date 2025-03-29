//src\commandR\Terraininfo.ts

import { Context } from 'koishi'

export function Terraininfo(ctx: Context) {
  ctx.command('查看地区特质')
    .action(async (session) => {
      return `
=====[地区特质]=====
■建筑位：86
■地形特质：
□山地：30%
□丘陵：10%
□平原：50%
□河流：10%
□森林覆盖率：40%
`.trim()
    })
    
}
