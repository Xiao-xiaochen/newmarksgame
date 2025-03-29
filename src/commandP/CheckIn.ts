// src/commandP/CheckIn.ts

import { Context, Schema } from 'koishi'

export function Buildcountry(ctx: Context) {
  ctx.command('阅读报告')
    .action(( {session} ) => {
      const username = session?.author?.name || '未知用户'
      const userId = session?.userId
      if (!session) {
        return '会话不存在'
      }
      try {
        const existingUser = await ctx.database.get('user', { id: userId }, ['id', 'name', 'hasCheckedIn']) // 假设 getUser 存在或使用 get

        if (existingUser && existingUser.hasCheckedIn) {
          // 如果用户已存在且已签到 (注册)
          return `同志 ${existingUser.name || username}，你已经阅读过报告，无需重复操作。使用“我的全部资料”查看你的信息。`
        } else {
          // 如果用户不存在或未签到，执行注册/更新操作
          const initialPopulation = 300000 // 30万
          const initialInfrastructure = 30 // 初始30，最大50 (最大值可能需要地区系统支持)
          const initialBuildingDepartments = 3
          const initialLightFactories = 8
          const initialFarms = 10
          const initialFood = 10

          await ctx.database.upsert('user', [{
          }])
          return `
欢迎游玩新马列文游
===[新马列文游]===
${username}
获得物资：
■ 人口：${initialPopulation}
■ 基础设施：${initialInfrastructure}
■ 建筑部门：${initialBuildingDepartments}
■ 轻工厂：${initialLightFactories}
■ 农田：${initialFarms}
■ 粮食：${initialFood}
`.trim()}

