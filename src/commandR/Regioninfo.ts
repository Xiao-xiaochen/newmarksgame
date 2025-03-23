// src/core/Regioninfo.ts

import { Context } from 'koishi'
import { RegionSystem } from './core/region' //等待制作

export function defineCommands(ctx: Context) {
  const regionSystem = new RegionSystem(ctx)

  // 查看地区命令
  ctx.command('查看地区')
    .action(async ({ session }) => {
      if (!session?.guildId) return '请在群聊中使用此命令'
      // 获取地区数据
      const region = await regionSystem.getRegion(session.guildId)
      // 格式化消息
      return `
=====[地区信息]=====
■控制方：未完成
■领导人：未完成
□地区人口：未完成
□基础设施：未完成
□地区仓库： 未完成
□第一产业数量：未完成
□第二产业数量：未完成
■地区驻军：未完成
      `.trim()
    })
}