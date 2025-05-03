import 'koishi'

// --- 移除：不再需要的 OngoingConstruction 接口 ---
// export interface OngoingConstruction { ... }
// --- 移除结束 ---


// --- 系统配置 ---
export interface System {
  LastResetDate: string;
  lastCheckInDate: string;
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
  lastStationTimestamp?: number; // 新增：记录上次驻扎的时间戳

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
  lastRenameTimestamp?: number; // 上次重命名的时间戳 (用于冷却)

}

// --- 地区数据 ---
export interface Region {
  // --- 移除：不再需要的 ongoingconstruction 字段 ---
  // ongoingconstruction: OngoingConstruction | null;
  // --- 移除结束 ---
  militaryIndustry: number;
  RegionId: string; // 地区ID (主键, e.g., "4604")
  guildId: string;  // 所属频道ID (如果需要区分不同服务器)
  owner: string;    // 控制者 (国家名称 或 null)
  leader: string;   // 地区领导者 (用户ID 或 null)

  population: number;   // 总人口
  labor: number;     // 地区劳动力
  Busylabor: number;    // 可用劳动力 (空闲劳动力)
  // Fixlabor?: number;    // 移除: 固定劳动力 (被占用的劳动力)
  // power: number;      // 地区电力? (暂时移除)

  base: number;       // 地区基础设施等级/数量
  maxbase: number;    // 地区最大基础设施

  Department: number;           // 地区建筑部门数量 (不再是等级)
  Constructioncapacity: number; // 地区累积的总建造力
  // constructionQueue?: string;   // 移除: 不再使用建造队列

  // --- 建筑/设施数量 ---
  farms: number;        // 农场
  mfactory: number;     // 军工厂 (总数)
  busymfactory: number; // 正在工作的军工厂 (这个字段可能需要重新考虑，或者合并到Busylabor/Fixlabor逻辑中)
  Mine: number;         // 矿场 (总数) - 需要细化为具体矿种吗？例如 coalMine, ironMine
  // busymine: number;     // 正在工作的矿场 (同上) <--- 移除此行
  oilwell: number;      // 油井 (总数)
  busyoilwell: number;  // 正在工作的油井 (同上)
  steelmill: number;    // 钢铁厂 (总数)
  busysteelmill: number;// 正在工作的钢铁厂 (同上)
  lightIndustry?: number; // 新增: 轻工厂
  refinery?: number;      // 新增: 炼油厂
  powerPlant?: number;    // 新增: 发电厂 (占位，暂无功能)
  concretePlant?: number;// 新增: 混凝土厂
  machineryPlant?: number; // 新增: 机械厂
  miningAllocation?: Record<string, number>; // 矿场分配记录
  laborAllocation?: Record<string, number>; // 新增: 劳动力分配记录 { buildingKey: count }


  warehouseCapacity: number;
  OwarehouseCapacity: number;
  militarywarehouseCapacity: number;
  OmilitarywarehouseCapacity: number;

  // --- 地区仓库 (与玩家仓库分开) ---
  warehouse: {
    food: number;
    goods: number; // 生活消费品
    rubber: number;
    Mazout: number; // 重油
    Diesel: number; // 柴油
    fuel: number;   // 燃料 (通用?)
    Asphalt: number;// 沥青
    Gas: number;    // 天然气? 汽油?
    rareMetal: number;
    rareEarth: number;
    coal: number;
    ironOre: number;   // 铁矿石
    steel: number;
    aluminum: number;
    oil: number;       // 原油
    concrete?: number; // 新增: 混凝土
    stone?: number;     // 新增: 石材
    machinery?: number;// 新增: 机械
  };

  // --- 地区军事仓库 (与玩家仓库分开) ---
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

  // --- 地区固有资源储量? (与仓库区别?) ---
  resources: {
    rareMetal: number;
    rareEarth: number;
    coal: number;
    ironOre: number;
    aluminum: number;
    oil: number;
  };

  Terrain: TerrainType; // 地区地形
  lastPopulationModifier?: number; // 存储上一次人口修改的时间戳
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
