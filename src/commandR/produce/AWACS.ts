// src/commandP/AWACS.ts
import { Context } from 'koishi'

export function ProduceAWACS(ctx: Context) {
  ctx.command('地区生产 预警机 <数量>')
    .action(async ({ session }) => {
      if (!session) return '会话不存在'
      const username = session?.author?.name || '未知用户'
      /*"const num = parseInt(quantity)
      if (isNaN(num) || num <= 0) return '数量必须为正整数'*/
      return `
=====[军事工业]=====
${username} 同志：
■生产成功
■预警机+--
■消耗资源：（吨）
  □钢铁：--
  □稀有金属：--
      `.trim()
    })
}
