import { Context } from 'koishi';
import { TerrainType, Region } from '../../types';
import { createNoise2D, createNoise3D } from 'simplex-noise';
import { alea } from 'seedrandom';

export class RegionInitializer {
  private noise2D: (x: number, y: number) => number;
  private noise3D: (x: number, y: number, z: number) => number;
  private seed: string;
  private mapSize = 80; // 80x80 网格，共6400个地区
  private continentCenters: {x: number, y: number, size: number}[] = [];
  private mountainRanges: {startX: number, startY: number, endX: number, endY: number, width: number}[] = [];
  
  constructor(seed?: string) {
    this.seed = seed || 'newmarksgame-world';
    const prng = alea(this.seed);
    this.noise2D = createNoise2D(prng);
    this.noise3D = createNoise3D(prng);
    
    // 生成大陆中心点
    this.generateContinents();
    
    // 生成山脉
    this.generateMountainRanges();
  }
  
  // 生成大陆
  private generateContinents() {
    // 创建3-5个大陆
    const continentCount = Math.floor(3 + Math.random() * 3);
    
    for (let i = 0; i < continentCount; i++) {
      this.continentCenters.push({
        x: Math.floor(Math.random() * this.mapSize),
        y: Math.floor(Math.random() * this.mapSize),
        size: 15 + Math.floor(Math.random() * 20) // 大陆大小变化
      });
    }
  }
  
  // 生成山脉
  private generateMountainRanges() {
    // 创建4-7条山脉
    const rangeCount = Math.floor(4 + Math.random() * 4);
    
    for (let i = 0; i < rangeCount; i++) {
      const startX = Math.floor(Math.random() * this.mapSize);
      const startY = Math.floor(Math.random() * this.mapSize);
      const length = 10 + Math.floor(Math.random() * 30);
      const angle = Math.random() * Math.PI * 2;
      
      const endX = Math.min(this.mapSize - 1, Math.max(0, Math.floor(startX + Math.cos(angle) * length)));
      const endY = Math.min(this.mapSize - 1, Math.max(0, Math.floor(startY + Math.sin(angle) * length)));
      
      this.mountainRanges.push({
        startX,
        startY,
        endX,
        endY,
        width: 2 + Math.floor(Math.random() * 4)
      });
    }
  }
  
