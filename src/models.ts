import { Context } from 'koishi'
import { Region, userdata, Country, System, TerrainType } from './types' // 确保导入 TerrainType

declare module 'koishi' {
  interface Tables {
    userdata: userdata;
    regiondata: Region;
    country: Country;
    system: System;
  }
}

export function Database(ctx: Context) {

  ctx.model.extend('system', {
    LastResetDate: { type: 'string', length: 255 },
    lastCheckInDate: { type:'string', length: 255 },
  }, {
    primary: 'LastResetDate'
  })

  ctx.model.extend('userdata', {
    // --- 基础信息 ---
    userId: { type: 'string', length: 255 },
    regionId: { type: 'string', length: 255, nullable: true }, // 允许为空，可能在注册时未分配
    hasCheckedIn: { type: 'boolean', initial: false },

    // --- 人口与劳动力 ---
    population: { type: 'unsigned', initial: 0 },
    Labor: { type: 'unsigned', initial: 0 },
    Busylabor: { type: 'unsigned', initial: 0 },
    Fixlabor: { type: 'unsigned', initial: 0 },

    // --- 基础设施与部门 ---
    base: { type: 'unsigned', initial: 0 },
    maxbase: { type: 'unsigned', initial: 0 },
    Department: { type: 'unsigned', initial: 0 },

    // --- 建筑设施 (玩家个人拥有?) ---
    // 注意：这些字段在 types.ts 中也存在于 regiondata，需要确认归属
    farms: { type: 'unsigned', initial: 0 },
    mfactory: { type: 'unsigned', initial: 0 },
    busymfactory: { type: 'unsigned', initial: 0 },
    Mine: { type: 'unsigned', initial: 0 },
    busymine: { type: 'unsigned', initial: 0 },
    oilwell: { type: 'unsigned', initial: 0 },
    busyoilwell: { type: 'unsigned', initial: 0 },
    steelmill: { type: 'unsigned', initial: 0 },
    busysteelmill: { type: 'unsigned', initial: 0 },

    // --- 仓库容量 ---
    warehouseCapacity: { type: 'unsigned', initial: 0 },
    OwarehouseCapacity: { type: 'unsigned', initial: 0 }, // Occupied warehouse capacity
    militarywarehouseCapacity: { type: 'unsigned', initial: 0 },
    OmilitarywarehouseCapacity: { type: 'unsigned', initial: 0 }, // Occupied military warehouse capacity

    // --- 仓库 (JSON) ---
    warehouse: {
      type: 'json', initial: {
        food: 0, goods: 0, rubber: 0, Mazout: 0, Diesel: 0, fuel: 0, Asphalt: 0, Gas: 0,
        rareMetal: 0, rareEarth: 0, coal: 0, ironOre: 0, steel: 0, aluminum: 0, oil: 0
      }
    },
    militarywarehouse: {
      type: 'json', initial: {
        bomb: 0, car: 0, Tank: 0, AntiTankGun: 0, Artillery: 0, AWACS: 0, HeavyFighter: 0,
        InfantryEquipment: 0, LightFighter: 0, StrategicBomber: 0, TacticalBomber: 0, Transportaircraft: 0
      }
    },

    // --- 资源点 (JSON) ---
    // 注意：这些字段在 types.ts 中也存在于 regiondata，需要确认归属
    resources: {
      type: 'json', initial: {
        rareMetal: 0, rareEarth: 0, coal: 0, ironOre: 0, aluminum: 0, oil: 0
      }
    },

    // --- 国家相关 ---
    countryName: { type: 'string', length: 255, nullable: true }, // 允许为空
    isLeader: { type: 'boolean', initial: false },
    lastCountryLeaveTimestamp: 'integer', // 上次离开/解散国家的时间戳
    lastStationTimestamp: 'integer', // 上次建造车站的时间戳

  }, {
    primary: 'userId'
  })

  ctx.model.extend('country', {
    name: { type: 'string', length: 255 },
    leaderId: { type: 'string', length: 255 },
    leaderName: { type: 'string', length: 255 }, // 冗余存储，方便查询
    members: { type: 'json', initial: [] }, // 成员 UserID 列表
    capitalRegionId: { type: 'string', length: 255, nullable: true }, // 首都地区 ID
    regions: { type: 'json', initial: [] }, // 控制的地区 ID 列表
    lastRenameTimestamp: { type: 'unsigned', length: 255 }, // 上次重命名的时间戳 (用于冷却)
  }, {
    primary: 'name'
  })

  ctx.model.extend('regiondata', {
    // --- 修改：添加 initial: null ---
    ongoingconstruction: { type: 'json', initial: null }, // 正在建造的建筑
    // --- 修改结束 ---
    // --- 基础信息 ---
    RegionId: { type: 'string', length: 255 }, // 地区ID (e.g., "4604")
    guildId: { type: 'string', length: 255, nullable: true }, // 绑定的频道ID
    owner: { type: 'string', length: 255, nullable: true }, // 控制者 (国家名称 或 null)
    leader: { type: 'string', length: 255, nullable: true }, // 地区领导者 (用户ID 或 null)

    // --- 人口与劳动力 ---
    population: { type: 'unsigned', initial: 0 },
    labor: { type: 'unsigned', initial: 0 },
    Busylabor: { type: 'unsigned', initial: 0 },
    //Fixlabor: { type: 'unsigned', initial: 0 },
    laborAllocation: { type: 'json', initial: {} }, // <--- 新增此行

    // --- 电力与基建 ---
    base: { type: 'unsigned', initial: 0 }, // 基础设施
    maxbase: { type: 'unsigned', initial: 0 }, // 最大基础设施

    // --- 建筑与产能 ---
    Department: { type: 'unsigned', initial: 0 }, // 建筑部门
    Constructioncapacity: { type: 'unsigned', initial: 0 }, // 当前建造力
    constructionQueue: { type: 'text', initial: '[]' }, // <--- Add this line
    farms: { type: 'unsigned', initial: 0 },
    mfactory: { type: 'unsigned', initial: 0 },
    busymfactory: { type: 'unsigned', initial: 0 },
    Mine: { type: 'unsigned', initial: 0 },
    // busymine: { type: 'unsigned', initial: 0 }, // <--- 移除此行
    oilwell: { type: 'unsigned', initial: 0 },
    busyoilwell: { type: 'unsigned', initial: 0 },
    steelmill: { type: 'unsigned', initial: 0 },
    busysteelmill: { type: 'unsigned', initial: 0 },
    lightIndustry: { type: 'unsigned', initial: 0 }, // 新增
    refinery: { type: 'unsigned', initial: 0 },      // 新增
    powerPlant: { type: 'unsigned', initial: 0 },    // 新增
    concretePlant: { type: 'unsigned', initial: 0 },
    machineryPlant: { type: 'unsigned', initial: 0 }, // 新增
    miningAllocation: { type: 'json', initial: {} }, // <--- 新增此行

    // --- 仓库容量 ---
    warehouseCapacity: { type: 'unsigned', initial: 0 },
    OwarehouseCapacity: { type: 'unsigned', initial: 0 }, // Occupied warehouse capacity
    militarywarehouseCapacity: { type: 'unsigned', initial: 0 },
    OmilitarywarehouseCapacity: { type: 'unsigned', initial: 0 }, // Occupied military warehouse capacity

    // --- 仓库 (JSON) ---
    warehouse: {
      type: 'json', initial: {
        food: 0, goods: 0, rubber: 0, Mazout: 0, Diesel: 0, fuel: 0, Asphalt: 0, Gas: 0,
        rareMetal: 0, rareEarth: 0, coal: 0, ironOre: 0, steel: 0, aluminum: 0, oil: 0, stone:0, concrete:0,
        machinery: 0 // 确保这里有
      }
    },
    militarywarehouse: {
      type: 'json', initial: {
        bomb: 0, car: 0, Tank: 0, AntiTankGun: 0, Artillery: 0, AWACS: 0, HeavyFighter: 0,
        InfantryEquipment: 0, LightFighter: 0, StrategicBomber: 0, TacticalBomber: 0, Transportaircraft: 0
      }
    },

    // --- 资源储量 (JSON) ---
    resources: {
      type: 'json', initial: {
        rareMetal: 0, rareEarth: 0, coal: 0, ironOre: 0, aluminum: 0, oil: 0
      }
    },

    // --- 地形 ---
    Terrain: { type: 'string', length: 255, initial: TerrainType.PLAIN }, // 使用枚举的默认值
    lastPopulationModifier: { type: 'integer', initial: 0 }, // 上次人口修改的时间戳
  }, {
    primary: 'RegionId',
  });
}
