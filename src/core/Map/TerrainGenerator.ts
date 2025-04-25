
import { TerrainType, TerrainTraits } from '../../types';
import { createNoise2D } from 'simplex-noise'; 
import { alea } from 'seedrandom';
import * as fs from 'fs';
import * as path from 'path';

export class TerrainGenerator {
  private noise2D: (x: number, y: number) => number;
  private seed: string;
  
  // 地形对应的emoji
  private terrainEmoji: Record<TerrainType, string> = {
    [TerrainType.OCEAN]: '🌊',
    [TerrainType.PLAIN]: '🏞️',
    [TerrainType.FOREST]: '🌲',
    [TerrainType.HILLS]: '⛰️',
    [TerrainType.MOUNTAIN]: '🏔️',
  };
  
  constructor(seed?: string) {
    this.seed = seed || Math.random().toString();
    // 使用 seedrandom 的 alea 算法创建一个基于种子的随机数生成器
    const prng = alea(this.seed);
    // 使用这个随机数生成器创建噪声函数
    this.noise2D = createNoise2D(prng);
  }
  
  // 从坐标生成噪声值
  private getNoise(x: number, y: number, scale: number = 0.1): number {
    return this.noise2D(x * scale, y * scale);
  }
  
  // 将坐标字符串转换为数字坐标
  private parseCoordinates(regionId: string): { x: number, y: number } {
    if (!/^\d{4}$/.test(regionId)) {
      throw new Error('地区编号必须为4位数字');
    }
    
    const x = parseInt(regionId.substring(0, 2), 10);
    const y = parseInt(regionId.substring(2, 4), 10);
    
    return { x, y };
  }
  
  // 根据噪声值确定地形类型
  private determineTerrainType(elevation: number, moisture: number, temperature: number): TerrainType {
    // 海洋判定 - 将阈值从-0.3调整为-0.1，减少海洋面积
    if (elevation < -0.1) return TerrainType.OCEAN;
    
    // 陆地地形判定
    if (elevation > 0.6) {
      return TerrainType.MOUNTAIN;
    } else if (elevation > 0.3) {
      return TerrainType.HILLS;
    } else {
      // 平地类型根据湿度和温度决定 - 将森林的湿度阈值从0.6降低到0.4，增加森林面积
      if (moisture > 0.4) {
        return TerrainType.FOREST;
      } else {
        return TerrainType.PLAIN;
      }
    }
  }
  
  // 生成地区特质
  public generateTerrainTraits(regionId: string): TerrainTraits {
    const { x, y } = this.parseCoordinates(regionId);
    
    // 使用不同频率和偏移的噪声来生成各种特性
    // 调整scale值，使地形变化更加缓慢，形成更大的连续区域
    const elevation = this.getNoise(x, y, 0.03); // 从0.05改为0.03
    const moisture = this.getNoise(x + 100, y + 100, 0.03); // 从0.04改为0.03
    const temperature = this.getNoise(x + 200, y + 200, 0.02); // 从0.03改为0.02
    
    const terrainType = this.determineTerrainType(elevation, moisture, temperature);
    
    // 根据地形类型调整其他特性
    let forestCoverage = 0;
    let buildingSlots = 0;
    let fertility = 0;
    const resourceMultiplier: Record<string, number> = {};
    
    switch (terrainType) {
      case TerrainType.OCEAN:
        buildingSlots = 5;
        resourceMultiplier.fish = 1.5;
        break;
      case TerrainType.PLAIN:
        forestCoverage = Math.max(0, Math.min(30, (moisture + 0.3) * 50));
        buildingSlots = 20;
        fertility = 0.8;
        break;
      case TerrainType.FOREST:
        forestCoverage = Math.max(50, Math.min(90, (moisture + 0.6) * 60));
        buildingSlots = 15;
        fertility = 0.5;
        resourceMultiplier.wood = 1.8;
        break;
      case TerrainType.HILLS:
        forestCoverage = Math.max(10, Math.min(60, (moisture + 0.3) * 40));
        buildingSlots = 12;
        fertility = 0.3;
        resourceMultiplier.ironOre = 1.3;
        resourceMultiplier.coal = 1.2;
        break;
      case TerrainType.MOUNTAIN:
        forestCoverage = Math.max(0, Math.min(30, (moisture + 0.2) * 20));
        buildingSlots = 8;
        fertility = 0.1;
        resourceMultiplier.ironOre = 1.8;
        resourceMultiplier.coal = 1.5;
        resourceMultiplier.rareEarth = 1.4;
        break;
    }
    
    // 添加一些随机变化，但保持在合理范围内
    forestCoverage = Math.round(forestCoverage + (this.getNoise(x + 300, y + 300, 0.1) * 10));
    buildingSlots = Math.max(5, Math.round(buildingSlots + (this.getNoise(x + 400, y + 400, 0.1) * 3)));
    
    return {
      terrainType,
      forestCoverage,
      buildingSlots,
      fertility,
      resourceMultiplier
    };
  }
  
  // 生成一个区域的完整描述
  public generateTerrainDescription(regionId: string): string {
    const traits = this.generateTerrainTraits(regionId);
    
    return `
=====[地区特质]=====
□地区编号：${regionId}
■建筑位：${traits.buildingSlots}
■主要地形：${traits.terrainType}
□森林覆盖率：${traits.forestCoverage}%
□土地肥沃度：${Math.round(traits.fertility * 100)}%
`.trim();
  }
  
  // 生成整个80*80的地图
  public generateFullMap(seed?: string): TerrainType[][] {
    // 如果提供了新种子，则重新初始化噪声函数
    if (seed) {
      this.seed = seed;
      const prng = alea(this.seed);
      this.noise2D = createNoise2D(prng);
    }
    
    const mapSize = 80;
    const map: TerrainType[][] = [];
    
    for (let y = 0; y < mapSize; y++) {
      const row: TerrainType[] = [];
      for (let x = 0; x < mapSize; x++) {
        // 生成坐标ID，确保是4位数
        const xStr = x.toString().padStart(2, '0');
        const yStr = y.toString().padStart(2, '0');
        const regionId = xStr + yStr;
        
        // 使用已有的方法获取地形
        const traits = this.generateTerrainTraits(regionId);
        row.push(traits.terrainType);
      }
      map.push(row);
    }
    
    return map;
  }
  
}
