import { Context } from 'koishi'
import { Region } from '../types'

export function apply(ctx: Context) {
  ctx.command('分配劳动力 <建筑类型:string> <数量:number>', '分配劳动力给指定建筑')
    .action(async ({ session, options }, buildingType, amount) => {
      const groupId = session?.guildId!

      if (!groupId) {
        return '请在群聊中使用此命令'
      }

      let region = await ctx.database.get('region', { groupId })

      if (region.length === 0) {
        return '该地区尚未注册'
      } else {
        const { id, population, labor } = region[0];

        if (buildingType === '农业') {
          const newLabor = Math.min(amount, population);
          const diff = newLabor - labor;

          // TODO: 更新数据库中的劳动力信息
          await ctx.database.update('region', { id }, { labor: newLabor });

          return `分配 ${newLabor} 劳动力给农业，剩余劳动力 ${population - newLabor}`
        } else {
          return '不支持的建筑类型'
        }
      }
    })
}
