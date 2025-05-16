//src\commandR\Laborinfo.ts

import { Context } from 'koishi'
import { Region } from '../../types' // 导入 Region 类型

export function Laborinfo(ctx: Context) {
  ctx.command('查看地区劳动力').alias('地区劳动力', '劳动力') // 添加别名
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

    // --- 提取劳动力数据 ---
    const totalLabor = region.labor || 0
    // Busylabor 字段现在代表空闲劳动力
    const idleLabor = region.Busylabor || 0
    const laborAllocation = region.laborAllocation || {} // 获取劳动力分配对象

    // --- 计算总的固定（已分配）劳动力 ---
    const totalAllocatedLabor = Object.values(laborAllocation).reduce((sum, count) => sum + (count || 0), 0);

    // 计算繁忙劳动力 = 总劳动力 - 空闲劳动力
    // 注意：理论上 totalLabor 应该等于 totalAllocatedLabor + idleLabor
    // 但为了防止数据不一致导致负数，这里用 max(0, ...)
    const workingLabor = Math.max(0, totalLabor - idleLabor)

    // --- 格式化输出 ---
    const formatLabor = (value: number) => (value / 10000).toFixed(2);

    return `
=====[地区劳动力]=====
${username} 同志！
■ 总劳动力：${formatLabor(totalLabor)}万
■ 固定劳动力 (已分配)：${formatLabor(totalAllocatedLabor)}万
■ 繁忙劳动力 (实际工作)：${formatLabor(workingLabor)}万
■ 空闲劳动力：${formatLabor(idleLabor)}万
`.trim()
    })
}

