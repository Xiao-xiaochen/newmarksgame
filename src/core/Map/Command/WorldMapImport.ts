import { Context } from 'koishi'
import * as fs from 'fs'
import * as path from 'path'
import { TerrainType, Region } from '../../../types' // 确保路径正确
// 可能需要从 RegionInitializer 或 RegionManager 导入计算初始值的逻辑，或者在这里重新实现

// 地形名称到枚举的映射
const terrainNameToEnum: Record<string, TerrainType> = {
  '海洋': TerrainType.OCEAN,
  '平原': TerrainType.PLAIN,
  '森林': TerrainType.FOREST,
  '丘陵': TerrainType.HILLS,
  '山地': TerrainType.MOUNTAIN,
};

// 计算初始值的辅助函数 (可以从 RegionInitializer 或 Region 提取/复用)
function calculateInitialValues(terrainType: TerrainType): { maxbase: number, initialPopulation: number, resources: Region['resources'] } {
  let maxbase = 0;
  let initialPopulation = 0;
  const resources: Region['resources'] = {
    rareMetal: 0, rareEarth: 0, coal: 0, ironOre: 0, aluminum: 0, oil: 0
  };

  switch (terrainType) {
    case TerrainType.OCEAN:
      maxbase = 0; initialPopulation = 0;
      break;
    case TerrainType.MOUNTAIN:
      maxbase = 20; initialPopulation = Math.floor(50 + Math.random() * 50);
      resources.rareMetal = Math.floor(Math.random() * 60000);
      resources.rareEarth = Math.floor(Math.random() * 30000);
      resources.ironOre = Math.floor(Math.random() * 150000) + 30000;
      break;
    case TerrainType.HILLS:
      maxbase = 40; initialPopulation = Math.floor(100 + Math.random() * 100);
      resources.coal = Math.floor(Math.random() * 200000) + 50000;
      resources.ironOre = Math.floor(Math.random() * 100000) + 20000;
      break;
    case TerrainType.FOREST:
      maxbase = 60; initialPopulation = Math.floor(150 + Math.random() * 150);
      break;
    case TerrainType.PLAIN:
      maxbase = 80; initialPopulation = Math.floor(200 + Math.random() * 200);
      resources.oil = Math.floor(Math.random() * 100000);
      resources.aluminum = Math.floor(Math.random() * 80000) + 20000;
      break;
  }
  return { maxbase, initialPopulation, resources };
}


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

        const { maxbase, initialPopulation, resources } = calculateInitialValues(terrainType);

        // 准备要插入/更新的数据
        const regionData: Partial<Region> = {
          RegionId: regionId,
          guildId: regionId, // 假设 guildId 就是 RegionId
          Terrain: terrainType,
          maxbase: maxbase,
          population: initialPopulation,
          resources: resources,
          // 设置其他字段的默认值
          owner: '',
          leader: '',
          labor: Math.floor(initialPopulation * 0.6), // 简单计算初始劳动力
          base: 0,
          Department: 0,
          farms: Math.max(1, Math.floor((initialPopulation / 30000) * ( (terrainType === TerrainType.PLAIN ? 0.8 : terrainType === TerrainType.FOREST ? 0.5 : terrainType === TerrainType.HILLS ? 0.3 : 0.1) * 0.7 + 0.3))), // 简化的农场计算
        };
        regionsToUpsert.push(regionData);
        parsedCount++;
      }

      if (regionsToUpsert.length === 0) {
        return '错误：未能从 Map.html 中解析出任何有效的地区数据。请检查文件内容和格式。';
      }

      try {
        // 分批次插入/更新数据库，避免一次性操作大量数据
        const batchSize = 500;
        for (let i = 0; i < regionsToUpsert.length; i += batchSize) {
          const batch = regionsToUpsert.slice(i, i + batchSize);
          await ctx.database.upsert('regiondata', batch, 'guildId'); // 使用 guildId 作为查找键
          session.send(`已处理 ${Math.min(i + batchSize, regionsToUpsert.length)} / ${regionsToUpsert.length} 个地区...`);
        }

        // 清理不存在于 HTML 中的旧数据 (可选，但推荐)
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