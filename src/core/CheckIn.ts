import { Context } from 'koishi'

export function setupDailyReset(ctx: Context) {
  // 每天凌晨0点重置所有用户的签到状态
  ctx.setInterval(async () => {
    const now = new Date()
    // 检查是否是凌晨0点
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      try {
        // 重置所有用户的签到状态
        await ctx.database.set('userdata', {}, { hasCheckedIn: false })
        console.log('已重置所有用户的签到状态')
      } catch (error) {
        console.error('重置签到状态时出错:', error)
      }
    }
  }, 60 * 1000) // 每分钟检查一次
}