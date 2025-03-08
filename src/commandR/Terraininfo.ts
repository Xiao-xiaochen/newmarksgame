
import { Context } from 'koishi'
import { Region, TerrainFeatures } from '../types'

const inject = ['database'] 
export const name = 'terraininfo'

export const apply = (ctx: Context) => {
  ctx.command('查看地区特质', '查看地区特质')
    .action(async ({ session }) => {
      const { database } = ctx
      const groupId = session?.guildId!

      if (!groupId) {
        return '请在群聊中使用此命令'
      }

      let region = await database.get('region', { groupId })

      if (region.length === 0) {
        return '该地区尚未注册'
      } else {
        const { terrain } = region[0]; // Access terrain, not terrainFeatures directly
        if (!terrain) {
          return '该地区地形数据异常，请联系管理员' // Handle case where terrain is undefined
        }
        return `=====[地区特质]=====
■地形特质：
  □山地：${Math.round(terrain.mountain)}%
  □丘陵：${Math.round(terrain.hill)}%
  □平原：${Math.round(terrain.plain)}%
  □河流：${Math.round(terrain.river)}%
  □森林覆盖率：${Math.round(terrain.forest)}%`
      }
    })
}
apply['inject'] = inject
