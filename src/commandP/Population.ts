
//src\commandR\RegionPopulation.ts

import { Context } from 'koishi'

export function PPopulation(ctx: Context) {
  ctx.command('我的人口')
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
${username} 同志
您尚未注册！
请先发送“阅读报告”
`.trim()
          }
        const userdata = Userinfo[0]
        const Formalpopulation = ( userdata.population / 10000 ).toFixed(2)
        const Foodneed = ( userdata.population / 10000 ).toFixed(0)
        return `
====[人口]====
${username} 同志！
■人口：${Formalpopulation}万
■劳动人口：${( userdata.Labor / 10000 ).toFixed(2)}万
□人口变化：+1%/天
■民生需求：
□粮食: ${Foodneed}/天
`.trim()
      } catch (error) {
        console.error('查询用户资料时出错:', error)
        return '查询用户资料时发生错误'
        }
    })
}
