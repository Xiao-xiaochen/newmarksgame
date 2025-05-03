
//src\commandR\RegionPopulation.ts

import { Context } from 'koishi'
import { Region } from '../../types' // 导入 Region 类型

// 从 HourCheckIn.ts 或配置文件中获取/定义消耗率 (这里为了简单重新定义)
const FOOD_CONSUMPTION_PER_CAPITA = 0.0001;    // 每人每小时(天)消耗粮食
const GOODS_CONSUMPTION_PER_CAPITA = 0.00005; // 每人每小时(天)消耗消费品

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

    // --- 计算民生需求 ---
    // 使用 Math.ceil 确保即使人口很少也有需求，或者根据你的规则调整
    const foodNeeded = Math.ceil(currentPopulation * FOOD_CONSUMPTION_PER_CAPITA)
    const goodsNeeded = Math.ceil(currentPopulation * GOODS_CONSUMPTION_PER_CAPITA)

    // --- 读取上次结算的人口变化率 ---
    const lastModifier = region.lastPopulationModifier ?? 0; // 从数据库读取，如果不存在则为0
    // 将修正系数转换为百分比字符串，保留两位小数
    const populationChangePercent = (lastModifier * 100).toFixed(2);
    const populationChangeInfo = `${lastModifier >= 0 ? '+' : ''}${populationChangePercent}% / 小时`; // 游戏内每小时即为一天

    const FormalPopulation = (region.population / 10000).toFixed(2);
    const FormalLabor = (region.labor / 10000).toFixed(2);
    
return `
===[地区 ${region.RegionId} 人口报告]===
指挥官：${username}
■ 地区人口：${FormalPopulation.toLocaleString()}万
■ 劳动人口：${FormalLabor.toLocaleString()}万
□ 人口变化：${populationChangeInfo}
■ 民生需求 (每小时)：
□ 粮食: ${foodNeeded.toLocaleString()}
□ 生活消费品：${goodsNeeded.toLocaleString()}
`.trim()
    })
}
