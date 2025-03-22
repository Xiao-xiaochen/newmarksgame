<<<<<<< HEAD
// 类型定义文件

// 地区数据类型
export interface Region {
  id: string;
  name: string;
  owner: string; // 控制方（国家 ID）
  leader: string; // 领导人（玩家 ID）
  population: number;
  infrastructure: number; // 基础设施（建筑位）
  maxInfrastructure: number;
  warehouse: number; // 地区仓库容量
  primaryIndustry: number; // 第一产业数量
  secondaryIndustry: number; // 第二产业数量
  garrison: number; // 地区驻军
  terrainFeatures: TerrainFeatures; // 地形特质
  resourceReserves: ResourceReserves; //资源储量
}

//地形特质
export interface TerrainFeatures {
    mountain: number;
    hill: number;
    plain: number;
    river: number;
    forest: number;
}

//资源储量
export interface ResourceReserves {
    rareEarth: number;
    rareMetal: number;
    ironOre: number;
    coal: number;
    crudeOil: number;
}

// 玩家数据类型 (示例)
export interface Player {
  id: string;
  name: string;
  resources: any; // 玩家资源
}

// 国家数据类型 (示例)
export interface Nation {
    id: string;
    name: string;
    members: string[]; //成员
=======
// 新马列文游 - 类型定义文件

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
  intelligenceNetwork?: IntelligenceNetwork // 情报网
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
}

// 情报网
export interface IntelligenceNetwork {
  strength: number          // 情报网强度
  dailyGrowth: number       // 日增长强度
  spiesOnMission: number    // 任务中间谍数量
}

// 情报部门
export interface IntelligenceDepartment {
  name: string              // 情报部门名称
  civilAffairs: {           // 民政部
    level: number           // 等级
    upgrading: boolean      // 是否正在升级
    remainingDays: number   // 剩余升级天数
  }
  army: {                   // 陆军部
    level: number           // 等级
    upgrading: boolean      // 是否正在升级
    remainingDays: number   // 剩余升级天数
  }
  airForce: {               // 空军部
    level: number           // 等级
    upgrading: boolean      // 是否正在升级
    remainingDays: number   // 剩余升级天数
  }
  defense: {                // 防御部
    passiveDefense: number  // 被动防御等级
    interrogationTraining: number // 审讯训练等级
  }
  spies: Spy[]              // 间谍列表
}

// 间谍特质枚举
export enum SpyTrait {
  INFILTRATOR = '渗透者',   // 减少自身25%被发现几率
  SEDUCER = '诱惑者',       // 减少同一任务间谍15%被发现几率
  RESCUE_MASTER = '营救大师', // 减少营救时50%被发现几率
  VETERAN = '老手'          // 情报网建立速度增加1%每天
}

// 间谍
export interface Spy {
  id: string                // 间谍ID
  name: string              // 间谍名称
  traits: SpyTrait[]        // 特质列表
  onMission: boolean        // 是否在任务中
  mission?: {               // 当前任务
    type: SpyMissionType    // 任务类型
    target: string          // 目标地区ID
    remainingDays: number   // 剩余天数
    totalDays: number       // 总天数
  }
}

// 间谍任务类型
export enum SpyMissionType {
  ESTABLISH_NETWORK = '建立情报网',
  STEAL_BLUEPRINT = '盗取蓝图',
  INFILTRATE_ARMY = '渗透陆军',
  RESCUE_SPY = '间谍营救'
}

// 建筑类型
export enum BuildingType {
  FARMLAND = '农田',
  CONSTRUCTION_DEPT = '建筑部门',
  IRON_MINE = '铁矿场',
  OIL_WELL = '油井',
  COAL_MINE = '煤矿场',
  RARE_EARTH_MINE = '稀土矿场',
  RARE_METAL_MINE = '稀有金属矿场',
  STEEL_MILL = '炼钢厂',
  THERMAL_POWER = '火电站',
  HYDRO_POWER = '水电站',
  MILITARY_FACTORY = '军工厂',
  REFINERY = '精炼厂'
}

// 军事装备类型
export enum MilitaryEquipmentType {
  TANK = '坦克',
  INFANTRY = '步兵装备',
  APC = '装甲运兵车',
  ARTILLERY = '火炮',
  MILITARY_TRUCK = '军事卡车',
  ANTI_TANK = '反坦克炮',
  ANTI_AIR = '防空火炮',
  LIGHT_FIGHTER = '轻型战斗机',
  HEAVY_FIGHTER = '重型战斗机',
  TACTICAL_BOMBER = '战术轰炸机',
  STRATEGIC_BOMBER = '战略轰炸机',
  TRANSPORT_AIRCRAFT = '运输机',
  AWACS = '预警机'
}

// 作物类型
export enum CropType {
  FOOD = '粮食作物',
  RUBBER = '橡胶作物'
}

// 游戏状态
export interface GameState {
  currentHour: number       // 当前小时
  gameActive: boolean       // 游戏是否活跃
  players: Record<string, Player> // 玩家记录
  countries: Record<string, Country> // 国家记录
  regions: Record<string, Region> // 地区记录
}

// 数据库接口
export interface Database {
  getPlayer(id: string): Promise<Player | null>
  savePlayer(player: Player): Promise<void>
  getCountry(id: string): Promise<Country | null>
  saveCountry(country: Country): Promise<void>
  getRegion(id: string): Promise<Region | null>
  saveRegion(region: Region): Promise<void>
  getGameState(): Promise<GameState>
  saveGameState(state: GameState): Promise<void>
}

// 插件选项
export interface NewMarksGameOptions {
  gameStartHour: number     // 游戏开始小时
  gameEndHour: number       // 游戏结束小时
}

// 插件上下文
export interface PluginContext {
  ctx: Context
  db: Database
  options: NewMarksGameOptions
  gameState: GameState
>>>>>>> 61e54fdae48d5c110151145940e9194c3c275b64
}
