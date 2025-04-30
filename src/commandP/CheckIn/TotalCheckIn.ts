
// src/commandP/CheckIn.ts

import { Context, Schema } from 'koishi'
import { userdata } from '../../types'
import { TRandom } from '../../utils/Random'

export function CheckIn(ctx: Context) {
  ctx.command('阅读报告').alias('签到')
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
        let Userinfo = await ctx.database.get('userdata', { userId: userId }) as userdata[]
        
        if (!Userinfo || Userinfo.length === 0) {
          // 如果用户不存在，则创建一个新用户

          const InitialPopulation = TRandom( 80000, 200000, 600000 ); 
          const Labor = Math.floor( InitialPopulation * 0.6 );
          const InitialFarms = Math.max( 1, Math.floor( (InitialPopulation / 30000) * TRandom( 0.6, 0.8, 1, false ) ) );
          // 新用户数据

          const newuser: userdata = {
            userId: userId,
            hasCheckedIn: true,
            population: InitialPopulation,
            Labor: Labor,
            base: 80,
            Department: TRandom(0, 3, 20),
            farms: InitialFarms,
            food: TRandom(2, 10, 30),
            regionId: ''
          }
          await ctx.database.create('userdata', newuser)

          const Formalpopulation = ( newuser.population / 10000).toFixed(2)
          return `
===[新马列文游]===
${username} 同志！
欢迎游玩新马列文游！
□新用户初始物资:
■ 人口：${Formalpopulation}万
■ 基础设施：80
■ 建筑部门：${newuser.Department}
■ 农田：${newuser.farms}
■ 粮食：${newuser.food}
`.trim()
        }

        const userdata = Userinfo[0]
        if (userdata.hasCheckedIn  === true) {
          return `
===[新马列文游]===
${username} 同志！
您今天已经阅读过报告了！         
`.trim()
        } else {
          const populationIncrease = TRandom(300, 1000, 5000)
          const foodIncrease = TRandom(1, 3, 5)  
          await ctx.database.set('userdata', { userId: userId }, {
            hasCheckedIn: true,
            population: userdata.population + populationIncrease,
            food: userdata.food + foodIncrease
          })
          const FormalpopulationIncrease = ( populationIncrease / 10000).toFixed(2)
          return `
===[新马列文游]===
${username} 同志！
获得物资：
■ 人口：${FormalpopulationIncrease}万
■ 粮食：${foodIncrease}
`.trim()
        }   
      } catch (error) {
        console.error('数据库查询错误:', error)
        return '数据库查询错误'
        }
    })
}
