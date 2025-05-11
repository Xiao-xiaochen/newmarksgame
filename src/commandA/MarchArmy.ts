import { Context, Session, Time } from 'koishi';
import { Region, userdata, Army, ArmyStatus, TerrainType, } from '../types';
import { findArmyByTarget } from '../utils/ArmyUtils';
import { INFANTRY_EQUIPMENT_TERRAIN_MODIFIERS } from '../core/equipmentStats';
import { handleArmyArrival } from '../core/ArmyActions'; // 导入到达处理函数

// --- 常量定义 ---
const BASE_MARCH_TIME_MINUTES = 30; // 基础行军时间（分钟）

export function MarchArmy(ctx: Context) {
  ctx.command('行军 <armyTarget:string> <targetRegionId:string>', '命令指定军队向目标地区行军')
    .alias('march')
    .usage('行军 <军队名称或编号> <目标地区ID>')
    .example('行军 11451 R002')
    .example('行军 1145第一军 R003')
    .action(async ({ session }, armyTarget, targetRegionId) => {
      if (!session || !session.userId || !session.author) {
        return '无法获取用户信息。';
      }
      if (!session.guildId) {
        return '此命令只能在群聊中使用。';
      }
      if (!armyTarget || !targetRegionId) {
        return '请输入有效的军队名称/编号和目标地区ID。';
      }

      const userId = session.userId;
      const guildId = session.guildId; // 当前群聊ID，用于查找当前地区
      const username = session.author.name || '未知用户';

      try {
        // 1. 获取用户数据 (检查注册)
        const userDataResult = await ctx.database.get('userdata', { userId: userId });
        if (!userDataResult || userDataResult.length === 0) {
          return `${username} 同志，您尚未注册。`;
        }
        // const user: userdata = userDataResult[0]; // 可能不需要user数据本身

        // 2. 获取当前地区信息 (根据执行命令的群聊)
        const currentRegionResult = await ctx.database.get('regiondata', { guildId: guildId });
        if (!currentRegionResult || currentRegionResult.length === 0) {
          return `当前群聊 (${guildId}) 未绑定任何地区，无法确定出发地。`;
        }
        const currentRegion: Region = currentRegionResult[0];
        const currentRegionId = currentRegion.RegionId;

        // 3. 查找目标军队 (必须在当前地区)
        const army = await findArmyByTarget(ctx, armyTarget, currentRegionId);
        if (!army) {
          return `在当前地区 ${currentRegionId} 未找到指定的军队 "${armyTarget}"。`;
        }

        // 4. 检查权限 (只有指挥官能命令)
        if (army.commanderId !== userId) {
          return `您不是军队 ${army.name} (${army.armyId}) 的指挥官，无权命令其行军。`;
        }

        // 5. 检查军队状态
        if (army.status !== ArmyStatus.GARRISONED) {
          return `军队 ${army.name} (${army.armyId}) 当前状态为 ${army.status}，无法执行行军命令。请等待其完成当前任务或恢复驻扎状态。`;
        }

        // 6. 检查目标地区
        if (targetRegionId === currentRegionId) {
          return '目标地区不能是当前所在地区。';
        }
        const targetRegionResult = await ctx.database.get('regiondata', { RegionId: targetRegionId });
        if (!targetRegionResult || targetRegionResult.length === 0) {
          return `未找到目标地区 ${targetRegionId}。`;
        }
        const targetRegion: Region = targetRegionResult[0];

        // 6.1 检查目标地区是否相邻
        console.log(`[行军检查] Initial raw adjacentRegionIds for region ${currentRegionId}:`, currentRegion.adjacentRegionIds, `(type: ${typeof currentRegion.adjacentRegionIds})`);

        let isAdjacent = false;
        let adjacentRegionsForDisplay: string[] = [];
        const rawAdjacentIds = currentRegion.adjacentRegionIds;

        // 获取当前地区和目标地区的坐标
        const currentX = currentRegion.x;
        const currentY = currentRegion.y;
        const targetX = targetRegion.x;
        const targetY = targetRegion.y;

        if (typeof rawAdjacentIds === 'string') {
            const trimmedIdsString = rawAdjacentIds.trim();
            if (trimmedIdsString === '') {
                console.log(`[行军检查] adjacentRegionIds for region ${currentRegionId} is an empty or whitespace-only string. Raw: "${rawAdjacentIds}"`);
            } else {
                adjacentRegionsForDisplay = trimmedIdsString.split(',').map(id => id.trim()).filter(id => id);
                console.log(`[行军检查] Parsed from string for region ${currentRegionId}: [${adjacentRegionsForDisplay.join(', ')}]`);
                if (adjacentRegionsForDisplay.length === 0) {
                    console.log(`[行军检查] String parsing for region ${currentRegionId} (original: "${trimmedIdsString}") resulted in an empty list of adjacent regions.`);
                }
            }
        } else if (Array.isArray(rawAdjacentIds)) {
            if (rawAdjacentIds.length === 0) {
                console.log(`[行军检查] adjacentRegionIds for region ${currentRegionId} is an empty array.`);
            } else {
                adjacentRegionsForDisplay = rawAdjacentIds
                    .map(id => String(id).trim()) // 确保是字符串并去除首尾空格
                    .filter(id => id !== '');    // 过滤掉处理后的空字符串
                console.log(`[行军检查] Parsed from array for region ${currentRegionId}: [${adjacentRegionsForDisplay.join(', ')}]`);
                if (adjacentRegionsForDisplay.length === 0) {
                    console.log(`[行军检查] Array processing for region ${currentRegionId} (original: ${JSON.stringify(rawAdjacentIds)}) resulted in an empty list of adjacent regions.`);
                }
            }
        } else if (rawAdjacentIds === null || rawAdjacentIds === undefined) {
            console.log(`[行军检查] adjacentRegionIds for region ${currentRegionId} is ${rawAdjacentIds === null ? 'null' : 'undefined'}.`);
        } else {
            // 其他意外类型
            console.log(`[行军检查] adjacentRegionIds for region ${currentRegionId} has an unexpected type: ${typeof rawAdjacentIds}. Raw value: ${JSON.stringify(rawAdjacentIds)}`);
        }
        
        if (adjacentRegionsForDisplay.length > 0) {
            isAdjacent = adjacentRegionsForDisplay.includes(targetRegionId);
        } else {
            // 如果 adjacentRegionIds 为空或解析后为空，则尝试通过坐标判断
            console.log(`[行军检查] adjacentRegionIds 为空，尝试通过坐标判断相邻性。当前地区 (${currentRegionId}): (${currentX}, ${currentY}), 目标地区 (${targetRegionId}): (${targetX}, ${targetY})`);
            if (currentX !== undefined && currentY !== undefined && targetX !== undefined && targetY !== undefined) {
                const dx = Math.abs(currentX - targetX);
                const dy = Math.abs(currentY - targetY);
                // 使用曼哈顿距离或切比雪夫距离为1来判断是否相邻
                // 曼哈顿距离: dx + dy === 1
                // 切比雪夫距离: Math.max(dx, dy) === 1
                // 这里我们使用切比雪夫距离，允许对角线相邻
                if (Math.max(dx, dy) === 1) {
                    isAdjacent = true;
                    console.log(`[行军检查] 通过坐标判断，地区 ${currentRegionId} 和 ${targetRegionId} 相邻。`);
                } else {
                    console.log(`[行军检查] 通过坐标判断，地区 ${currentRegionId} 和 ${targetRegionId} 不相邻 (dx=${dx}, dy=${dy})。`);
                }
            } else {
                console.log(`[行军检查] 地区 ${currentRegionId} 或 ${targetRegionId} 缺少坐标信息，无法通过坐标判断相邻性。`);
            }
        }

        console.log(`[行军检查] Final check for region ${currentRegionId}: Parsed adjacent regions: [${adjacentRegionsForDisplay.join(', ')}]. Target: ${targetRegionId}. Is adjacent: ${isAdjacent}`);

        if (!isAdjacent) {
          const adjacentList = adjacentRegionsForDisplay.length > 0 ? adjacentRegionsForDisplay.join(', ') : '无 (或未配置坐标)';
          let message = `目标地区 ${targetRegionId} 不是当前地区 ${currentRegionId} 的相邻地区。
`;
          if (adjacentRegionsForDisplay.length > 0) {
            message += `当前地区识别的相邻地区列表为: [${adjacentList}]。
`;
          } else if (currentRegion.x === undefined || currentRegion.y === undefined || targetRegion.x === undefined || targetRegion.y === undefined) {
            message += `无法通过坐标判断相邻性，因为一个或两个地区缺少坐标信息。
`;
          }
          message += `请检查地区数据配置，确保相邻地区已正确设置或地区坐标已填写。`;
          return message;
        }

        // 7. 计算行军时间
        const terrain = targetRegion.Terrain || TerrainType.PLAIN; // 目标地区地形决定行军速度修正
        const terrainModifiers = INFANTRY_EQUIPMENT_TERRAIN_MODIFIERS[terrain] || {};
        const speedModifier = 1 + (terrainModifiers.marchSpeed ?? 0); // 地形速度修正 (注意：配置里是负数表示减慢)

        if (speedModifier <= 0) {
             console.warn(`[行军计算] 地区 ${targetRegionId} 的地形 ${terrain} 导致速度修正为 ${speedModifier}，行军无法完成。`);
             return `目标地区 ${targetRegionId} 的地形 (${terrain}) 无法通行。`;
        }

        const marchDurationMinutes = BASE_MARCH_TIME_MINUTES / speedModifier; // 基础时间 / 速度修正 (修正为正数表示速度倍率)
        const marchEndTime = Date.now() + marchDurationMinutes * Time.minute; // 计算到达时间戳

        // 8. 更新军队状态并设置定时器
        await ctx.database.set('army', { armyId: army.armyId }, {
          status: ArmyStatus.MARCHING,
          targetRegionId: targetRegionId,
          marchEndTime: marchEndTime,
        });

        // 设置定时器，在到达时间后执行 handleArmyArrival
        ctx.setTimeout(() => {
          // 在回调中重新获取 context，避免闭包问题
          handleArmyArrival(ctx, army.armyId);
        }, marchEndTime - Date.now()); // 使用剩余时间作为延迟

        const arrivalTimeStr = new Date(marchEndTime).toLocaleString('zh-CN');
        const durationStr = Time.format(marchDurationMinutes * Time.minute);

        return `命令已下达！军队 ${army.name} (${army.armyId}) 已从 ${currentRegionId} 出发，向 ${targetRegionId} (${terrain}) 行军。\n预计用时：${durationStr}\n预计到达时间：${arrivalTimeStr}`;

      } catch (error) {
        console.error(`处理行军命令时出错 (用户: ${userId}, 军队目标: ${armyTarget}, 目标地区: ${targetRegionId}):`, error);
        const errorMessage = (error as Error).message;
        return `处理行军命令时发生内部错误: ${errorMessage}`;
      }
    });
}