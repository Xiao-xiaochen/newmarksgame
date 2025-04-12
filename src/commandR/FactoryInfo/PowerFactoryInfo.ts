//src\commandR\Power_Factory_Info.ts
import { Context } from 'koishi'
//import { Power_Factory_Info } from '../core/Player'    等待制作
export function PowerFactoryInfo(ctx: Context) {
  ctx.command('查看地区电厂')
    .action(async ({ session }) => {        //session是会话
      if (!session) {
        return '会话不存在'
      }
      const username = session?.author?.name || '未知用户'
      return `
■火力发电厂：--
■水电站：--
■燃料油发电厂：--
■核电站：--
■发电量：--
`.trim()
    })
}

