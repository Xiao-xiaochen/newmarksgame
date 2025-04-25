import { Context } from 'koishi'
import { Region, userdata, Country, System } from './types'

declare module 'koishi' {
  interface Tables {
    userdata: userdata;
    regiondata: Region;
    country: Country;
    system: System
  }
}

export function Database(ctx: Context) {

  ctx.model.extend('system', {
    LastResetDate: { type:'string', length: 255 },
  }, {
    primary: 'LastResetDate'  // 明确主键
  })

  ctx.model.extend('userdata', {
    userId: { type: 'string', length: 255 },
    hasCheckedIn: { type: 'boolean', initial: false },
    population: { type: 'unsigned', initial: 0 },
    Labor: { type: 'unsigned', initial: 0 },
    base: { type: 'unsigned', initial: 0 },
    Department: { type: 'unsigned', initial: 0 },
    farms: { type: 'unsigned', initial: 0 },
    food: { type: 'unsigned', initial: 0 },
    countryName: { type: 'string', length: 255 },
    isLeader: { type: 'boolean', initial: false },
  }, {
    primary: 'userId'  // 明确主键
  })

  ctx.model.extend('country', {
    name: { type: 'string', length: 255 },
    leaderId: { type: 'string', length: 255 },
    leaderName: { type: 'string', length: 255 },
    members: { type: 'json' },
  }, {
    primary: 'name'
  })

  ctx.model.extend('regiondata', {
    guildId: { type: 'string', length: 255 },
    owner: { type: 'string', length: 255 },
    leader: { type: 'string', length: 255 },
    population: { type: 'unsigned', initial: 0 },
    labor: { type: 'unsigned', initial: 0 },
    base: { type: 'unsigned', initial: 0 },
    Department: { type: 'unsigned', initial: 0 },
    farms: { type: 'unsigned', initial: 0 },
    resources: 'json',
    terrain: 'json',
  }, {
    primary: 'guildId', // 明确主键
  });
  
}
