
import { Context } from 'koishi'

// 基础类型定义

// 玩家相关
export interface Player {
  id: string                // 玩家ID（QQ号）
  name: string              // 玩家名称
  population: number        // 人口（万）
  infrastructure: number    // 基础设施（建筑位）
  constructionDept: number  // 建筑部门数量
  lightIndustry: number     // 轻工厂数量
  farmland: number          // 农田数量
  food: number              // 粮食数量
  country?: string          // 所属国家
  position?: CountryPosition // 国家职位
}

// 国家职位枚举
export enum CountryPosition {
  LEADER = '国家元首',
  VICE_LEADER = '副元首',
  AGRICULTURE_MINISTER = '农业部长',
  INDUSTRY_MINISTER = '工业部长',
  ECONOMY_MINISTER = '经济部长',
  FOREIGN_MINISTER = '外交部长',
  MARSHAL = '元帅',
  GENERAL = '将领',
  REGION_LEADER = '地区领导'
}

// 国家相关
export interface Country {
  id: string                // 国家ID
  name: string              // 国家名称
  leader: string            // 领导人ID
  members: string[]         // 成员ID列表
  positions: Record<CountryPosition, string[]> // 职位分配
  totalArmy: number         // 国家总军队
  totalIndustry: number     // 国家总工业
}

// 地区相关
export interface Region {
  id: string                // 地区ID（群号）
  name: string              // 地区名称
  controller?: string       // 控制方（国家ID）
  leader?: string           // 领导人ID
  population: number        // 地区人口（万）
  laborPopulation: number   // 劳动人口（万）
  infrastructure: {         // 基础设施
    total: number           // 总建筑位
    used: number            // 已使用建筑位
  }
  warehouse: number         // 地区仓库容量
  primaryIndustry: PrimaryIndustry // 第一产业
  secondaryIndustry: SecondaryIndustry // 第二产业
  army: number              // 地区驻军
  terrain: Terrain          // 地形特质
  resources: Resources      // 资源储量
  powerPlants: PowerPlants  // 电力系统
  militaryBase?: MilitaryBase // 军事基地
  militaryWarehouse?: MilitaryWarehouse // 军事仓库
}

// 地形特质
export interface Terrain {
  buildingSlots: number     // 建筑位
  mountain: number          // 山地百分比
  hill: number              // 丘陵百分比
  plain: number             // 平原百分比
  river: number             // 河流百分比
  forest: number            // 森林覆盖率
}

// 第一产业（农业）
export interface PrimaryIndustry {
  farmland: number          // 农田数量
  fixedLabor: number        // 固定劳动力
  idleFarmland: number      // 空闲农田
  crops: {                  // 作物类型
    food: number            // 粮食作物
    rubber: number          // 橡胶作物
  }
}

// 第二产业
export interface SecondaryIndustry {
  lightIndustry: number     // 轻工业数量
  construction: number      // 建筑业数量
  heavyIndustry: number     // 重工业数量
  militaryIndustry: number  // 军工业数量
}

// 资源储量
export interface Resources {
  rareEarth: number         // 稀土资源（吨）
  rareMetal: number         // 稀有金属（吨）
  ironOre: number           // 铁矿（吨）
  coal: number              // 煤矿（吨）
  aluminum: number          // 铝矿（吨）
  oil: number               // 原油（桶）
}

// 电力系统
export interface PowerPlants {
  thermal: number           // 火力发电厂数量
  hydro: number             // 水电站数量
  fuelOil: number           // 燃料油发电厂数量
  nuclear: number           // 核电站数量
  totalOutput: number       // 总发电量（MW）
}

// 军事基地
export interface MilitaryBase {
  controller: string        // 控制方
  leader: string            // 领导人
  garrison: number          // 驻军
  road: number              // 公路完成度
  warehouse: number         // 军事仓库完成度
  fortress: number          // 要塞等级
  radar: number             // 雷达完成度
  antiAir: number           // 防空阵地完成度
}

// 军事仓库
export interface MilitaryWarehouse {
  infantry: number          // 步兵装备
  tanks: number             // 坦克
  apc: number               // 装甲运兵车
  artillery: number         // 火炮
  antiTank: number          // 反坦克炮
  antiAir: number           // 防空火炮
  lightFighter: number      // 轻型战斗机
  heavyFighter: number      // 重型战斗机
  tacticalBomber: number    // 战术轰炸机
  strategicBomber: number   // 战略轰炸机
  transportAircraft: number // 运输机
  awacs: number             // 预警机
}// 情报
