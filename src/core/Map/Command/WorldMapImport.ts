import { Context } from 'koishi'
import * as fs from 'fs'
import * as path from 'path'
import { TerrainType, Region } from '../../../types' // 确保路径正确
import { TRandom } from '../../../utils/Random'; // <--- 导入 TRandom

// 地形名称到枚举的映射
const terrainNameToEnum: Record<string, TerrainType> = {
  '海洋': TerrainType.OCEAN,
  '平原': TerrainType.PLAIN,
  '森林': TerrainType.FOREST,
  '丘陵': TerrainType.HILLS,
  '山地': TerrainType.MOUNTAIN,
};

// 计算初始值的辅助函数 (只计算 maxbase 和 population)
function calculateBaseValues(terrainType: TerrainType): { maxbase: number, initialPopulation: number } {
  let maxbase = 0;
  let initialPopulation = 0;

  switch (terrainType) {
    case TerrainType.OCEAN:
      maxbase = 0; initialPopulation = 0;
      break;
    case TerrainType.MOUNTAIN:
      // 人口基数调回万单位，之前可能是笔误写成了个位数
      maxbase = 20; initialPopulation = Math.floor(50000 + Math.random() * 50000);
      break;
    case TerrainType.HILLS:
      maxbase = 40; initialPopulation = Math.floor(100000 + Math.random() * 100000);
      break;
    case TerrainType.FOREST:
      maxbase = 60; initialPopulation = Math.floor(150000 + Math.random() * 150000);
      break;
    case TerrainType.PLAIN:
      maxbase = 80; initialPopulation = Math.floor(200000 + Math.random() * 300000);
      break;
  }
  // 只返回基础建设和人口
  return { maxbase, initialPopulation };
}

// 定义资源的基础范围和模式 (min, max, mode) for TRandom (单位：吨)
const resourceParams = {
    coal:      { min: 50000, max: 250000, mode: 120000 }, // 煤矿
    ironOre:   { min: 30000, max: 150000, mode: 80000 },  // 铁矿
    oil:       { min: 0,     max: 100000, mode: 60000 },  // 原油
    rareMetal: { min: 0,     max: 60000,  mode: 30000 },  // 稀有金属
    rareEarth: { min: 0,     max: 30000,  mode: 15000 },  // 稀土
    aluminum:  { min: 0,     max: 100000, mode: 30000 },  // 铝矿
};

// 定义地形对资源储量的修正系数 (乘数)
const terrainResourceModifiers: Record<TerrainType, Record<keyof typeof resourceParams, number>> = {
    [TerrainType.OCEAN]:    { coal: 0, ironOre: 0, oil: 0.5, rareMetal: 0, rareEarth: 0, aluminum: 0 }, // 海洋可能有少量石油
    [TerrainType.PLAIN]:    { coal: 0.5, ironOre: 0.5, oil: 1.5, rareMetal: 0.3, rareEarth: 0.2, aluminum: 1.2 }, // 平原石油、铝较多
    [TerrainType.FOREST]:   { coal: 0.8, ironOre: 0.6, oil: 0.8, rareMetal: 0.5, rareEarth: 0.4, aluminum: 0.7 }, // 森林资源较均衡
    [TerrainType.HILLS]:    { coal: 1.8, ironOre: 1.5, oil: 0.4, rareMetal: 0.8, rareEarth: 0.7, aluminum: 0.5 }, // 丘陵煤、铁较多
    [TerrainType.MOUNTAIN]: { coal: 1.2, ironOre: 2.0, oil: 0.1, rareMetal: 2.5, rareEarth: 2.0, aluminum: 0.3 }, // 山地铁、稀有资源多
};


