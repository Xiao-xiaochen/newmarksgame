// src\commandR\CheckIn\MineCheckIn.ts

import { Context } from 'koishi'
import { Region } from '../../types' // 导入 Region 类型
import { getBuildingDefinition } from '../../core/Buildings' // 导入建筑定义获取函数
//import { getResourceName } from '../../core/ResourceDefinitions' // 导入资源名称获取函数

export function RMineCheckIn(ctx: Context) {
  ctx.command('阅读地区矿业报告').alias('地区矿业报告', '地区矿业')
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

      // --- 提取矿业相关数据 ---
      // --- 修改：使用小写的 mines ---
      const mines = region.Mine || 0
      const laborAllocation = region.laborAllocation || {}
      const mineLaborAllocated = laborAllocation['mines'] || 0

      // --- 计算矿业产出估算 ---
      const mineBuildingDef = getBuildingDefinition('mines');
      const requiredLaborPerMine = mineBuildingDef?.operation?.fixLabor || 10000; // 假设默认10000劳动力
      const mineProduces = mineBuildingDef?.operation?.produces || {}; // 获取矿场产出定义

      const maxWorkingMines = Math.floor(mineLaborAllocated / requiredLaborPerMine);
      const actualWorkingMines = Math.min(mines, maxWorkingMines);

      // --- 格式化输出 ---
      const formatNumber = (value: number) => value.toLocaleString();
      const reportLines: string[] = [];

      reportLines.push(`===[地区矿业报告]===`);
      reportLines.push(`${username} 同志！`);
      reportLines.push(`■ 矿场数量：${formatNumber(mines)} 个`);
      reportLines.push(`■ 分配劳动力：${formatNumber(mineLaborAllocated)}`);
      reportLines.push(`■ 劳动力需求：${formatNumber(mines * requiredLaborPerMine)}`);
      reportLines.push(`■ 工作矿场：${formatNumber(actualWorkingMines)} 个`);
      reportLines.push(`□ 预计产出/小时：`);

      // 遍历矿场定义中的产出
      for (const resourceKey in mineProduces) {
          const outputPerMine = mineProduces[resourceKey] || 0;
          const estimatedOutput = Math.floor(actualWorkingMines * outputPerMine);
          // --- 修改：直接使用 resourceKey 作为名称 ---
          const resourceName = resourceKey; // 直接使用键名
          if (estimatedOutput > 0) { // 只显示有产出的资源
            reportLines.push(`  - ${resourceName}: ${formatNumber(estimatedOutput)}`);
          }
      }

      if (Object.keys(mineProduces).length === 0 || reportLines[reportLines.length - 1] === '□ 预计产出/小时：') {
        reportLines.push(`  - (无或未定义产出)`);
      }

      reportLines.push(`(注：实际产出和消耗将在每小时结算时更新仓库)`);

      return reportLines.join('\n');
    }
  )
}