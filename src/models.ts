import { Context } from 'koishi'
import { userdata } from './types'

declare module 'koishi' {
  interface Tables {
    userdata: userdata
  }
}

export function Database(ctx: Context) {

  ctx.database.extend('userdata', {
    userId: { type: 'string', length: 255 },
    hasCheckedIn: { type: 'boolean', initial: false },
    population: { type: 'unsigned', initial: 0 },
    Labor: { type: 'unsigned', initial: 0 },
    base: { type: 'unsigned', initial: 0 },
    Department: { type: 'unsigned', initial: 0 },
    farms: { type: 'unsigned', initial: 0 },
    food: { type: 'unsigned', initial: 0 }, 
  }, {
    primary: 'userId'  // 明确主键
  })
  
}