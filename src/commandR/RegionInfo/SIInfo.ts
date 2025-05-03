// src/commandR/RegionInfo/SIInfo.ts

import { Context } from 'koishi'
import { Region } from '../../types' // 确保导入 Region 类型

export function SIInfo(ctx: Context) {
  ctx.command('查看地区第二产业')
    .alias('第二产业', '产业信息') // 添加别名
    .action(async ({ session }) => {
      const username = session?.author?.name || '未知用户'
      const guildId = session?.guildId

      if (!session) {
        return '无法获取会话信息。'
      }
      if (!guildId) {
        return '此命令只能在群聊中使用。'
      }

      // --- 查询地区数据 ---
      const regionDataResult = await ctx.database.get('regiondata', { guildId: guildId })
      if (!regionDataResult || regionDataResult.length === 0) {
        return `当前群聊 (${guildId}) 未绑定任何地区。请先使用“绑定地区”指令。`
      }
      const region: Region = regionDataResult[0]

      // --- 提取第二产业数据 ---
      const lightIndustryCount = region.lightIndustry || 0
      const constructionCount = region.Department || 0 // 建筑业对应 Department

      // --- 计算重工业总数 (示例：炼钢厂 + 炼油厂) ---
      const steelMillCount = region.steelmill || 0
      const refineryCount = region.refinery || 0
      // 如果还有其他重工业建筑，在这里添加并累加
      const heavyIndustryCount = steelMillCount + refineryCount // + 其他重工业建筑...

      // --- 军工业数量 ---
      const militaryIndustryCount = region.militaryIndustry || 0 // 军工厂

      return `
[地区 ${region.RegionId} 第二产业信息]
指挥官：${username}
■ 轻工业：${lightIndustryCount}
■ 建筑业：${constructionCount}
■ 重工业：${heavyIndustryCount} 
■ 军工业：${militaryIndustryCount}
`.trim()
    })
}