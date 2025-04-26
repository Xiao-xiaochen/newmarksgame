import { Context } from 'koishi';
import { createNoise2D } from 'simplex-noise';
import { alea } from 'seedrandom';
import { TerrainType, Region } from '../../types';

export function ResourceCreate(ctx: Context) {
  ctx.command('勘探地区资源储量').alias('勘探地区资源')
    .action(async ({ session }) => {
      if (!session) {
        return '会话不存在';
      }

      const guildId = session?.guildId || '未知频道';
      const username = session.author?.name || '未知用户';
      const format = (num: number) => num.toLocaleString();

      try {
        let Regioninfo = (await ctx.database.get('regiondata', { guildId: guildId })) as Region[];
        if (!Regioninfo || Regioninfo.length === 0) {
          return `
===[地区资源储量]===
${username} 同志！
地区尚未被探索！
请发送：查看地区
`.trim();
        }

        const regiondata = Regioninfo[0];

        if (!regiondata.resources?.ironOre) {
          // 使用噪声算法生成资源
          const seed = guildId + Date.now().toString();
          const prng = alea(seed);
          const noise2D = createNoise2D(prng);
          
          // 从地区ID提取坐标
          const regionId = guildId.replace(/\D/g, '').substring(0, 4).padStart(4, '0');
          const x = parseInt(regionId.substring(0, 2), 10);
          const y = parseInt(regionId.substring(2, 2), 10);
          
          // 生成基础噪声值
          const baseNoise = (nx: number, ny: number, scale = 0.1, offset = 0) => 
            noise2D((x + nx) * scale, (y + ny) * scale + offset);
          
          // 根据地形特征调整资源生成
          const terrainMultipliers = {
            [TerrainType.MOUNTAIN]: {
              rareMetal: 2.0,
              rareEarth: 1.8,
              ironOre: 1.5,
              coal: 0.8,
              aluminum: 0.3,
              oil: 0.1
            },
            [TerrainType.HILLS]: {
              rareMetal: 0.7,
              rareEarth: 0.6,
              ironOre: 1.3,
              coal: 1.5,
              aluminum: 0.8,
              oil: 0.4
            },
            [TerrainType.PLAIN]: {
              rareMetal: 0.2,
              rareEarth: 0.3,
              ironOre: 0.5,
              coal: 0.6,
              aluminum: 1.2,
              oil: 1.5
            },
            [TerrainType.FOREST]: {
              rareMetal: 0.3,
              rareEarth: 0.5,
              ironOre: 0.7,
              coal: 0.9,
              aluminum: 0.6,
              oil: 0.7
            },
            [TerrainType.OCEAN]: {
              rareMetal: 0.1,
              rareEarth: 0.1,
              ironOre: 0.1,
              coal: 0.1,
              aluminum: 0.1,
              oil: 1.0
            }
          };
          
          // 获取主要地形类型
          const mainTerrainType = Object.entries(regiondata.terrain || {})
            .sort((a, b) => b[1] - a[1])[0][0];
          
          // 将地形名称转换为TerrainType枚举
          const terrainTypeMap: Record<string, TerrainType> = {
            'mountain': TerrainType.MOUNTAIN,
            'hill': TerrainType.HILLS,
            'plain': TerrainType.PLAIN,
            'forest': TerrainType.FOREST,
            'river': TerrainType.OCEAN
          };
          
          const terrainType = terrainTypeMap[mainTerrainType] || TerrainType.PLAIN;
          const multipliers = terrainMultipliers[terrainType];
          
          // 生成资源数量，使用噪声函数和地形修正
          const generateResource = (resourceType: string, baseMin: number, baseMax: number, baseAvg: number) => {
            const noiseValue = (baseNoise(0, 0, 0.05, Object.keys(multipliers).indexOf(resourceType) * 100) + 1) / 2;
            const baseAmount = baseMin + noiseValue * (baseMax - baseMin);
            return Math.round(baseAmount * (multipliers[resourceType as keyof typeof multipliers] || 1.0));
          };
          
          const newResources: Region['resources'] = {
            rareMetal: generateResource('rareMetal', 0, 60000, 30000),
            rareEarth: generateResource('rareEarth', 0, 30000, 15000),
            ironOre: generateResource('ironOre', 30000, 150000, 80000),
            coal: generateResource('coal', 50000, 250000, 120000),
            aluminum: generateResource('aluminum', 0, 100000, 30000),
            oil: generateResource('oil', 0, 100000, 60000),
          };
          
          await ctx.database.set('regiondata', { guildId }, { resources: newResources });
          return `
===[地区资源储量]===
地区：${guildId}
主要地形：${terrainType}
资源单位：（吨）
■稀土资源：${format(newResources.rareEarth)}
■稀有金属：${format(newResources.rareMetal)}
■铁矿：${format(newResources.ironOre)}
■煤矿：${format(newResources.coal)}
■铝矿：${format(newResources.aluminum)}
■原油：${format(newResources.oil)}
`.trim();
        } else {
          return `
===[地区资源储量]===
${username} 同志！
该地区已经勘探过资源了！
`.trim();
        }
      } catch (error) {
        console.error('查询地区资源时出错:', error);
        return '查询地区资源时出错';
      }
    });
}
