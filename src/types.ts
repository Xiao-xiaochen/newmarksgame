import 'koishi'

// --- 系统配置 ---
export interface System {
  LastResetDate: string;
}

// 声明 Koishi 数据库模型
declare module 'koishi' {
  interface Tables {
    system: System;
    userdata: userdata;
    country: Country;
    regiondata: Region; // 注意表名通常是小写
    // 可以添加配置表，如 military_item_config, power_plant_config
  }
}

// --- 地形相关 ---
export enum TerrainType {
  OCEAN = '水域',
  PLAIN = '平原',
  FOREST = '森林',
  HILLS = '丘陵',
  MOUNTAIN = '山地',
}

export interface TerrainTraits {
  terrainType: TerrainType;
  forestCoverage: number;
  buildingSlots: number;
  fertility: number;
  resourceMultiplier: Record<string, number>;
  moisture?: number; // 添加湿度属性
  elevation?: number; // 添加海拔属性
  temperature?: number; // 添加温度属性
}

// --- 用户数据 ---
export interface userdata {

  userId: string;
  regionId: string; // 用户当前所在地区? 或者出生地?

  hasCheckedIn: boolean;           // 标记是否已阅读报告 (注册状态)
  population: number;              // 人口 (玩家直接控制的人口?)

  Labor: number;                   // 总劳动力
  Busylabor: number;               // 繁忙劳动力
  Fixlabor: number;                // 固定劳动力 (维持建筑等所需?)

  base: number;                    // 基础设施等级/数量
  maxbase: number;                 // 最大基础设施
  Department: number;              // 建筑部门等级/数量

  farms: number;        // 农场
  mfactory: number;     // 军工厂 (总数)
  busymfactory: number; // 正在工作的军工厂
  Mine: number;         // 矿场 (总数)
  busymine: number;     // 正在工作的矿场
  oilwell: number;      // 油井 (总数)
  busyoilwell: number;  // 正在工作的油井
  steelmill: number;    // 钢铁厂 (总数)
  busysteelmill: number;// 正在工作的钢铁厂

  warehouseCapacity: number;    
  OwarehouseCapacity: number;
  militarywarehouseCapacity: number;    
  OmilitarywarehouseCapacity: number;    

  // 玩家个人仓库
  warehouse: {
    // 生活物资
    food: number;
    goods: number;

    // 工业原料/产品
    rubber: number;
    Mazout: number; // 重油
    Diesel: number; // 柴油
    fuel: number;   // 燃料 (通用?)
    Asphalt: number;// 沥青
    Gas: number;    // 天然气? 汽油?

    // 矿产/金属
    rareMetal: number; // 稀有金属
    rareEarth: number; // 稀土
    coal: number;      // 煤炭
    ironOre: number;   // 铁矿石
    steel: number;     // 钢铁
    aluminum: number;  // 铝
    oil: number;       // 石油
  };

  // 玩家个人军事仓库
  militarywarehouse: {
    bomb: number;
    car: number;
    Tank: number;
    AntiTankGun: number;
    Artillery: number;
    AWACS: number; // 预警机
    HeavyFighter: number;
    InfantryEquipment: number; // 步兵装备
    LightFighter: number;
    StrategicBomber: number;
    TacticalBomber: number;
    Transportaircraft: number; // 运输机
  };

  // 玩家个人资源点? (与仓库区别?)
  resources: {
    rareMetal: number;
    rareEarth: number;
    coal: number;
    ironOre: number;
    aluminum: number;
    oil: number;
  };

  // 国家相关
  countryName?: string; // 所属国家名称
  isLeader?: boolean;   // 是否为国家领袖
  lastCountryLeaveTimestamp?: number; // 上次离开/解散国家的时间戳 (用于建国冷却)

}

// --- 国家数据 ---
export interface Country {

  name: string;           // 国家名称 (主键)
  leaderId: string;       // 领袖的用户ID
  leaderName: string;     // 领袖的用户名 (冗余存储，方便查询)
  members: string[];      // 成员的用户ID列表
  capitalRegionId: string;// 首都地区ID
  regions: string[];      // 控制的地区ID列表 (冗余存储，方便查询)
  // establishedDate?: Date; // 建立日期 (可以考虑添加)

}

