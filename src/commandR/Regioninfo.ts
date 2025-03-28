//src\commandR\Regioninfo.ts

import { Context } from 'koishi'
//import { RegionSystem } from '../core/region'    等待制作

export function Regioninfo(ctx: Context) {
  ctx.command('查看地区')
    .action((查看地区) => {
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
