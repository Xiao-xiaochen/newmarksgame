//src\commandP\Region_Metallurgy_Info.ts
import { Context } from 'koishi'
//import { Region_Metallurgy_Info } from '../core/Player'    等待制作
export function Playerinfo(ctx: Context) {
  ctx.command('查看地区冶金')
    .action(async ({ session }) => {        //session是会话
      if (!session) {
        return '会话不存在'
      }
      const username = session?.author?.name || '未知用户'
      return `
■钢铁产能：--吨/日
□高炉：-x---吨（消耗铁矿1.5t/钢，焦炭0.5t/钢）
■铝材产能：-吨/日
□电解铝厂：-×---吨（耗电1MW/吨）
■稀有金属精炼：--吨/日
□稀土分离厂：-（消耗稀土2t/成品1t）
`.trim()
    })
}
