import { Context } from 'koishi'
import { userdata } from './types'

declare module 'koishi' {
  interface Tables {
    userdata: userdata
  }
}

export function Userinfo(ctx: Context) {
  ctx.database.extend('userdata', {
    userId: 'unsigned',                     // 用户id
    hasCheckedIn: 'boolean',            // 标记是否已阅读报告
    population: 'unsigned',               // 人口
    base: 'unsigned',                     // 基础设施
    Department: 'unsigned',               // 建筑部门
    farms: 'unsigned',                    // 农田
    food: 'unsigned',                    // 粮食
 }) 
}