  // 计算点到线段的距离
  private distToSegment(x: number, y: number, x1: number, y1: number, x2: number, y2: number): number {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    
    if (len_sq !== 0) param = dot / len_sq;
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  // 改进海岸线生成
  private determineTerrainType(x: number, y: number): TerrainType {
    // 基础噪声值，用于地形随机性
    const baseNoise = this.noise2D(x * 0.05, y * 0.05);
    
    // 计算到最近大陆中心的距离
    let minContinentDist = Number.MAX_VALUE;
    for (const continent of this.continentCenters) {
      const dx = x - continent.x;
      const dy = y - continent.y;
      // 添加柏林噪声扰动，使海岸线更自然
      const distortion = this.noise2D(x * 0.1, y * 0.1) * 0.2;
      const dist = (Math.sqrt(dx * dx + dy * dy) / continent.size) + distortion;
      minContinentDist = Math.min(minContinentDist, dist);
    }
    
    // 计算到最近山脉的距离，添加扰动使山脉边缘更自然
    let minMountainDist = Number.MAX_VALUE;
    for (const range of this.mountainRanges) {
      const baseDist = this.distToSegment(x, y, range.startX, range.startY, range.endX, range.endY);
      // 添加噪声扰动，使山脉边缘更自然
      const distortion = this.noise3D(x * 0.15, y * 0.15, 10) * 0.3;
      const dist = (baseDist / range.width) + distortion;
      minMountainDist = Math.min(minMountainDist, dist);
    }
    
    // 海洋判定 - 远离大陆中心的区域，添加噪声使海岸线更自然
    if (minContinentDist > 1.2 + baseNoise * 0.3) {
      return TerrainType.OCEAN;
    }
    
    // 山地判定 - 靠近山脉的区域，但不再形成完美的环
    if (minMountainDist < 0.7 + this.noise3D(x * 0.2, y * 0.2, 20) * 0.3) {
      return TerrainType.MOUNTAIN;
    }
    
    // 丘陵判定 - 山脉周边区域，使用噪声使分布更自然
    if (minMountainDist < 1.3 + this.noise3D(x * 0.15, y * 0.15, 30) * 0.4) {
      // 添加随机性，使丘陵不总是环绕山脉
      if (this.noise3D(x * 0.25, y * 0.25, 40) > 0.3) {
        return TerrainType.HILLS;
      }
    }
    
    // 森林判定 - 使用多层噪声使森林分布更自然
    const forestNoise1 = this.noise3D(x * 0.08, y * 0.08, 42.5);
    const forestNoise2 = this.noise3D(x * 0.12, y * 0.12, 50.5);
    const combinedForestNoise = (forestNoise1 + forestNoise2) * 0.5;
    
    if (combinedForestNoise > 0.2 && minContinentDist < 0.9) {
      return TerrainType.FOREST;
    }
    
    // 默认为平原
    return TerrainType.PLAIN;
  }
  
  // 生成所有地区的地形数据
  public generateAllRegions(): Map<string, TerrainType> {
    const regions = new Map<string, TerrainType>();
    
    for (let y = 0; y < this.mapSize; y++) {
      for (let x = 0; x < this.mapSize; x++) {
        // 生成RegionId (0000-7979)
        const regionId = x.toString().padStart(2, '0') + y.toString().padStart(2, '0');
        const terrainType = this.determineTerrainType(x, y);
        regions.set(regionId, terrainType);
      }
    }
    
    return regions;
  }
  
  // 初始化数据库中的所有地区
  public async initializeAllRegionsInDatabase(ctx: Context): Promise<void> {
    const regions = this.generateAllRegions();
    const regionEntries: Partial<Region>[] = [];
    const regionCoordinates: { [key: string]: { x: number, y: number } } = {};

    // 统计各类地形数量
    const stats = {
      [TerrainType.OCEAN]: 0,
      [TerrainType.PLAIN]: 0,
      [TerrainType.FOREST]: 0,
      [TerrainType.HILLS]: 0,
      [TerrainType.MOUNTAIN]: 0
    };
    
    for (const [regionId, terrainType] of regions.entries()) {
      stats[terrainType]++;

      const x = parseInt(regionId.substring(0, 2), 10);
      const y = parseInt(regionId.substring(2, 4), 10);
      regionCoordinates[regionId] = { x, y };

      let maxbase = 0;
      let initialPopulation = 0;
      const resources = { // 初始化资源对象
        rareMetal: 0,
        rareEarth: 0,
        coal: 0,
        ironOre: 0,
        aluminum: 0,
        oil: 0
      };

      // 根据地形类型设置 maxbase, initialPopulation 和 资源
      switch (terrainType) {
        case TerrainType.OCEAN:
          maxbase = 0;
          initialPopulation = 0;
          break;
        case TerrainType.PLAIN:
          maxbase = 100;
          initialPopulation = 500;
          resources.ironOre = Math.floor(Math.random() * 50) + 20; // 平原少量铁矿
          resources.coal = Math.floor(Math.random() * 30) + 10;    // 平原少量煤炭
          break;
        case TerrainType.FOREST:
          maxbase = 60;
          initialPopulation = 200;
          resources.coal = Math.floor(Math.random() * 70) + 30;    // 森林较多煤炭 (来自木材)
          resources.aluminum = Math.floor(Math.random() * 20) + 5; // 森林少量铝土
          break;
        case TerrainType.HILLS:
          maxbase = 80;
          initialPopulation = 300;
          resources.ironOre = Math.floor(Math.random() * 100) + 50; // 丘陵多铁矿
          resources.rareEarth = Math.floor(Math.random() * 30) + 10; // 丘陵少量稀土
          resources.coal = Math.floor(Math.random() * 50) + 20;    // 丘陵中量煤炭
          break;
        case TerrainType.MOUNTAIN:
          maxbase = 40;
          initialPopulation = 100;
          resources.rareMetal = Math.floor(Math.random() * 80) + 40; // 山脉多稀有金属
          resources.rareEarth = Math.floor(Math.random() * 60) + 30; // 山脉多稀土
          resources.ironOre = Math.floor(Math.random() * 40) + 10;   // 山脉少量铁矿
          break;
      }

      regionEntries.push({
        // Fields from Region interface in types.ts
        RegionId: regionId,
        guildId: 'SYSTEM_INIT', // Placeholder string, as guildId is string type
        owner: 'NEUTRAL',       // Placeholder string, as owner is string type
        leader: 'NONE',         // Placeholder string, as leader is string type
        x: x,
        y: y,
        Terrain: terrainType,
        population: initialPopulation,
        maxbase: maxbase,
        resources: resources, // Resource deposits in the ground
        hasRiver: false,      // Default, TODO: implement river generation logic
        isCoastal: false,     // Default, will be calculated in the next loop

        // Other required fields from Region, initialized
        factoryAllocation: {},
        militaryIndustry: 0,
        labor: Math.floor(initialPopulation * 0.4), // Example labor calculation
        Busylabor: 0,
        base: 0,
        Department: 0,
        Constructioncapacity: 0,
        farms: 0, // Simplified initialization, can be refined later
        mfactory: 0,
        busymfactory: 0,
        Mine: 0,
        oilwell: 0,
        busyoilwell: 0,
        steelmill: 0,
        busysteelmill: 0,

        warehouseCapacity: 300, // Default value
        OwarehouseCapacity: 0,
        militarywarehouseCapacity: 300, // Default value
        OmilitarywarehouseCapacity: 0,

        warehouse: { // Stored resources, all initialized to 0
          food: 0, goods: 0, rubber: 0, Mazout: 0, Diesel: 0,
          fuel: 0, Asphalt: 0, Gas: 0, rareMetal: 0, rareEarth: 0,
          coal: 0, ironOre: 0, steel: 0, aluminum: 0, oil: 0,
        },
        militarywarehouse: { // Stored military units/equipment, all initialized to 0
          bomb: 0, car: 0, Tank: 0, AntiTankGun: 0, Artillery: 0,
          AWACS: 0, HeavyFighter: 0, InfantryEquipment: 0, LightFighter: 0,
          StrategicBomber: 0, TacticalBomber: 0, Transportaircraft: 0,
        },

        // Optional fields from Region, initialized to defaults or omitted if undefined is acceptable
        lightIndustry: 0,
        refinery: 0,
        powerPlant: 0,    // As per types.ts, placeholder for future functionality
        concretePlant: 0,
        machineryPlant: 0,
        miningAllocation: {},
        laborAllocation: {},
        // lastHourlyReport is optional and will be undefined if not set here
      });
    }

    // 计算邻近地区和沿海状态
    for (const regionEntry of regionEntries) {
      const { x, y, RegionId } = regionEntry;
      const adjacentIds = [];
      let isCoastal = false;

      const neighbors = [
        { dx: -1, dy: 0 }, { dx: 1, dy: 0 }, // 左右
        { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, // 上下
        { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, // 左上，右上
        { dx: -1, dy: 1 }, { dx: 1, dy: 1 }  // 左下，右下
      ];

      for (const neighbor of neighbors) {
        const nx = x + neighbor.dx;
        const ny = y + neighbor.dy;

        if (nx >= 0 && nx < this.mapSize && ny >= 0 && ny < this.mapSize) {
          const neighborId = nx.toString().padStart(2, '0') + ny.toString().padStart(2, '0');
          adjacentIds.push(neighborId);
          const neighborTerrain = regions.get(neighborId);
          if (neighborTerrain === TerrainType.OCEAN && regionEntry.Terrain !== TerrainType.OCEAN) {
            isCoastal = true;
          }
        }
      }
      regionEntry.adjacentRegionIds = adjacentIds;
      regionEntry.isCoastal = isCoastal; // 设置沿海状态
      // TODO: 实现河流生成逻辑并设置 hasRiver
    }

    // 批量插入或更新数据库
    if (regionEntries.length > 0) {
      try {
        // 先删除所有旧的地区数据，确保从干净的状态开始
        await ctx.database.remove('regiondata', {});
        console.log('已删除所有旧的地区数据。');

        // 分批插入新的地区数据
        const batchSize = 100; // 根据数据库和驱动的限制调整批次大小
        for (let i = 0; i < regionEntries.length; i += batchSize) {
          const batch = regionEntries.slice(i, i + batchSize);
          await ctx.database.upsert('regiondata', batch);
        }
        console.log(`成功初始化 ${regionEntries.length} 个地区到数据库。`);
      } catch (error) {
        console.error('批量初始化地区数据到数据库失败:', error);
        // 可以考虑更细致的错误处理，比如重试或记录失败的批次
      }
    }

    // 打印地形统计信息
    console.log('地形统计:', stats);
  }

  // 生成世界地图的二维数组表示
  public generateWorldMap(): TerrainType[][] {
    const map: TerrainType[][] = [];
    
    for (let y = 0; y < this.mapSize; y++) {
      const row: TerrainType[] = [];
      for (let x = 0; x < this.mapSize; x++) {
        row.push(this.determineTerrainType(x, y));
      }
      map.push(row);
    }
    
    return map;
  }

  // 获取指定坐标的地形类型
  public getTerrainTypeAt(x: number, y: number): TerrainType {
    return this.determineTerrainType(x, y);
  }

  // 获取指定坐标的海拔高度
  public getElevationAt(x: number, y: number): number {
    // 计算到最近山脉的距离
    let minMountainDist = Number.MAX_VALUE;
    for (const range of this.mountainRanges) {
      const dist = this.distToSegment(x, y, range.startX, range.startY, range.endX, range.endY) / range.width;
      minMountainDist = Math.min(minMountainDist, dist);
    }
    
    // 计算到最近大陆中心的距离
    let minContinentDist = Number.MAX_VALUE;
    for (const continent of this.continentCenters) {
      const dx = x - continent.x;
      const dy = y - continent.y;
      const dist = Math.sqrt(dx * dx + dy * dy) / continent.size;
      minContinentDist = Math.min(minContinentDist, dist);
    }
    
    // 基于距离计算海拔
    let elevation = 0;
    
    // 远离大陆 = 低海拔（海洋）
    if (minContinentDist > 1.2) {
      elevation = -0.5 - (minContinentDist - 1.2) * 0.3;
    } else {
      // 陆地海拔基于到大陆中心的距离
      elevation = 0.2 + (1 - minContinentDist) * 0.3;
      
      // 靠近山脉 = 高海拔
      if (minMountainDist < 1.5) {
        const mountainElevation = 0.5 + (1 - minMountainDist / 1.5) * 0.5;
        elevation = Math.max(elevation, mountainElevation);
      }
    }
    
    // 添加噪声使地形更自然
    elevation += this.noise2D(x * 0.1, y * 0.1) * 0.2;
    
    return elevation;
  }

  // 获取指定坐标的湿度
  public getMoistureAt(x: number, y: number): number {
    // 基础湿度使用噪声
    let moisture = this.noise3D(x * 0.08, y * 0.08, 100) * 0.5 + 0.5;
    
    // 靠近海洋的地区湿度更高
    const terrainType = this.determineTerrainType(x, y);
    if (terrainType !== TerrainType.OCEAN) {
      // 检查周围8个格子是否有海洋
      let oceanCount = 0;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          if (this.determineTerrainType(x + dx, y + dy) === TerrainType.OCEAN) {
            oceanCount++;
          }
        }
      }
      
      // 根据周围海洋数量增加湿度
      moisture += oceanCount * 0.05;
    }
    
    // 限制在0-1范围内
    return Math.max(0, Math.min(1, moisture));
  }

  // 获取指定坐标的温度
  public getTemperatureAt(x: number, y: number): number {
    // 基础温度使用纬度（y坐标）
    const latitudeEffect = 1 - Math.abs(y - this.mapSize / 2) / (this.mapSize / 2);
    
    // 高海拔地区温度更低
    const elevation = this.getElevationAt(x, y);
    const elevationEffect = Math.max(0, 1 - elevation * 0.5);
    
    // 结合纬度和海拔效应，加上一些随机性
    let temperature = latitudeEffect * 0.7 + elevationEffect * 0.3;
    temperature += this.noise2D(x * 0.05, y * 0.05) * 0.2;
    
    // 限制在0-1范围内
    return Math.max(0, Math.min(1, temperature));
  }
}