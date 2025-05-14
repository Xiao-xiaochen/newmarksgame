import { Context } from 'koishi';
import { TerrainType, Region } from '../../types';
import { RegionInitializer } from './RegionInitializer';
import { RegionManager } from './Region';
import * as fs from 'fs';
import * as path from 'path';
import {Config} from '../../Schema'
import {TerrainRenderer} from './TerrainRenderer';


/**
 * 世界地图单例类 - 管理游戏中的唯一地图实例
 */
export class WorldMap {
  private static instance: WorldMap;
  private initialized: boolean = false;
  private mapData: TerrainType[][] | null = null;
  private regionInitializer: RegionInitializer;
  private regionManager: RegionManager;
  private mapFilePath: string = '';
  private seed:string='';
  private constructor(ctx:Context) {
    // 使用固定种子确保地图一致性
    
    let config=ctx.config;
    this.seed = config.mapSeed;
    this.regionInitializer = new RegionInitializer(this.seed);
    this.regionManager = new RegionManager(this.seed);
  }
  
  /**
   * 获取WorldMap单例实例
   */
  public static getInstance(ctx:Context): WorldMap {
    if (!WorldMap.instance) {
      WorldMap.instance = new WorldMap(ctx);
    }
    return WorldMap.instance;
  }
  
  /**
   * 检查地图是否已初始化
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * 获取地图数据
   */
  public getMapData(): TerrainType[][] {
    if (!this.mapData) {
      // 如果内存中没有地图数据，尝试从文件加载
      this.loadMapFromFile();
    }
    
    // 如果仍然没有地图数据，生成一个新的（但不保存到数据库）
    if (!this.mapData) {
      console.log('警告：地图数据不存在，生成临时地图数据（未保存到数据库）');
      this.mapData = this.regionInitializer.generateWorldMap();
    }
    
    return this.mapData;
  }
  
  /**ish
   * 从文件加载地图数据
   */
  private loadMapFromFile(): boolean {
    try {
      if (!this.mapFilePath) {
        return false;
      }
      
      if (fs.existsSync(this.mapFilePath)) {
        const mapJson = fs.readFileSync(this.mapFilePath, 'utf8');
        this.mapData = JSON.parse(mapJson);
        this.initialized = true;
        return true;  
      }
    } catch (error) {
      console.error('加载地图文件失败:', error);
    }
    return false;
  }
  
  /**
   * 初始化世界地图（只应该被调用一次）
   */
  public async initializeWorld(ctx: Context): Promise<boolean> {
    if (this.initialized) {
      console.log('世界地图已经初始化，跳过初始化过程');
      return false;
    }

    try {
      // 初始化所有地区数据
      await this.regionInitializer.initializeAllRegionsInDatabase(ctx);
      console.log(`尝试以seed:${this.seed}生成世界`);
      // 生成地图数据
      this.mapData = this.regionInitializer.generateWorldMap();
      
      // 保存地图数据到文件
      const mapDataDir = path.resolve(ctx.baseDir, 'data');
      if (!fs.existsSync(mapDataDir)) {
        fs.mkdirSync(mapDataDir, { recursive: true });
      }
      
      this.mapFilePath = path.join(mapDataDir, 'world_map.json');
      fs.writeFileSync(this.mapFilePath, JSON.stringify(this.mapData), 'utf8');
      var renderer = new TerrainRenderer();
      renderer.saveHtmlToFile(renderer.generateMapHtml(this.mapData), path.resolve(__dirname, '.', 'Map.html'));
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('初始化世界地图失败:', error);
      return false;
    }
  }
  
  /**
   * 获取指定地区的地形特征
   */
  public getTerrainTraits(regionId: string) {
    return this.regionManager.getTerrainTraits(regionId);
  }
  

  
  /**
   * 初始化地区数据
   */
  public initializeRegionData(regionId: string, guildId: string, owner: string, leader: string, population: number): Region {
    return this.regionManager.initializeRegionData(regionId, guildId, owner, leader, population);
  }
  
  /**
   * 获取RegionInitializer实例
   */
  public getRegionInitializer(): RegionInitializer {
    return this.regionInitializer;
  }
  
  /**
   * 获取RegionManager实例
   */
  public getRegionManager(): RegionManager {
    return this.regionManager;
  }

  public resetInitialization(): void {
    this.initialized = false;
    this.mapData = null;
    this.mapFilePath = '';
    console.log('已重置世界地图初始化状态');
  }
}