//src\commandP\Playerinfo.ts

import { Context } from 'koishi'
import { userdata } from '../../types' // 导入 userdata 类型

//import { Playerinfo } from '../core/Player'    等待制作

export function Playerinfo(ctx: Context) {
  ctx.command('我的全部资料')
    .action(async ({ session }) => {
      if (!session) {
        return '会话不存在'
      }
      const username = session.author?.name || '未知用户'
      const userId = session.userId
      
      if (!userId) {
        return '无法获取用户ID'
      }
      
      try {
        // 查询数据库中是否存在该用户的记录
        const Userinfo = await ctx.database.get('userdata', { userId: userId })
        
        // 如果用户不存在（未注册）
        if (!Userinfo || Userinfo.length === 0) {

          return `
====[错误]====
${username} 同志
您尚未注册！
请先发送“阅读报告”
`.trim()
        }
        // 用户已注册，获取用户数据
        const userdata = Userinfo[0]
        const Formalpopulation = ( userdata.population / 10000 ).toFixed(2)

        // 返回用户的实际数据
        return `
====[全部资料]====
${username} 同志！
■ 人口：${Formalpopulation}万
■ 劳动力：${( userdata.Labor / 10000 ).toFixed(2)}万
■ 基础设施：${userdata.base}/${userdata.maxbase}
■ 建筑部门：${userdata.Department}
■ 农田：${userdata.farms}
■ 仓库容量：${userdata.warehouseCapacity}
`.trim()

      } catch (error) {
        console.error('查询用户资料时出错:', error)
        return '查询用户资料时发生错误'
      }
    })

}

