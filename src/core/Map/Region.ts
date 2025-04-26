import { TerrainType, TerrainTraits, Region as RegionInterface } from '../../types';
import { RegionInitializer } from './RegionInitializer';

export class RegionManager {
  private regionInitializer: RegionInitializer;
  
  constructor(seed?: string) {
    this.regionInitializer = new RegionInitializer(seed);
  }
  
  // 根据地区ID获取地形特征
  public getTerrainTraits(regionId: string): TerrainTraits {
    if (!/^\d{4}$/.test(regionId)) {
      throw new Error('地区编号必须为4位数字');
    }
    
    const x = parseInt(regionId.substring(0, 2), 10);
    const y = parseInt(regionId.substring(2, 4), 10);
    
    // 从RegionInitializer获取地形类型
    const terrainType = this.regionInitializer.getTerrainTypeAt(x, y);
    
    // 使用噪声函数生成其他特征
    const elevation = this.regionInitializer.getElevationAt(x, y);
    const moisture = this.regionInitializer.getMoistureAt(x, y);
    const temperature = this.regionInitializer.getTemperatureAt(x, y);
    
    // 根据地形类型计算特征
    let forestCoverage = 0;
    let buildingSlots = 0;
    let fertility = 0;
    const resourceMultiplier: Record<string, number> = {};
    
    // 创建包含地形数据的对象
    const terrainData = {
      terrainType,
      elevation,
      moisture,
      temperature
    };
    
    // 然后在switch和返回值中使用这个对象
    switch (terrainData.terrainType) {
      case TerrainType.OCEAN:
        buildingSlots = 5;
        resourceMultiplier.fish = 1.5;
        break;
      case TerrainType.PLAIN:
        // 使用terrainData中的moisture属性，而不是直接访问TerrainTraits的moisture
        forestCoverage = Math.max(0, Math.min(30, (terrainData.moisture + 0.3) * 50));
        buildingSlots = 20;
        fertility = 0.8;
        break;
      case TerrainType.FOREST:
        forestCoverage = Math.max(50, Math.min(90, (terrainData.moisture + 0.6) * 60));
        buildingSlots = 15;
        fertility = 0.5;
        resourceMultiplier.wood = 1.8;
        break;
      case TerrainType.HILLS:
        forestCoverage = Math.max(10, Math.min(60, (terrainData.moisture + 0.3) * 40));
        buildingSlots = 12;
        fertility = 0.3;
        resourceMultiplier.ironOre = 1.3;
        resourceMultiplier.coal = 1.2;
        break;
      case TerrainType.MOUNTAIN:
        forestCoverage = Math.max(0, Math.min(30, (terrainData.moisture + 0.2) * 20));
        buildingSlots = 8;
        fertility = 0.1;
        resourceMultiplier.ironOre = 1.8;
        resourceMultiplier.coal = 1.5;
        resourceMultiplier.rareEarth = 1.4;
        break;
    }
    
    // 添加一些随机变化，但保持在合理范围内
    const randomOffset = Math.sin(x * 0.1 + y * 0.2) * 10;
    forestCoverage = Math.round(forestCoverage + randomOffset);
    forestCoverage = Math.max(0, Math.min(100, forestCoverage));
    
    buildingSlots = Math.max(5, Math.round(buildingSlots + Math.sin(x * 0.3 + y * 0.1) * 3));
    
    return {
      terrainType: terrainData.terrainType,
      forestCoverage,
      buildingSlots,
      fertility,
      resourceMultiplier,
      // 添加这些属性以便其他地方可以使用
      moisture: terrainData.moisture,
      elevation: terrainData.elevation,
      temperature: terrainData.temperature
    };
  }
  
  // 生成地区描述
  public GetRegionDescription(regionId: string): string {
    const traits = this.getTerrainTraits(regionId);
    
    return `
=====[地区特质]=====
□地区编号：${regionId}
■建筑位：${traits.buildingSlots}
■主要地形：${traits.terrainType}
□森林覆盖率：${traits.forestCoverage}%
□土地肥沃度：${Math.round(traits.fertility * 100)}%
□海拔高度：${traits.elevation > 0 ? Math.round(traits.elevation * 1000) + 'm' : '海平面以下'}
□湿度：${Math.round(traits.moisture * 100)}%
□温度：${Math.round(traits.temperature * 40)}°C
`.trim();
  }
  
  // 初始化地区数据
  public initializeRegionData(regionId: string, guildId: string, owner: string, leader: string, population: number): RegionInterface {
    const traits = this.getTerrainTraits(regionId);
    
    const labor = Math.floor(population * 0.6);
    const maxBase = traits.buildingSlots;
    const farms = Math.max(1, Math.floor((population / 30000) * (traits.fertility * 0.7 + 0.3)));
    
    // 根据地形类型初始化资源
    const resources = {
      rareMetal: 0,
      rareEarth: 0,
      coal: 0,
      ironOre: 0,
      aluminum: 0,
      oil: 0
    };
    
    // 根据地形特性调整资源初始值
    if (traits.terrainType === TerrainType.MOUNTAIN) {
      resources.rareMetal = Math.floor(Math.random() * 60000);
      resources.rareEarth = Math.floor(Math.random() * 30000);
      resources.ironOre = Math.floor(Math.random() * 150000) + 30000;
    } else if (traits.terrainType === TerrainType.HILLS) {
      resources.coal = Math.floor(Math.random() * 200000) + 50000;
      resources.ironOre = Math.floor(Math.random() * 100000) + 20000;
    } else if (traits.terrainType === TerrainType.PLAIN) {
      resources.oil = Math.floor(Math.random() * 100000);
      resources.aluminum = Math.floor(Math.random() * 80000) + 20000;
    }
    
    // 创建地区数据
    const regionData: RegionInterface = {
      RegionId: regionId,
      guildId: guildId,
      owner: owner,
      leader: leader,
      population: population,
      labor: labor,
      base: 0,
      maxbase: maxBase,
      Department: 0,
      farms: farms,
      resources: resources,
      terrain: {
        mountain: traits.terrainType === TerrainType.MOUNTAIN ? 0.8 : (traits.terrainType === TerrainType.HILLS ? 0.3 : 0.1),
        hill: traits.terrainType === TerrainType.HILLS ? 0.7 : (traits.terrainType === TerrainType.MOUNTAIN ? 0.4 : 0.2),
        plain: traits.terrainType === TerrainType.PLAIN ? 0.8 : (traits.terrainType === TerrainType.FOREST ? 0.4 : 0.2),
        river: Math.max(0.1, Math.min(0.8, (traits.moisture + 0.5) / 2)),
        forest: traits.forestCoverage / 100
      }
    };
    
    return regionData;
  }
}