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
    const idleLabor = region.Busylabor || 0 // 注意：变量名可能是 Busylabor，但通常代表空闲
    const fixedLabor = region.laborAllocation || 0
    // 计算繁忙劳动力 = 总劳动力 - 空闲劳动力
    const workingLabor = Math.max(0, totalLabor - idleLabor) // 确保不为负数

      return `
=====[地区劳动力]=====
${username} 同志！
■ 总劳动力：${totalLabor}
■ 繁忙劳动力：${workingLabor}
■ 空闲劳动力：${idleLabor}
■ 固定劳动力：${fixedLabor}
`.trim()
    })
}

