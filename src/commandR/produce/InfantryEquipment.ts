//src\commandP\InfantryEquipment.ts

import { Context } from 'koishi'
//import { InfantryEquipment } from '../core/Player'    等待制作

export function ProduceInfantryEquipment(ctx: Context) {
  ctx.command('地区生产 步兵装备 <数量>')
    .action(async ({ session }) => {        //session是会话
      if (!session) {
        return '会话不存在'
      }
      const username = session?.author?.name || '未知用户'
      /*"const num = parseInt(quantity)
      if (isNaN(num) || num <= 0) return '数量必须为正整数'*/
      return `
=====[军事工业]=====
${username} 同志：
■生产成功
■步兵装备+--
■空闲劳动力：--万(--万)
■消耗资源：--（吨）
  □钢铁：--
`.trim()
    })
}
