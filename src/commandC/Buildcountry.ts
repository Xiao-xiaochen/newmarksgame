//src\commandP\Buildcountry.ts

import { Context, Random, User, Time } from 'koishi' // 导入 Time
import { WorldMap } from '../core/Map/MapCore'; // 导入 WorldMap
import { Region, TerrainType, userdata } from '../types'; // 导入 userdata 类型
import { validateCountryName } from '../utils/Namecheck'; // 导入国家名称验证函数
import { calculateDistance } from '../utils/ChebyshevDistance'; // 导入计算距离的函数

//config
//BuildCountryCooldown:number 建国冷却时间

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

      // --- 新增：国家名称校验 ---
      // 1. 长度校验 (例如 2-16 个字符)
      if (countryName.length < 2 || countryName.length > 12) {
        return `
======[国家]=====
${username} 同志！
国家名称长度必须在 2 到 16 个字符之间。
`.trim()
      }
      // 2. 字符校验 (只允许中文、英文、数字)
      const validNameRegex = /^[\u4e00-\u9fa5a-zA-Z0-9]+$/;
      if (!validNameRegex.test(countryName)) {
        return `
======[国家]=====
${username} 同志！
国家名称只能包含中文、英文字母和数字。
`.trim()
      }
      // 3. 可选：黑名单校验 (如果需要，可以在这里添加)
      // const forbiddenWords = ['敏感词1', '敏感词2'];
      // if (forbiddenWords.some(word => countryName.includes(word))) {
      //   return `国家名称包含不允许的词语。`;
      // }
      // --- 国家名称校验结束 ---

      try {
        // 检查用户是否已注册
        const userInfoResult = await ctx.database.get('userdata', { userId: userId })
        if (!userInfoResult || userInfoResult.length === 0) {
          return `
======[国家]=====
${username} 同志！
您尚未注册！请先发送"阅读报告"进行注册。
`.trim()
        }
        const userInfo = userInfoResult[0]; // 获取用户数据

        // --- 新增：检查建国冷却时间 ---
        if (userInfo.lastCountryLeaveTimestamp) {
          const now = Date.now();
          const timeSinceLastLeave = now - userInfo.lastCountryLeaveTimestamp;
          if (timeSinceLastLeave < ctx.config.BuildCountryCooldown*Time.hour) {
            const remainingTime = ctx.config.BuildCountryCooldown*Time.hour - timeSinceLastLeave;
            const remainingTimeString = Time.format(remainingTime); // 格式化剩余时间
            return `
======[国家]=====
${username} 同志！
您刚离开或解散国家不久，请等待 ${remainingTimeString} 后再尝试组建新国家。
`.trim();
          }
        }
        // --- 冷却时间检查结束 ---


        // 检查用户是否已经在一个国家里 (注意：这里检查的是 countryName，不是 leaderId)
        if (userInfo.countryName) {
           // 尝试获取用户所在国家的信息，以显示国家名
           const currentCountry = await ctx.database.get('country', { name: userInfo.countryName });
           const currentCountryName = currentCountry?.[0]?.name || userInfo.countryName; // 优先用查询到的，否则用用户数据里的
           return `
======[国家]=====
${username} 同志！
您已经在一个国家里了：
${currentCountryName}
请先使用“退出国家”命令离开当前国家。
`.trim();
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
          // const worldMap = WorldMap.getInstance(); // 不再需要 worldMap 实例来获取地形
          // 1. 获取所有地区数据
          const allRegions = await ctx.database.get('regiondata', {});
          // 1.5 获取所有现有国家的首都位置
          const allCountries = await ctx.database.get('country', {});
          const existingCapitals = allCountries
            .map(c => c.capitalRegionId)
            .filter((id): id is string => !!id); // 过滤掉没有首都ID的国家

          // 2. 筛选出合适的地区
          const suitableRegions = allRegions.filter(region => {
            const regionId = region.RegionId; // 获取 RegionId 方便日志记录

            // 条件1：未被占领
            if (region.owner && region.owner !== '') { // 确保 owner 不为空字符串
              // console.log(`[建国选址][${regionId}] 排除：已被占领 (${region.owner})`); // 可选日志
              return false;
            }

            // 条件2：不是海洋 (使用数据库中的 Terrain 字段)
            const terrainFromDb = region.Terrain; // 直接从数据库记录获取地形字符串
            if (!terrainFromDb) {
              console.warn(`[建国选址][${regionId}] 警告：数据库中缺少地形信息，按不合适处理。`);
              return false;
            }
            // *** 修改日志并直接比较数据库字段 ***
            // 确保与 TerrainType.OCEAN (值为 '水域') 进行比较
            const isOcean = terrainFromDb === TerrainType.OCEAN;
            console.log(`[建国选址][${regionId}] 地形检查(DB)：数据库类型='${terrainFromDb}', 是否为海洋(TerrainType.OCEAN='${TerrainType.OCEAN}')=${isOcean}`);
            if (isOcean) {
              // console.log(`[建国选址][${regionId}] 排除：是海洋 (来自数据库)`); // 可选日志
              return false;
            }


            // 条件3：距离所有现有首都至少3个地区远
            for (const capitalId of existingCapitals) {
              const distance = calculateDistance(regionId, capitalId);
              if (distance < 3) {
                // console.log(`[建国选址][${regionId}] 排除：距离首都 ${capitalId} 太近 (${distance})`); // 可选日志
                return false;
              }
            }

            // 如果通过所有检查，则该地区合适
            console.log(`[建国选址][${regionId}] 通过所有检查，判定为合适。`); // 确认哪些地区被认为合适
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
          isLeader: true,
          // 可选：在这里清除 lastCountryLeaveTimestamp，因为他们现在是新国家的领袖了
          // lastCountryLeaveTimestamp: null
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
        successMessage += `\n■邀请格式：\n邀请加入国家 @指定玩家`.trim()
        return successMessage;
      } catch (error) {
        console.error('组建国家时出错:', error)
        return '组建国家时发生错误'
      }
    })
}