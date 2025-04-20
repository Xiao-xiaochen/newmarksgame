 import { Context } from 'koishi'

export function PFarmCheckIn(ctx: Context) {
  ctx.command('阅读农业报告').alias('我的农业')
    .action(async ( {session} ) => {
      if (!session) {
        return '会话不存在'
      }
      const username = session.author?.name || '未知用户'
      const userId = session.userId
      if (!userId) {
        return '无法获取用户ID'
      }
      try {
        const Userinfo = await ctx.database.get('userdata', { userId: userId })
        if (!Userinfo || Userinfo.length === 0) {
          return `
====[错误]====
${username} 同志！
您尚未注册！
请先发送“阅读报告”
`.trim()
          }
        const userdata = Userinfo[0]
        return `
===[农业报告]===
${username} 同志！
■农田：${userdata.farms}
□粮食产出：${ userdata.farms * 3 }
□橡胶产出：0
`.trim()
      } catch (error) {
        console.error('查询用户资料时出错:', error)
        return '查询用户资料时发生错误'
        }
    })
}
