//src\commandR\Laborinfo.ts

import { Context } from 'koishi'
import { Region } from '../../types' // 导入 Region 类型

export function Laborinfo(ctx: Context) {
  ctx.command('查看地区劳动力').alias('地区劳动力') // 添加别名
  .action(async ( {session} ) => {
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

      const totalLabor = region.labor || 0;
      const currentIdleLabor = region.Busylabor || 0; // 这是实际的、立即可用的空闲劳动力

      // 获取固定分配的劳动力
      let totalAllocatedToFixed = 0;

      // 繁忙劳动力 = 总劳动力 - 当前实际空闲劳动力
      const busyLaborCalculated = totalLabor - currentIdleLabor;

      return `
===[地区劳动力报告]===
${username} 同志！
地区编号：${region.RegionId}
■劳动力总和: ${totalLabor}
■固定劳动力: ${totalAllocatedToFixed}
■空闲劳动力: ${currentIdleLabor}
■繁忙劳动力: ${busyLaborCalculated}
      `;

    })
}

