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
    capitalRegionId: { type: 'string', length: 255, nullable: true }, // 新增：首都/初始地区ID
  }, {
    primary: 'name'
  })

  ctx.model.extend('regiondata', {
    RegionId: { type:'string', length: 255 },
    guildId: { type: 'string', length: 255 },
    Terrain: { type: 'string', length: 255 },
    owner: { type: 'string', length: 255 },
    leader: { type: 'string', length: 255 },
    population: { type: 'unsigned', initial: 0 },
    labor: { type: 'unsigned', initial: 0 },
    Busylabor: { type: 'unsigned', initial: 0 }, // 新增
    Fixlabor: { type: 'unsigned', initial: 0 }, // 新增
    power: { type: 'unsigned', initial: 0 }, // 新增
    base: { type: 'unsigned', initial: 0 },
    maxbase: { type: 'unsigned', initial: 0 },
    Department: { type: 'unsigned', initial: 0 },
    Constructioncapacity: { type: 'unsigned', initial: 0 }, // 新增
    farms: { type: 'unsigned', initial: 0 },
    mfactory: { type: 'unsigned', initial: 0 }, // 新增
    busymfactory: { type: 'unsigned', initial: 0 }, // 新增
    Mine: { type: 'unsigned', initial: 0 }, // 新增
    busymine: { type: 'unsigned', initial: 0 }, // 新增
    oilwell: { type: 'unsigned', initial: 0 }, // 新增
    busyoilwell: { type: 'unsigned', initial: 0 }, // 新增
    steelmill: { type: 'unsigned', initial: 0 }, // 新增
    busysteelmill: { type: 'unsigned', initial: 0 }, // 新增
    warehouse: { type: 'json' }, // 新增
    militarywarehouse: { type: 'json' }, // 新增
    resources: 'json',
  }, {
    primary: 'RegionId', // 明确主键
  });

}
