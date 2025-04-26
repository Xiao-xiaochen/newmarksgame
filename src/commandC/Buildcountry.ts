//src\commandP\Buildcountry.ts

import { Context, Random, User } from 'koishi'
import { WorldMap } from '../core/Map/MapCore'; // 导入 WorldMap
import { Region, TerrainType } from '../types'; // 导入 Region 类型 (如果需要明确类型)

// Helper function to calculate distance between two regions (Chebyshev distance)
function calculateDistance(regionId1: string, regionId2: string): number {
  if (!/^\d{4}$/.test(regionId1) || !/^\d{4}$/.test(regionId2)) {
    console.warn(`Invalid region ID format for distance calculation: ${regionId1}, ${regionId2}`);
    return Infinity; // Return a large distance for invalid IDs
  }
  const x1 = parseInt(regionId1.substring(0, 2), 10);
  const y1 = parseInt(regionId1.substring(2, 4), 10);
  const x2 = parseInt(regionId2.substring(0, 2), 10);
  const y2 = parseInt(regionId2.substring(2, 4), 10);

  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}


export function Buildcountry(ctx: Context) {
  ctx.command('组建国家 [countryName:string]')
    .action(async ( { session }, countryName ) => {
      if (!session) {
        return '会话不存在'
      }
      const username = session.author?.name || '未知用户'
      const userId = session.userId
      if (!userId) {
        return '无法获取用户ID'
      }
      
      // 如果没有提供国家名称，提示用户
      if (!countryName) {
        return `
======[国家]=====
${username} 同志！
请提供国家名称。
例如：组建国家 共和国
`.trim()
      }
      
      try {
        // 检查用户是否已注册
        const userInfo = await ctx.database.get('userdata', { userId: userId }) 
        if (!userInfo || userInfo.length === 0) {
          return `
======[国家]=====
${username} 同志！
您尚未注册！请先发送"阅读报告"进行注册。
`.trim()
        }
        // 检查用户是否已经有国家
        const countryInfo = await ctx.database.get('country', { leaderId: userId })
        if (countryInfo && countryInfo.length > 0) {
          return `
======[国家]=====
${username} 同志！
您已经在一个国家里了：
${countryInfo[0].name}
`.trim()
        }
        
        // 检查国家名称是否已被使用
        const existingCountry = await ctx.database.get('country', { name: countryName })
        if (existingCountry && existingCountry.length > 0) {
          return `
======[国家]=====
${username} 同志！
国家名称已被使用!
请选择其他名称。
`.trim()
        }
        
        // --- 开始分配地区 ---
        let assignedRegionId: string | null = null;
        try {
          const worldMap = WorldMap.getInstance();
          // 1. 获取所有地区数据
          const allRegions = await ctx.database.get('regiondata', {});
          // 1.5 获取所有现有国家的首都位置
          const allCountries = await ctx.database.get('country', {});
          const existingCapitals = allCountries
            .map(c => c.capitalRegionId)
            .filter((id): id is string => !!id); // 过滤掉没有首都ID的国家

          // 2. 筛选出合适的地区
          const suitableRegions = allRegions.filter(region => {
            // 条件1：未被占领
            if (region.owner) {
              return false;
            }

            // 条件2：不是海洋
            const terrainTraits = worldMap.getTerrainTraits(region.RegionId);
            if (!terrainTraits || terrainTraits.terrainType === TerrainType.OCEAN) {
              return false;
            }

            // 条件3：距离所有现有首都至少3个地区远
            for (const capitalId of existingCapitals) {
              const distance = calculateDistance(region.RegionId, capitalId);
              if (distance < 3) { // 注意：距离小于3意味着距离为0, 1, 或 2
                // console.log(`[建国选址] 地区 ${region.RegionId} 距离首都 ${capitalId} 太近 (${distance})，排除。`); // 可选的调试日志
                return false; // 太近了，排除
              }
            }

            // 如果通过所有检查，则该地区合适
            return true;
          });

          console.log(`[建国选址] 共找到 ${suitableRegions.length} 个合适的初始地区。`); // 调试日志

          // 3. 如果找到合适的地区，随机选择一个
          if (suitableRegions.length > 0) {
            const selectedRegion = Random.pick(suitableRegions);
            assignedRegionId = selectedRegion.RegionId;

            // 4. 更新该地区的归属信息
            await ctx.database.set('regiondata', { RegionId: assignedRegionId }, {
              owner: countryName,
              leader: username // 或者使用 userId，根据你的设计决定
            });
            console.log(`[建国选址] 已为国家 ${countryName} 分配初始地区 ${assignedRegionId}`); // 调试日志
          } else {
             console.warn(`[建国选址] 未能为国家 ${countryName} 找到合适的初始地区。`); // 调试日志
          }
        } catch (regionError) {
          console.error(`为国家 ${countryName} 分配初始地区时出错:`, regionError);
          // 分配地区失败不应阻止国家创建，但需要记录错误
        }
        // --- 分配地区结束 ---


        // 创建新国家，包含首都信息
        const newCountry = {
          name: countryName,
          leaderId: userId,
          leaderName: username,
          members: [userId],
          capitalRegionId: assignedRegionId, // 保存分配到的地区ID
        }
        await ctx.database.create('country', newCountry)

        // 更新用户数据，标记其为国家领导人
        await ctx.database.set('userdata', { userId: userId }, {
          countryName: countryName,
          isLeader: true
        })

        let successMessage = `
======[国家]=====
${username} 同志！
国家 ${countryName} 组建成功！
`;
        if (assignedRegionId) {
          successMessage += `\n■分配的初始地区编号：${assignedRegionId}`;
          successMessage += `\n■请使用“绑定地区 ${assignedRegionId}”将此地区与当前群聊绑定。`;
        } else {
          // 如果没有分配到地区，提示信息需要更明确
          successMessage += `\n□未能自动分配初始地区（可能是没有满足条件的位置），请联系管理员或稍后再试。`;
        }
        successMessage += `
■邀请格式：
邀请加入国家 @指定玩家
`.trim()

        return successMessage;
      } catch (error) {
        console.error('组建国家时出错:', error)
        return '组建国家时发生错误'
      }
    })
}