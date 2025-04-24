import 'koishi'

export interface System {
  LastResetDate: string
}

export enum ChannelType {
  guild = 1,
  private = 2,
  group = 3
}

export interface Channel {
  id: string
  name: string
  type: ChannelType
  parent_id?: string
}

export interface Guild {
  id: string
  name: string
}

export interface User {
  id: string
  name: string
  avatar?: string
}

export interface GuildMember {
  user: User
  name?: string
  avatar?: string
  joinedAt?: number
}

export interface GuildRole {
  id: string
  name: string
}

export interface Message {
  id: string
  channel?: Channel
  user?: User
  member?: GuildMember  // 修正为 GuildMember
  quote?: Message
  content: string
  createdAt?: number
  updatedAt?: number
}

//以下是游戏的类型定义

export interface userdata {
  userId: string
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
}

// 地区系统相关逻辑
export interface Region {
  guildId: string;
  owner: string;                     // 控制方（国家 ID）
  leader: string;                    // 领导人（玩家 ID）
  population: number;                // 地区人口
  labor: number;                     // 劳动力
  max_base: number;            // 基础设施（建筑位上限）
  base:number;                 // 建筑位
  Department: number                 // 建筑部门
  farms: number                      // 农田
  resources: {
    minerals: {
      ironOre: number;
      coal: number;
      aluminum: number;
      rareEarth: number;
      oil: number;
      rareMetal: number;
    };
    terrain: {
      mountain: number;
      hill: number;
      plain: number;
      river: number;
      forest: number;
    };
  };
}

//地形特质
export interface TerrainFeatures {
    mountain: number;
    hill: number;                    // 丘陵
    plain: number;                   // 平原
    river: number;
    forest: number;
}
//发电厂配置类型
export interface PowerPlantConfig {
  name: string
  steelCost: number       //钢铁消耗 (吨/座)
  laborCost: number       //劳动力需求 (人/座)
  powerOutput: number     //发电量 (MW/座)
  terrainCheck?: string   //地形要求(先放着）
  coalCost?: number        //煤
  UraniumCost?: number     //铀
}
