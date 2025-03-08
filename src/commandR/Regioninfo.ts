import { Context } from 'koishi'
import { Region, TerrainFeatures, ResourceReserves } from '../types'
import { Random } from '../utils/Random'
import { Terrain } from '../utils/Terrain'

export function apply(ctx: Context) {
  ctx.command('查看地区', '查看地区信息')
    .action(async ({ session }) => {
      const groupId = session?.guildId!

      if (!groupId) {
        return '请在群聊中使用此命令'
      }

      let region = await ctx.database.get('region', { groupId })

      if (!region || region.length === 0) {
        // 注册地区
        const userId = session?.userId!;
        const terrainFeatures = Terrain.generateTerrainFeatures(ctx);
        console.log('[Regioninfo] Generated terrainFeatures:', terrainFeatures); // Log: Generated terrainFeatures

        const members = await ctx.bots[0].getGuildMemberList(groupId);
        const baseInfra = members.data.length * 5;
        const population = members.data.length * 10000;
        console.log('[Regioninfo] baseInfra:', baseInfra, 'population:', population); // Log: baseInfra and population

        // 计算地形调整后的建筑位
        const mountainInfra = terrainFeatures.mountain * baseInfra * 0.5 / 100;
        const hillInfra = terrainFeatures.hill * baseInfra * 0.7 / 100;
        const plainInfra = terrainFeatures.plain * baseInfra / 100;
        const terrainAdjusted = mountainInfra + hillInfra + plainInfra;

        // 应用森林覆盖率调整
        const finalInfra = Math.round(terrainAdjusted * (1 - terrainFeatures.forest / 100));

        // 生成初始资源（示例：铁矿）
        const ironBase = Random.triangular(30000, 80000, 150000);
        const iron = Math.round(ironBase * (
          (terrainFeatures.mountain / 100 * 0.5) +  // 山地铁矿系数0.5
          (terrainFeatures.plain / 100 * 1.2)          // 平原铁矿系数1.2
        ));
        const coalBase = Random.triangular(50000, 120000, 250000);
        const coal = Math.round(coalBase * (
          (terrainFeatures.hill / 100 * 1.5) + // 丘陵煤矿系数1.5
          (terrainFeatures.plain / 100 * 0.8)  // 平原煤矿系数0.8
        ));

        const farmland = Math.floor(population / 10000);
        const factory = Math.floor(population / 10000);

        const resourceReserves: ResourceReserves = {
          rareEarth: 0,
          rareMetal: 0,
          ironOre: iron,
          coal: coal,
          crudeOil: 0,
          aluminum: 0,
          oil: 0,
        }

        const regionDataForCreation = { // Create regionDataForCreation without maxInfrastructure
          regionId: groupId,
          groupId: groupId,
          ownerId: userId,
          name: '未命名地区',
          population: population,
          infrastructure: finalInfra,
          farmland: farmland,
          factory: factory,
          resource: resourceReserves,
          terrain: terrainFeatures,
          labor: 0,
          leaderUserId: userId,
          warehouseCapacity: 10000,
          primaryIndustryCount: farmland,
          secondaryIndustryCount: factory,
          garrison: 0,
          maxInfrastructure: baseInfra
        };
        console.log('[Regioninfo] Region data for creation:', regionDataForCreation); // Log: Before creating region

        const createdRegion = await ctx.database.create('region', regionDataForCreation as any); // Create region
        console.log('[Regioninfo] Region created successfully, ID:', createdRegion.id); // Log: Region created successfully

        console.log('[Regioninfo] Region updated with maxInfrastructure, maxInfrastructure:', baseInfra); // Log: Region updated with maxInfrastructure

        return '地区注册成功！'
      } else {
        // 查看地区信息
        const regionData = region[0];
        console.log('[Regioninfo] Retrieved region data:', regionData); // Log: Retrieved region data
        return `=====[地区信息]=====
■控制方：${regionData.name}
■领导人：${regionData.ownerId}
□地区人口：${regionData.population}
□基础设施：${regionData.infrastructure}/${regionData.maxInfrastructure}
□地区仓库：${regionData.warehouseCapacity}
□第一产业数量：${regionData.primaryIndustryCount}
□第二产业数量：${regionData.secondaryIndustryCount}
■地区驻军：${regionData.garrison}`
      }
    })
}
