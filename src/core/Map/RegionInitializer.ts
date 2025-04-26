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
    const batch = [];
    
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
      
      // 创建地区基本数据
      const regionData: Partial<Region> = {
        RegionId: regionId,
        resources: {
          rareMetal: 0,
          rareEarth: 0,
          coal: 0,
          ironOre: 0,
          aluminum: 0,
          oil: 0
        },
        terrain: {
          mountain: terrainType === TerrainType.MOUNTAIN ? 0.8 : (terrainType === TerrainType.HILLS ? 0.3 : 0.1),
          hill: terrainType === TerrainType.HILLS ? 0.7 : (terrainType === TerrainType.MOUNTAIN ? 0.4 : 0.2),
          plain: terrainType === TerrainType.PLAIN ? 0.8 : (terrainType === TerrainType.FOREST ? 0.4 : 0.2),
          river: this.noise2D(parseInt(regionId.substring(0, 2)) * 0.1, parseInt(regionId.substring(2, 4)) * 0.1) * 0.5 + 0.5,
          forest: terrainType === TerrainType.FOREST ? 0.8 : (terrainType === TerrainType.MOUNTAIN ? 0.1 : 0.3)
        }
      };
      
      // 根据地形类型初始化资源
      if (terrainType === TerrainType.MOUNTAIN) {
        regionData.resources.rareMetal = Math.floor(Math.random() * 60000);
        regionData.resources.rareEarth = Math.floor(Math.random() * 30000);
        regionData.resources.ironOre = Math.floor(Math.random() * 150000) + 30000;
      } else if (terrainType === TerrainType.HILLS) {
        regionData.resources.coal = Math.floor(Math.random() * 200000) + 50000;
        regionData.resources.ironOre = Math.floor(Math.random() * 100000) + 20000;
      } else if (terrainType === TerrainType.PLAIN) {
        regionData.resources.oil = Math.floor(Math.random() * 100000);
        regionData.resources.aluminum = Math.floor(Math.random() * 80000) + 20000;
      }
      
      batch.push(regionData);
      
      // 每500条数据批量插入一次
      if (batch.length >= 500) {
        await ctx.database.upsert('regiondata', batch);
        batch.length = 0;
      }
    }
    
    // 插入剩余数据
    if (batch.length > 0) {
      await ctx.database.upsert('regiondata', batch);
    }
    
    console.log('地区初始化完成，地形分布统计：', stats);
    return;
  }
  
  // 生成世界地图数据
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