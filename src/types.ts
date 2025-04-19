import 'koishi'

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
}

// 地区系统相关逻辑
export interface Region {
  id: string;
  owner: string;                     // 控制方（国家 ID）
  leader: string;                    // 领导人（玩家 ID）
  population: number;                // 地区人口
  infrastructure: number;            // 基础设施（建筑位）
  maxInfrastructure: number;         // 最大基础设施
  warehouse: number;                 // 地区仓库容量
  primaryIndustry: number;           // 第一产业数量
  secondaryIndustry: number;         // 第二产业数量
  garrison: number;                  // 地区驻军数量
}

//地形特质
export interface TerrainFeatures {
    mountain: number;
    hill: number;                    // 丘陵
    plain: number;                   // 平原
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