export function WorldMapImport(ctx: Context) {
  ctx.command('从HTML初始化地图', '根据 Map.html 文件初始化数据库地图数据', { authority: 4 }) // 设置管理员权限
    .action(async ({ session }) => {
      session.send('开始从 Map.html 初始化地图数据，请稍候...');

      // 修正路径计算：从 __dirname (...\Command) 上一级 (...\Map) 直接找 Map.html
      const mapHtmlPath = path.resolve(__dirname, '..', 'Map.html'); 
      let htmlContent: string;

      try {
        htmlContent = fs.readFileSync(mapHtmlPath, 'utf8');
      } catch (error) {
        console.error(`读取 Map.html 失败: ${mapHtmlPath}`, error);
        return `错误：无法读取地图文件 ${mapHtmlPath}。`;
      }

      // 使用正则表达式解析 HTML (如果结构固定)
      // 这个正则匹配 <div class="map-cell" style="..." title="坐标: 0000, 地形: 山地"></div> 这样的行
      const regex = /<div class="map-cell" style=".*?" title="坐标: (\d{4}), 地形: (.*?)">/g;
      let match;
      const regionsToUpsert: Partial<Region>[] = [];
      const regionIdsFound = new Set<string>();
      let parsedCount = 0;

      while ((match = regex.exec(htmlContent)) !== null) {
        const regionId = match[1]; // 坐标，例如 "0000"
        const terrainName = match[2]; // 地形名称，例如 "山地"

        if (regionIdsFound.has(regionId)) {
            console.warn(`HTML 中发现重复的地区 ID: ${regionId}，将跳过重复项。`);
            continue;
        }
        regionIdsFound.add(regionId);

        const terrainType = terrainNameToEnum[terrainName];

        if (terrainType === undefined) {
          console.warn(`未知的地形名称 "${terrainName}" 在坐标 ${regionId}`);
          continue; // 跳过无法识别的地形
        }

        // 1. 计算基础建设和人口
        const { maxbase, initialPopulation } = calculateBaseValues(terrainType);

        // 2. 计算资源储量
        const resources: Region['resources'] = {
          coal: 0, ironOre: 0, oil: 0, rareMetal: 0, rareEarth: 0, aluminum: 0
        };

        // 如果不是海洋，则计算资源
        if (terrainType !== TerrainType.OCEAN) {
            const modifiers = terrainResourceModifiers[terrainType];
            for (const resKey in resourceParams) {
                const key = resKey as keyof typeof resourceParams;
                const params = resourceParams[key];
                const modifier = modifiers[key];

                // 使用 TRandom 生成基础值，偏向低储量
                const baseAmount = TRandom(params.min, params.max, params.mode);
                // 应用地形修正系数，并确保结果非负
                resources[key] = Math.max(0, Math.floor(baseAmount * modifier));
            }
        } else {
            // 海洋特殊处理，只可能有石油
            const oilParams = resourceParams.oil;
            const oilModifier = terrainResourceModifiers[TerrainType.OCEAN].oil;
            const baseOil = TRandom(oilParams.min, oilParams.max, oilParams.mode);
            resources.oil = Math.max(0, Math.floor(baseOil * oilModifier));
        }


        // 准备要插入/更新的数据
        const xCoord = parseInt(regionId.substring(0, 2), 10);
        const yCoord = parseInt(regionId.substring(2, 4), 10);

        const regionData: Partial<Region> = {
          RegionId: regionId,
          guildId: regionId, // 使用 RegionId 作为 guildId 进行 upsert 查找
          owner: '',
          leader: '',
          Terrain: terrainType,
          x: xCoord,
          y: yCoord,
          population: initialPopulation,
          maxbase: maxbase,
          base: 0,
          labor: Math.floor(initialPopulation * 0.6), // 初始劳动力
          Busylabor: 0, // 初始繁忙劳动力
          Department: 0,
          Constructioncapacity: 0, // 初始建设能力
          farms: Math.max(1, Math.floor((initialPopulation / 30000) * ( (terrainType === TerrainType.PLAIN ? 0.8 : terrainType === TerrainType.FOREST ? 0.5 : terrainType === TerrainType.HILLS ? 0.3 : 0.1) * 0.7 + 0.3))),
          resources: resources, // 地下资源
          
          // 新增字段，确保符合 Region 接口
          factoryAllocation: {},
          militaryIndustry: 0,
          adjacentRegionIds: [], // HTML导入时通常不包含此信息，默认为空
          isCoastal: false,      // HTML导入时通常不包含此信息，默认为false
          hasRiver: false,       // HTML导入时通常不包含此信息，默认为false
          lastHourlyReport: '',

          mfactory: 0,
          busymfactory: 0,
          Mine: 0,
          oilwell: 0,
          busyoilwell: 0,
          steelmill: 0,
          busysteelmill: 0,
          lightIndustry: 0,
          refinery: 0,
          powerPlant: 0,
          concretePlant: 0,
          machineryPlant: 0,
          miningAllocation: {},
          laborAllocation: {},

          warehouseCapacity: 300, // 默认仓库容量
          OwarehouseCapacity: 0,
          militarywarehouseCapacity: 300, // 默认军事仓库容量
          OmilitarywarehouseCapacity: 0,

          warehouse: {
            food: 0,
            goods: 0,
            rubber: 0,
            Mazout: 0,
            Diesel: 0,
            fuel: 0,
            Asphalt: 0,
            Gas: 0,
            rareMetal: 0,
            rareEarth: 0,
            coal: 0,
            ironOre: 0,
            steel: 0,
            aluminum: 0,
            oil: 0,
          },
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
            Transportaircraft: 0,
          },
        };
        regionsToUpsert.push(regionData);
        parsedCount++;
      }

      if (regionsToUpsert.length === 0) {
        return '错误：未能从 Map.html 中解析出任何有效的地区数据。请检查文件内容和格式。';
      }

      try {
        // 分批次插入/更新数据库
        const batchSize = 500;
        for (let i = 0; i < regionsToUpsert.length; i += batchSize) {
          const batch = regionsToUpsert.slice(i, i + batchSize);
          // 注意：upsert 的第三个参数应该是用于查找的键名数组，这里用 guildId
          await ctx.database.upsert('regiondata', batch, ['guildId']);
          session.send(`已处理 ${Math.min(i + batchSize, regionsToUpsert.length)} / ${regionsToUpsert.length} 个地区...`);
        }

        // 清理不存在于 HTML 中的旧数据
        const allDbRegions = await ctx.database.get('regiondata', {});
        const regionsToDelete = allDbRegions.filter(dbRegion => !regionIdsFound.has(dbRegion.guildId));
        if (regionsToDelete.length > 0) {
            const idsToDelete = regionsToDelete.map(r => r.guildId);
            await ctx.database.remove('regiondata', { guildId: { $in: idsToDelete } });
            session.send(`已清理 ${regionsToDelete.length} 个不存在于 HTML 中的旧地区数据。`);
        }

        return `地图数据初始化完成！成功从 Map.html 处理了 ${parsedCount} 个地区的数据并更新到数据库。`;
      } catch (dbError) {
        console.error('数据库操作失败:', dbError);
        return '错误：更新数据库时发生错误，请查看控制台日志。';
      }
    });
}
