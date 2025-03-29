//src\commandP\Buildcountry.ts

import { Context, User } from 'koishi'
//import { country } from '../core/Country'    等待制作

export function Buildcountry(ctx: Context) {
  ctx.command('组建国家')
    .action(( {session} ) => {
      const username = session?.author?.name || '未知用户'
      return `
======[国家]=====
■用户名：${username}
组建成功!
■邀请格式：
邀请加入国家@指定玩家
`.trim()
    })
    
}