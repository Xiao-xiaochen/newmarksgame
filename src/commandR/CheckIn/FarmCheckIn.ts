// src\commandP\CheckIn\FarmCheckIn.ts

import { Context, Schema } from 'koishi'
import { Region } from '../../types' // 导入 Region 类型
import { getBuildingDefinition } from '../../core/Buildings' // 导入建筑定义获取函数
// --- 移除无效的导入 ---
// import { MINE_OUTPUT_RATES, RESOURCE_NAMES } from '../../definitions/ResourceDefinitions'

export function RFarmCheckIn(ctx: Context) {
  ctx.command('阅读地区农业报告').alias('地区农业报告').alias('地区农业')
    .action(async ( {session} ) => {
      const username = session?.author?.name || '未知用户'
      const userId = session?.userId
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

      // --- 提取农业相关数据 ---
      const farms = region.farms || 0
      const laborAllocation = region.laborAllocation || {}
      const farmLaborAllocated = laborAllocation['farms'] || 0

      // --- 计算农业产出 (简化逻辑，参考 HourCheckIn) ---
      const farmBuildingDef = getBuildingDefinition('farms');
      const requiredLaborPerFarm = farmBuildingDef?.operation?.fixLabor || 5000;
      // --- 修改下面这行的默认值为 3 ---
      const foodOutputPerFarm = farmBuildingDef?.operation?.produces?.food;

      const maxWorkingFarms = Math.floor(farmLaborAllocated / requiredLaborPerFarm);
      const actualWorkingFarms = Math.min(farms, maxWorkingFarms);

      const estimatedFoodOutput = Math.floor(actualWorkingFarms * foodOutputPerFarm);
      //const estimatedRubberOutput = Math.floor(actualWorkingFarms * rubberOutputPerFarm);

      // --- 格式化输出 ---
      const formatNumber = (value: number) => value.toLocaleString();

      return `
===[地区农业报告]===
${username} 同志！
■ 农田数量：${formatNumber(farms)} 个
■ 分配劳动力：${formatNumber(farmLaborAllocated).toString()} 
■ 劳动力需求：${formatNumber(farms * requiredLaborPerFarm).toString()}
■ 工作农田：${formatNumber(actualWorkingFarms)} 个
□ 粮食产出：${formatNumber(estimatedFoodOutput)} /小时
`.trim()
    }
  )
}
