import { Context, Schema, App } from 'koishi'
import { Region } from './models/Region'
import { Player } from './models/Player'
import { Resource } from './models/Resource'
import { Building } from './models/Building'

declare module 'koishi' {
  interface Tables {
    region: Region
    player: Player
    resource: Resource
    building: Building
  }
}

import database from '@koishijs/plugin-database-sqlite'

const inject = ['database'] 

interface Config {
    mountainousBaseMin: number;
    mountainousBaseMode: number;
    mountainousBaseMax: number;
    hillyBaseMin: number;
    hillyBaseMode: number;
    hillyBaseMax: number;
    riversBaseMin: number;
    riversBaseMode: number;
    riversBaseMax: number;
  }
  
  const Config = Schema.object({
  mountainousBaseMin: Schema.number().default(0).description('山地占比最小值'),
  mountainousBaseMode: Schema.number().default(15).description('山地占比最可能值'),
  mountainousBaseMax: Schema.number().default(30).description('山地占比最大值'),
  hillyBaseMin: Schema.number().default(0).description('丘陵占比最小值'),
  hillyBaseMode: Schema.number().default(10).description('丘陵占比最可能值'),
  hillyBaseMax: Schema.number().default(20).description('丘陵占比最大值'),
  riversBaseMin: Schema.number().default(0).description('河流占比最小值'),
  riversBaseMode: Schema.number().default(5).description('河流占比最可能值'),
  riversBaseMax: Schema.number().default(10).description('河流占比最大值'),
});

export const name = 'newmarksgame'

export async function apply(ctx: Context, config: Config) {
  ctx.plugin(database, { path: './database.sqlite' })

  // Drop region table if it exists (for schema update)
  // await ctx.database.sql('DROP TABLE IF EXISTS region');

  // 初始化数据库表结构
  ctx.model.extend('region', {
    id: { type: 'integer' },
    regionId: 'string',
    ownerId: 'string',
    name: 'string',
    population: 'integer',
    infrastructure: 'integer', 
    farmland: 'integer',
    factory: 'integer',
    resource: 'json',
    terrain: 'json',
    labor: 'integer',
    leaderUserId: 'string',
    warehouseCapacity: 'integer',
    primaryIndustryCount: 'integer',
    secondaryIndustryCount: 'integer',
    garrison: 'integer',
    groupId: 'string', // groupId column is here
  }, {
    primary: 'id',
    autoInc: true,
  })

  ctx.model.extend('player', {
    userId: 'string',
    username: 'string',
    regionId: 'string',
    countryId: 'string',
    population: 'integer',
    infrastructure: 'integer',
    constructiondepartment: 'integer',
    lightFactories: 'unsigned',
    farms: 'unsigned',
    food: 'unsigned',
    goods: 'unsigned',
  }, {
    primary: 'userId',
  })

  ctx.model.extend('resource', {
    regionId: 'unsigned',
    ironOre: 'unsigned',
    coal: 'unsigned',
    aluminum: 'unsigned',
    rareEarth: 'unsigned',
    oil: 'unsigned',
    rareMetal: 'unsigned',
    food: 'unsigned',
    consumerGoods: 'unsigned',
  }, {
    primary: 'regionId',
  })

  ctx.model.extend('building', {
    regionId: 'unsigned',
    farmland: 'unsigned',
    lightFactory: 'unsigned',
    buildingDepartment: 'unsigned',
    ironMine: 'unsigned',
    oilWell: 'unsigned',
    coalMine: 'unsigned',
    rareEarthMine: 'unsigned',
    rareMetalMine: 'unsigned',
    steelPlant: 'unsigned',
    powerPlant: 'unsigned',
    hydroelectricPowerStation: 'unsigned',
    militaryFactory: 'unsigned',
    mechanicalFactory: 'unsigned',
  }, {
    primary: 'regionId',
  })


  ctx.plugin(require('./commandP/Playerinfo').apply)
  ctx.plugin(require('./commandR/Laborinfo').apply)
  ctx.plugin(require('./commandR/Regioninfo').apply)
  ctx.plugin(require('./commandR/Terraininfo').apply)
}
