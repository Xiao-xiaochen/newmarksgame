//src\commandP\Buildcountry.ts

import { Context, User } from 'koishi'
//import { country } from '../core/Country'    等待制作

export function Buildcountry(ctx: Context) {
  ctx.command('组建国家')
    .action(( {session} ) => {
      return `
======[国家]=====
${User}
组建成功
■邀请格式：
邀请加入国家@指定玩家
`.trim()
    })
    
}