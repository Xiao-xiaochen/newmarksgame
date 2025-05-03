// src/commandP/ManualCheckIn.ts

import { Context, Schema } from 'koishi'
import { performHourlyUpdateLogic } from '../core/HourCheckIn' // 导入结算逻辑函数

export const name = 'manual-checkin-command'


export function ManualCheckIn(ctx: Context) {
  ctx.command('手动结算', { authority: 4 })
    .alias('triggercheckin')
    .option('force', '-f 跳过权限检查（危险！）') // 添加一个强制选项，但需谨慎使用
    .action(async ({ session}) => {
      if (!session) {
        return '无法获取会话信息。'
      }

      try {
        await session.send('正在手动触发小时结算流程，请稍候...')
        console.log(`[手动触发] 用户 ${session.userId} (${session.author?.name}) 触发了小时结算。`)

        // 调用核心结算逻辑
        await performHourlyUpdateLogic(ctx)

        console.log(`[手动触发] 小时结算流程执行完毕。`)
        return '手动小时结算流程已执行完成。请查看控制台日志获取详细信息。'
      } catch (error) {
        console.error('[手动触发错误] 执行小时结算时发生错误:', error)
        return `执行手动结算时发生错误：${error.message}`
      }
    })
}