
//src\commandR\RegionPopulation.ts

import { Context } from 'koishi'
import { Region } from '../../types' // 导入 Region 类型

// 从 HourCheckIn.ts 或配置文件中获取/定义消耗率 (这里为了简单重新定义)
const FOOD_CONSUMPTION_PER_CAPITA = 1;    // 每人每小时(天)消耗粮食
const GOODS_CONSUMPTION_PER_CAPITA = 0.5; // 每人每小时(天)消耗消费品

export function RegionPopulation(ctx: Context) {
  ctx.command('查看地区人口')
  .alias('地区人口', '人口') // 添加别名
  .action(async ( {session} ) => {
    const username = session?.author?.name || '未知用户'
    const guildId = session?.guildId
    const userId = session?.userId

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

    // --- 提取人口和劳动力数据 ---
    const currentPopulation = region.population || 0
    const totalLabor = region.labor || 0 // 总劳动力

    // --- 计算民生需求 ---
    // 使用 Math.ceil 确保即使人口很少也有需求，或者根据你的规则调整
    const foodNeeded = Math.ceil(currentPopulation * FOOD_CONSUMPTION_PER_CAPITA)
    const goodsNeeded = Math.ceil(currentPopulation * GOODS_CONSUMPTION_PER_CAPITA)

    // --- 人口变化率 (暂时简化) ---
    // 精确的变化率需要读取上小时的供应数据，这里仅作占位或显示基础信息
    const populationChangeInfo = "变化率依赖于资源供应" // 或者可以显示一个基础增长率？

      return `
===[地区 ${region.RegionId} 人口报告]===
指挥官：${username}
■ 地区人口：${currentPopulation.toLocaleString()}
■ 劳动人口：${totalLabor.toLocaleString()}
□ 人口变化：${populationChangeInfo}
■ 民生需求 (每小时/天)：
□ 粮食: ${foodNeeded.toLocaleString()}
□ 生活消费品：${goodsNeeded.toLocaleString()}
`.trim()
    })
}
