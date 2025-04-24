//src\commandP\Buildcountry.ts

import { Context, User } from 'koishi'
//import { country } from '../core/Country'    等待制作

export function Buildcountry(ctx: Context) {
  ctx.command('组建国家 [countryName:string]')
    .action(async ( { session }, countryName ) => {
      if (!session) {
        return '会话不存在'
      }
      const username = session.author?.name || '未知用户'
      const userId = session.userId
      if (!userId) {
        return '无法获取用户ID'
      }
      
      // 如果没有提供国家名称，提示用户
      if (!countryName) {
        return `
======[国家]=====
${username} 同志！
请提供国家名称。
例如：组建国家 共和国
`.trim()
      }
      
      try {
        // 检查用户是否已注册
        const userInfo = await ctx.database.get('userdata', { userId: userId }) 
        if (!userInfo || userInfo.length === 0) {
          return `
======[国家]=====
${username} 同志！
您尚未注册！请先发送"阅读报告"进行注册。
`.trim()
        }
        // 检查用户是否已经有国家
        const countryInfo = await ctx.database.get('country', { leaderId: userId })
        if (countryInfo && countryInfo.length > 0) {
          return `
======[国家]=====
${username} 同志！
您已经在一个国家里了：
${countryInfo[0].name}
`.trim()
        }
        
        // 检查国家名称是否已被使用
        const existingCountry = await ctx.database.get('country', { name: countryName })
        if (existingCountry && existingCountry.length > 0) {
          return `
======[国家]=====
${username} 同志！
国家名称已被使用!
请选择其他名称。
`.trim()
        }
        
        // 创建新国家
        const newCountry = {
          name: countryName,
          leaderId: userId,
          leaderName: username,
          members: [userId],
          }
        await ctx.database.create('country', newCountry)
        
        // 更新用户数据，标记其为国家领导人
        await ctx.database.set('userdata', { userId: userId }, {
          countryName: countryName,
          isLeader: true
        })
        
        return `
======[国家]=====
${username} 同志！
组建成功！
■邀请格式：
邀请加入国家@指定玩家
`.trim()
      } catch (error) {
        console.error('组建国家时出错:', error)
        return '组建国家时发生错误'
      }
    })
}