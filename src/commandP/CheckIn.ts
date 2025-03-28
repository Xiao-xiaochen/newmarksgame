//src\commandP\CheckIn.ts

import { Context } from 'koishi'
//import { CheckIn } from '../core/Player'    等待制作

export function CheckIn(ctx: Context) {
  ctx.command('阅读报告')
    .action((阅读报告) => {
      return `
===[新马列文游]===
用户名 ：未完成
□获得资源：
■人口：30万
■农田：10
■粮食：10
□获得建筑：
■轻工厂：8
■建筑部门：3
`.trim()
    })
    
}
