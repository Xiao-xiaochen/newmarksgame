// 地区系统相关逻辑

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
