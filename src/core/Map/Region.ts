import { TerrainType, TerrainTraits, Region as RegionInterface } from '../../types';
import { RegionInitializer } from './RegionInitializer';
import { TRandom } from '../../utils/Random'; // 导入三角分布函数

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
  
  
  // 初始化地区数据
  public initializeRegionData(regionId: string, guildId: string, owner: string, leader: string, population: number): RegionInterface {
    const traits = this.getTerrainTraits(regionId);

    const labor = Math.floor(population * 0.6); // 劳动力计算保持不变
    const maxBase = traits.buildingSlots; // 基础设施上限来自地形特征
    // 农场计算保持不变 (或者可以根据需要调整)
    const farms = Math.max(1, Math.floor((population / 30000) * (traits.fertility * 0.7 + 0.3)));

    // 初始化资源对象，所有资源先设为0
    const resources = {
      rareMetal: 0,
      rareEarth: 0,
      coal: 0,
      ironOre: 0,
      aluminum: 0,
      oil: 0
    };

    // 根据地形类型，使用三角分布生成对应资源储量
    // 注意：TRandom 返回的可能是小数，需要取整 Math.floor()
    switch (traits.terrainType) {
        case TerrainType.MOUNTAIN:
            resources.rareMetal = Math.floor(TRandom(0, 30000, 60000)); // 稀有金属
            resources.rareEarth = Math.floor(TRandom(0, 15000, 30000)); // 稀土
            resources.ironOre = Math.floor(TRandom(30000, 80000, 150000)); // 铁矿
            // 山地也可能少量产煤? (可选)
            // resources.coal = Math.floor(TRandom(0, 10000, 50000));
            break;
        case TerrainType.HILLS:
            resources.coal = Math.floor(TRandom(50000, 120000, 250000)); // 煤矿
            resources.ironOre = Math.floor(TRandom(30000, 80000, 150000)); // 丘陵也产铁矿
            // 丘陵也可能少量产铝? (可选)
            // resources.aluminum = Math.floor(TRandom(0, 10000, 30000));
            break;
        case TerrainType.PLAIN:
            resources.oil = Math.floor(TRandom(0, 60000, 100000)); // 原油
            resources.aluminum = Math.floor(TRandom(0, 30000, 100000)); // 铝矿
            // 平原也可能少量产煤? (可选)
            // resources.coal = Math.floor(TRandom(0, 20000, 80000));
            break;
        case TerrainType.FOREST:
            // 森林可以设定少量基础资源，或者专注于木材等（如果添加）
            // resources.coal = Math.floor(TRandom(0, 5000, 20000));
            break;
        case TerrainType.OCEAN:
            // 海洋目前不设定这些矿产资源
            break;
    }


    // 创建地区数据
    const regionData: RegionInterface = {
      RegionId: regionId,
      guildId: guildId,
      owner: owner,
      leader: leader,
      population: population, // 人口由调用者传入
      labor: labor,
      base: 0,
      maxbase: maxBase,
      Department: 0,
      farms: farms,
      resources: resources, // 使用新生成的资源对象
      Terrain: traits.terrainType,
      Busylabor: 0,

      warehouse: {
        food: 0,
        goods: 0,
        rareMetal: 0,
        rareEarth: 0,
        coal: 0,
        ironOre: 0,
        steel: 0,
        aluminum: 0,
        oil: 0,
        rubber: 0,
        Mazout: 0,
        Diesel: 0,
        fuel: 0,
        Asphalt: 0,
        Gas: 0
      },
      Constructioncapacity: 0,
      mfactory: 0,
      busymfactory: 0,
      Mine: 0,
      oilwell: 0,
      busyoilwell: 0,
      steelmill: 0,
      busysteelmill: 0,
      militarywarehouse: {
        bomb: 0,
        car: 0,
        Tank: 0,
        AntiTankGun: 0,
        Artillery: 0,
        AWACS: 0,
        HeavyFighter: 0,
        InfantryEquipment: 0,
        LightFighter: 0,
        StrategicBomber: 0,
        TacticalBomber: 0,
        Transportaircraft: 0
      },
      warehouseCapacity: 500,
      militarywarehouseCapacity: 500,
      OwarehouseCapacity: 0,
      OmilitarywarehouseCapacity: 0
    };

    return regionData;
  }
}