import 'koishi'

export interface System {
  LastResetDate: string;
}

// 地形类型枚举
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

export interface userdata {
  userId: string
  regionId: string
  hasCheckedIn: boolean           // 标记是否已阅读报告
  population: number              // 人口
  Labor: number                   // 劳动力
  base: number                    // 基础设施
  Department: number              // 建筑部门
  farms: number                   // 农田
  food: number                    // 粮食
  countryName?: string
  isLeader?: boolean
}

export interface Country {
  name: string;
  leaderId: string;
  leaderName: string;
  members: string[];
  capitalRegionId: string;
}

// 地区系统相关逻辑
export interface Region {

  RegionId: string;
  guildId: string;
  owner: string;
  leader: string;

  population: number;
  labor: number;
  Busylabor: number;
  Fixlabor: number;
  power: number;

  base:number;
  maxbase: number;

  Department: number;                //劳动力充足的建筑部门，每个小时自动产生建造力
  Constructioncapacity: number;      //建造力
  
  farms: number;

  mfactory: number;           //m表示军事
  busymfactory: number;
  
  Mine: number;
  busymine: number;
  
  oilwell: number;
  busyoilwell: number;

  steelmill: number;
  busysteelmill: number;

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

  }

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
  }
  resources: {

    rareMetal: number;
    rareEarth: number;
    coal: number;
    ironOre: number;
    aluminum: number;
    oil: number;

  };

  Terrain: TerrainType;
}

export interface MilitaryItemConfig {
  name: string;                 // 物品名称
  output: number;               // 单次生产产出数量
  laborCost: number;            // 所需劳动力 (每个工厂)
  resourceCosts: {              // 资源消耗 (单位：吨)
    steel?: number;
    rareMetal?: number;
    aluminum?: number;
    rubber?: number;
  };
  factoriesRequired: number;    // 生产一个单位所需的最少满编工厂数
}

//发电厂配置类型
export interface PowerPlantConfig {
  name: string
  steelCost: number        //钢铁消耗 (吨/座)
  laborCost: number        //劳动力需求 (人/座)
  powerOutput: number      //发电量 (MW/座)
  terrainCheck?: string    //地形要求(先放着）
  coalCost?: number        //煤
  UraniumCost?: number     //铀
}
