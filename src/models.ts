import { Context } from 'koishi'
import { userdata } from './types'

declare module 'koishi' {
  interface Tables {
    userdata: userdata
  }
}

export function initializeDatabase(ctx: Context) {
  ctx.database.extend('userdata', {
    userId: { type: 'string', length: 255 },
    hasCheckedIn: { type: 'boolean', initial: false },
    population: { type: 'unsigned', initial: 0 },
    base: { type: 'unsigned', initial: 0 },
    Department: { type: 'unsigned', initial: 0 }, // 建筑部门
    farms: { type: 'unsigned', initial: 0 },      // 农田
    food: { type: 'unsigned', initial: 0 },       // 粮食
  }, {
    primary: 'userId'  // 明确主键
  })
}