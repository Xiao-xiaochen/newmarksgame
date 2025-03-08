export interface Region {
  garrison: any;
  secondaryIndustryCount: any;
  primaryIndustryCount: any;
  warehouseCapacity: any;
  id?: number;
  regionId: string;
  groupId: string;
  ownerId: string;
  name: string;
  population: number;
  infrastructure: number;
  farmland: number;
  factory: number;
  resource: {
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
  labor: number;
  leaderUserId: string; // 添加 leaderUserId 属性
  maxInfrastructure: number; // 最大基础设施
  terrainFeatures?: { // 地形特质
    mountainous: number;
    hilly: number;
    plains: number;
    rivers: number;
    forestCoverage: number;
  };
}
