
// src/commandP/CheckIn.ts

import { Context, Schema } from 'koishi'
import { userdata } from '../../types'

export function CheckIn(ctx: Context) {
  ctx.command('阅读报告')
    .action(async ({ session }) => {
      if (!session) {
        return '会话不存在'
      }
      
      const username = session.author?.name || '未知用户'
      const userId = session.userId
      
      if (!userId) {
        return '无法获取用户ID'
      }
      
      try {
        // 使用 where 条件而不是直接传递对象
        let Userinfo = await ctx.database.get('userdata', { userId: userId })
        
        if (!Userinfo || Userinfo.length === 0) {
          const Newuser: userdata = {
            userId: userId,
            hasCheckedIn: true,
            population: 100,
            base: 100,
            Department: 100,
            farms: 100,
            food: 100
          }

          await ctx.database.create('userdata', Newuser)
          return `
===[新马列文游]===
欢迎游玩新马列文游
${username}
获得物资：
■ 人口：${Newuser.population}
■ 基础设施：${Newuser.base}
■ 建筑部门：${Newuser.Department}
■ 农田：${Newuser.farms}
■ 粮食：${Newuser.food}
`.trim()
        }
        
        const userDATA = Userinfo[0]
        
        return `
===[新马列文游]===
${username}
获得物资：
■ 人口：${userDATA.population}
■ 基础设施：${userDATA.base}
■ 建筑部门：${userDATA.Department}
■ 农田：${userDATA.farms}
■ 粮食：${userDATA.food}
`.trim()
      } catch (error) {
        console.error('数据库查询错误:', error)
        return '数据库查询错误'
      }
    })
}
