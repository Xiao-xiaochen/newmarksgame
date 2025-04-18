// src/commandP/CheckIn.ts

import { Context, Schema } from 'koishi'
import { userdata } from '../../types'

export function CheckIn(ctx: Context) {
  ctx.command('阅读报告')
    .action(async ( {session} ) => {
      const username = session?.author?.name || '未知用户'
      const userId = session?.userId
      if (!session) {
        return '会话不存在'
      }
      try {
        let Userinfo = await ctx.database.get('userdata', { userId }) as userdata[]
        if (!Userinfo || Userinfo.length === 0) {
          const Newuser: userdata = {
            userId: session?.userId,
            hasCheckedIn: true,
            population: 100,
            base: 100,
            Department: 100,
            farms: 100,
            food: 100
          }
          await ctx.database.create('userdata', Newuser);
          Userinfo = [Newuser]
          const userDATA = Userinfo[0]
          return `
===[新马列文游]===
欢迎游玩新马列文游
${username}
获得物资：
■ 人口：${userDATA.population}
■ 基础设施：${userDATA.base}
■ 建筑部门：${userDATA.Department}
■ 轻工厂：${userDATA.farms}
■ 农田：${userDATA.food}
■ 粮食：${userDATA.food}
`.trim()
        }
      return `
===[新马列文游]===
${username}
获得物资：
待完成
`.trim()
    }
    catch (error) {
      return '发生错误'
    }
  })
}