// --- 地区数据 ---
export interface Region {
  RegionId: string; // 地区ID (主键, e.g., "4604")
  guildId: string;  // 所属频道ID (如果需要区分不同服务器)
  owner: string;    // 控制者 (国家名称 或 null)
  leader: string;   // 地区领导者 (用户ID 或 null)

  population: number; // 地区人口
  labor: number;      // 地区总劳动力
  Busylabor: number;  // 地区繁忙劳动力
  Fixlabor: number;   // 地区固定劳动力
  power: number;      // 地区电力? (发电量? 需求量?)

  base: number;       // 地区基础设施等级/数量
  maxbase: number;    // 地区最大基础设施

  Department: number;           // 地区建筑部门等级/数量
  Constructioncapacity: number; // 地区当前建造力

  // 建筑/设施数量
  farms: number;        // 农场
  mfactory: number;     // 军工厂 (总数)
  busymfactory: number; // 正在工作的军工厂
  Mine: number;         // 矿场 (总数)
  busymine: number;     // 正在工作的矿场
  oilwell: number;      // 油井 (总数)
  busyoilwell: number;  // 正在工作的油井
  steelmill: number;    // 钢铁厂 (总数)
  busysteelmill: number;// 正在工作的钢铁厂

  warehouseCapacity: number;    
  OwarehouseCapacity: number;
  militarywarehouseCapacity: number;    
  OmilitarywarehouseCapacity: number;    

  // 地区仓库 (与玩家仓库分开)
  warehouse: {
    food: number;
    goods: number;
    rubber: number;
    Mazout: number;
    Diesel: number;
    fuel: number;
    Asphalt: number;
    Gas: number;
    rareMetal: number;
    rareEarth: number;
    coal: number;
    ironOre: number;
    steel: number;
    aluminum: number;
    oil: number;
  };

  // 地区军事仓库 (与玩家仓库分开)
  militarywarehouse: {
    bomb: number;
    car: number;
    Tank: number;
    AntiTankGun: number;
    Artillery: number;
    AWACS: number;
    HeavyFighter: number;
    InfantryEquipment: number;
    LightFighter: number;
    StrategicBomber: number;
    TacticalBomber: number;
    Transportaircraft: number;
  };

  // 地区固有资源储量? (与仓库区别?)
  resources: {
    rareMetal: number;
    rareEarth: number;
    coal: number;
    ironOre: number;
    aluminum: number;
    oil: number;
  };

  Terrain: TerrainType; // 地区地形
}

// --- 配置项 ---

// 军事单位生产配置
export interface MilitaryItemConfig {
  name: string;                 // 物品名称 (唯一标识)
  output: number;               // 单次生产产出数量
  laborCost: number;            // 所需劳动力 (每个工厂)
  resourceCosts: {              // 资源消耗 (单位：吨)
    steel?: number;
    rareMetal?: number;
    aluminum?: number;
    rubber?: number;
    // 可以添加其他资源如石油、燃料等
  };
  factoriesRequired: number;    // 生产一个单位所需的最少满编工厂数 (或定义为生产效率?)
  // buildTime?: number;         // 生产时间 (可以考虑添加)
}

// 发电厂配置
export interface PowerPlantConfig {
  name: string;            // 发电厂类型名称 (唯一标识)
  steelCost: number;       // 钢铁消耗 (吨/座)
  laborCost: number;       // 劳动力需求 (人/座)
  powerOutput: number;     // 发电量 (MW/座)
  terrainCheck?: string;   // 地形要求 (暂未使用)
  // 燃料消耗 (单位/小时 或 /天?)
  coalCost?: number;       // 煤
  UraniumCost?: number;    // 铀
  // buildCost?: Record<string, number>; // 建造所需资源 (除了钢铁)
  // buildTime?: number;    // 建造时间
}

// Wangyisheng (这个注释似乎是开发者签名，保留)