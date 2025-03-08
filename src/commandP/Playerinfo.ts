import { Context } from 'koishi'
import { Player } from '../types'

export function apply(ctx: Context) {
  ctx.command('注册', '注册新马列文游')
    .action(async ({ session }) => {
      const userId = session?.userId!

      let player = await ctx.database.get('player', { userId })

      if (player.length === 0) {
        // 注册玩家
        const player: Player = {
          userId: userId,
          username: session?.username!,
          population: 300000,
          infrastructure: 50,
          constructiondepartment: 3,
          lightFactories: 8,
          farms: 10,
          food: 10,
          goods: 0,
          regionId: '',
          countryId: '',
        }

        await ctx.database.create('player', player)

        return `
    欢迎游玩新马列文游
    ===[新马列文游]===
    ${session?.username!} 同志：
    获得物资：
    ■人口：30万
    ■基础设施：50
    ■建筑部门：3
    ■轻工厂：8
    ■农田：10
    ■粮食：10`
      } else {
        return '您已经注册过了'
      }
    })
}
