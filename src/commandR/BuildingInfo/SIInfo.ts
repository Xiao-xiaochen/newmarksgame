// src/commandR/RegionInfo/SIInfo.ts

import { Context } from 'koishi'
import { Region } from '../../types' // 确保导入 Region 类型

export function SIInfo(ctx: Context) {
  ctx.command('查看地区第二产业').alias('第二产业')
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
      const lightIndustryCount = region.lightIndustry || 0;
      //const busyLightIndustryCount = region.busylightIndustry || 0;
      const refineryCount = region.refinery || 0;
      //const busyRefineryCount = region.busyrefinery || 0;
      const concretePlantCount = region.concretePlant || 0;
      //const busyConcretePlantCount = region.busyconcretePlant || 0;
      const machineryPlantCount = region.machineryPlant || 0;
      //const busyMachineryPlantCount = region.busymachineryPlant || 0;
      const steelMillCount = region.steelmill || 0;
      //const busySteelMillCount = region.busysteelmill || 0;
      const constructionCount = region.Department || 0; // 建筑业对应 Department
      const militaryFactoryCount = region.mfactory || 0; // 军工厂
      //const busyMilitaryFactoryCount = region.busymfactory || 0;

      // --- 计算重工业总数 (炼钢厂 + 炼油厂 + 混凝土厂 + 机械厂) ---
      const heavyIndustryTotal = steelMillCount + refineryCount + concretePlantCount + machineryPlantCount;

      return `
===[地区第二产业概览]===
${username} 同志！
地区编号：${region.RegionId}
■ 轻工业：${lightIndustryCount}
■ 重工业 ${heavyIndustryTotal}
■ 军工业: ${militaryFactoryCount}
■ 建筑业：${constructionCount}
      `.trim()
    })
}