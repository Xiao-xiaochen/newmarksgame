import { Context } from 'koishi';
import { Region } from '../types';
import { } from 'koishi-plugin-cron'; // 这行可以移除，因为 cron 是通过 Context 注入的
// --- 修改：导入新增的函数和 BUILDINGS ---
import { getBuildingDefinition, BUILDINGS } from './Buildings'; // 确保导入路径正确
// --- 修改结束 ---


// 假设每小时结算代表一天
const FOOD_CONSUMPTION_PER_10K_CAPITA = 1; // 每万人每天消耗粮食
const GOODS_CONSUMPTION_PER_10K_CAPITA = 0.5; // 每万人每天消耗消费品
const FOOD_CONSUMPTION_PER_CAPITA = FOOD_CONSUMPTION_PER_10K_CAPITA / 10000; // 0.0001
const GOODS_CONSUMPTION_PER_CAPITA = GOODS_CONSUMPTION_PER_10K_CAPITA / 10000; // 0.00005

const FARM_OUTPUT_PER_FARM = 3; // 需要确认这个值是否基于有效劳动力
const LIGHT_INDUSTRY_OUTPUT_PER_INDUSTRY = 1; // 一个满劳动力轻工厂产出1生活消费品
const MINE_OUTPUT_RATES: Record<string, number> = {
    coal: 50, ironOre: 30, oil: 40, rareMetal: 5, rareEarth: 2, aluminum: 20, rubber: 15,
    stone: 5, // 矿场副产物石料，需要确认是否在这里处理或在建筑定义里
};
const RESOURCE_NAMES: Record<string, string> = {
    food: '粮食', goods: '生活消费品', coal: '煤炭', ironOre: '铁矿石', oil: '原油',
    steel: '钢铁', rareMetal: '稀有金属', rareEarth: '稀土', aluminum: '铝', rubber: '橡胶',
    Mazout: '重油', Diesel: '柴油', Asphalt: '沥青', Gas: '天然气', fuel: '燃料油',
    concrete: '混凝土', stone: '石料', machinery: '机械',
};

// ... existing code ...

// --- 核心小时结算逻辑 (从原 setInterval 回调中提取) ---
// --- 导出核心小时结算逻辑 ---
export async function performHourlyUpdateLogic(ctx: Context) {
    console.log(`[${new Date().toLocaleString()}] Starting hourly region processing...`);
    const regions = await ctx.database.get('regiondata', {});
    const updatePromises: Promise<any>[] = [];

    for (const region of regions) {
        const regionId = region.RegionId;
        const guildId = region.guildId;

        // --- Guild ID 有效性检查 ---
        if (!guildId || String(guildId).length < 4) {
            // console.log(`[结算跳过] 地区 ${regionId} 的 guildId (${guildId}) 无效或过短。`);
            continue;
        }

        // 初始化报告和更新数据
        const reportMessages: string[] = []; // 清空，重新构建
        const updatedRegionData: Partial<Region> = {}; // 初始化为空对象
        const tempRegionStateForBaseCalc: Partial<Region> = { ...region }; // 提前声明和初始化
        const productionSummary: Record<string, number> = {};
        const consumptionSummary: Record<string, number> = {};
        let populationChange = 0; // 用于记录具体人口变化数字
        let populationChangeRate = 0; // 用于记录变化率

        // --- 0. 获取当前状态 ---
        const currentPopulation = region.population || 0;
        const defaultWarehouse: Required<Region['warehouse']> = { // 确保所有键存在
            food: 0, goods: 0, rubber: 0, Mazout: 0, Diesel: 0, fuel: 0, Asphalt: 0, Gas: 0,
            rareMetal: 0, rareEarth: 0, coal: 0, ironOre: 0, steel: 0, aluminum: 0, oil: 0,
            concrete: 0, stone: 0, machinery: 0
        };
        const currentWarehouse = { ...defaultWarehouse, ...(region.warehouse || {}) };
        const defaultResources: Required<Region['resources']> = {
            rareMetal: 0, rareEarth: 0, coal: 0, ironOre: 0, aluminum: 0, oil: 0,
        };
        const currentResources = { ...defaultResources, ...(region.resources || {}) };
        const laborAllocation = region.laborAllocation || {};
        const miningAllocation = region.miningAllocation || {};
        const farmCount = region.farms || 0;
        const lightIndustryCount = region.lightIndustry || 0;
        const mineCount = region.Mine || 0;
        const constructionDepartments = region.Department || 0;
        // const constructionQueueString = region.constructionQueue || '[]'; // 移除队列
        let ongoingConstruction = region.ongoingconstruction || null; // 获取当前建造项目

        // --- 1. 生产计算 (需要考虑劳动力分配) ---
        let totalAllocatedLabor = 0; // 计算总共分配出去的劳动力

        // 1.1 粮食生产
        const farmLaborAllocated = laborAllocation['farms'] || 0;
        const farmBuildingDef = getBuildingDefinition('farms');
        const requiredLaborPerFarm = farmBuildingDef?.operation?.fixLabor || 10000;
        const maxWorkingFarms = Math.floor(farmLaborAllocated / requiredLaborPerFarm);
        const actualWorkingFarms = Math.min(farmCount, maxWorkingFarms);
        if (actualWorkingFarms > 0) {
            const foodProduced = Math.floor(actualWorkingFarms * FARM_OUTPUT_PER_FARM); // 假设 FARM_OUTPUT_PER_FARM 是满劳动力时的产出
            if (foodProduced > 0) {
                currentWarehouse.food += foodProduced;
                productionSummary['food'] = (productionSummary['food'] || 0) + foodProduced;
            }
            totalAllocatedLabor += actualWorkingFarms * requiredLaborPerFarm; // 计入实际使用的劳动力
        }

        // 1.2 消费品生产
        const lightIndustryLaborAllocated = laborAllocation['lightIndustry'] || 0;
        const lightIndustryBuildingDef = getBuildingDefinition('lightIndustry');
        const requiredLaborPerLightIndustry = lightIndustryBuildingDef?.operation?.fixLabor || 10000;
        const maxWorkingLightIndustries = Math.floor(lightIndustryLaborAllocated / requiredLaborPerLightIndustry);
        const actualWorkingLightIndustries = Math.min(lightIndustryCount, maxWorkingLightIndustries);
        if (actualWorkingLightIndustries > 0) {
            const goodsProduced = Math.floor(actualWorkingLightIndustries * LIGHT_INDUSTRY_OUTPUT_PER_INDUSTRY);
            if (goodsProduced > 0) {
                currentWarehouse.goods += goodsProduced;
                productionSummary['goods'] = (productionSummary['goods'] || 0) + goodsProduced;
            }
            totalAllocatedLabor += actualWorkingLightIndustries * requiredLaborPerLightIndustry;
        }

        // 1.3 矿业生产 (包括石料副产物)
        const mineLaborAllocated = laborAllocation['Mine'] || 0;
        const mineBuildingDef = getBuildingDefinition('Mine');
        const requiredLaborPerMine = mineBuildingDef?.operation?.fixLabor || 20000;
        const maxWorkingMinesFromLabor = Math.floor(mineLaborAllocated / requiredLaborPerMine);

        let totalMinesAllocatedToResources = 0;
        for (const count of Object.values(miningAllocation)) {
            totalMinesAllocatedToResources += count;
        }
        const actualTotalWorkingMines = Math.min(mineCount, maxWorkingMinesFromLabor, totalMinesAllocatedToResources);

        if (actualTotalWorkingMines > 0 && totalMinesAllocatedToResources > 0) {
            // 按比例分配工作矿场到各种资源
            for (const [resourceKey, allocatedCount] of Object.entries(miningAllocation)) {
                if (allocatedCount > 0 && currentResources[resourceKey] > 0) {
                    // 计算该资源实际工作的矿场数
                    const workingMinesForResource = Math.floor(actualTotalWorkingMines * (allocatedCount / totalMinesAllocatedToResources));
                    if (workingMinesForResource > 0) {
                        const outputRate = MINE_OUTPUT_RATES[resourceKey] || 0;
                        const producedAmount = Math.floor(workingMinesForResource * outputRate);
                        const maxExtractable = currentResources[resourceKey]; // 最多只能开采储量
                        const actualProduced = Math.min(producedAmount, maxExtractable);

                        if (actualProduced > 0) {
                            currentWarehouse[resourceKey] = (currentWarehouse[resourceKey] || 0) + actualProduced;
                            currentResources[resourceKey] -= actualProduced; // 减少储量
                            productionSummary[resourceKey] = (productionSummary[resourceKey] || 0) + actualProduced;
                        }
                    }
                }
            }
            // 计算石料产出 (所有工作的矿场都产出)
            const stoneOutputRate = MINE_OUTPUT_RATES['stone'] || 5; // 从 MINE_OUTPUT_RATES 获取或用默认值
            const stoneProduced = Math.floor(actualTotalWorkingMines * stoneOutputRate);
            if (stoneProduced > 0) {
                currentWarehouse.stone = (currentWarehouse.stone || 0) + stoneProduced;
                productionSummary['stone'] = (productionSummary['stone'] || 0) + stoneProduced;
            }
            totalAllocatedLabor += actualTotalWorkingMines * requiredLaborPerMine; // 计入矿场劳动力
        }
        // 更新资源储量
        updatedRegionData.resources = { ...currentResources };


        // 1.4 其他建筑生产 (炼钢厂, 炼油厂, 混凝土厂, 机械厂等) - 需要类似逻辑检查劳动力和输入资源
        // ... (此处省略，需要根据具体建筑定义添加) ...
        // 示例：炼钢厂 (假设已分配劳动力且有足够资源)
        const steelMillLaborAllocated = laborAllocation['steelmill'] || 0;
        const steelMillBuildingDef = getBuildingDefinition('steelMill');
        const requiredLaborPerSteelMill = steelMillBuildingDef?.operation?.fixLabor || 20000;
        const maxWorkingSteelMills = Math.floor(steelMillLaborAllocated / requiredLaborPerSteelMill);
        const actualWorkingSteelMills = Math.min(region.steelmill || 0, maxWorkingSteelMills);
        if (actualWorkingSteelMills > 0) {
            const inputCoal = (steelMillBuildingDef?.operation?.coal || 0) * actualWorkingSteelMills; // 消耗是负数
            const inputIronOre = (steelMillBuildingDef?.operation?.ironOre || 0) * actualWorkingSteelMills;
            const outputSteel = (steelMillBuildingDef?.operation?.produces?.steel || 0) * actualWorkingSteelMills;

            if (currentWarehouse.coal >= Math.abs(inputCoal) && currentWarehouse.ironOre >= Math.abs(inputIronOre) && outputSteel > 0) {
                currentWarehouse.coal += inputCoal; // 减去消耗
                currentWarehouse.ironOre += inputIronOre;
                currentWarehouse.steel += outputSteel;
                productionSummary['steel'] = (productionSummary['steel'] || 0) + outputSteel;
                consumptionSummary['coal'] = (consumptionSummary['coal'] || 0) + Math.abs(inputCoal);
                consumptionSummary['ironOre'] = (consumptionSummary['ironOre'] || 0) + Math.abs(inputIronOre);
                totalAllocatedLabor += actualWorkingSteelMills * requiredLaborPerSteelMill;
            }
        }
        // ... (添加其他工厂的生产逻辑) ...


        // --- 2. 消耗计算 ---
        const foodNeeded = Math.ceil(currentPopulation * FOOD_CONSUMPTION_PER_CAPITA);
        const goodsNeeded = Math.ceil(currentPopulation * GOODS_CONSUMPTION_PER_CAPITA);

        const actualFoodConsumed = Math.min(currentWarehouse.food, foodNeeded);
        const actualGoodsConsumed = Math.min(currentWarehouse.goods, goodsNeeded);

        currentWarehouse.food -= actualFoodConsumed;
        currentWarehouse.goods -= actualGoodsConsumed;

        consumptionSummary['food'] = actualFoodConsumed;
        consumptionSummary['goods'] = actualGoodsConsumed;

        // --- 3. 人口变化计算 ---
        const foodSupplyPercent = foodNeeded > 0 ? (actualFoodConsumed / foodNeeded) * 100 : 100;
        const goodsSupplyPercent = goodsNeeded > 0 ? (actualGoodsConsumed / goodsNeeded) * 100 : 100;
        populationChangeRate = calculatePopulationModifier(foodSupplyPercent, goodsSupplyPercent);
        populationChange = Math.floor(currentPopulation * populationChangeRate);
        const newPopulation = Math.max(0, currentPopulation + populationChange); // 人口不能为负

        // --- 4. 劳动力更新 ---
        const newTotalLabor = Math.floor(newPopulation * 0.6); // 总劳动力是新人口的60%
        // 重新计算实际能支持的总分配劳动力 (不能超过新的总劳动力)
        const effectiveTotalAllocatedLabor = Math.min(totalAllocatedLabor, newTotalLabor);
        const newIdleLabor = newTotalLabor - effectiveTotalAllocatedLabor; // 新的空闲劳动力

        updatedRegionData.population = newPopulation;
        updatedRegionData.labor = newTotalLabor; // 更新总劳动力
        updatedRegionData.Busylabor = newIdleLabor; // 更新空闲劳动力
        updatedRegionData.lastPopulationModifier = populationChangeRate; // 记录变化率

        // --- 5. 建造力计算与建造处理 ---
        const constructionDeptLaborAllocated = laborAllocation['Department'] || 0;
        const constructionDeptBuildingDef = getBuildingDefinition('constructionDepartment');
        const requiredLaborPerDept = constructionDeptBuildingDef?.operation?.fixLabor || 10000;
        const capacityPerDept = constructionDeptBuildingDef?.operation?.produces?.constructionCapacity || 200;
        const maxWorkingDepts = Math.floor(constructionDeptLaborAllocated / requiredLaborPerDept);
        const actualWorkingDepts = Math.min(constructionDepartments, maxWorkingDepts);
        const hourlyConstructionCapacity = actualWorkingDepts * capacityPerDept; // 本小时产生的建造力

        let constructionReport = '空闲'; // 建造报告信息
        let remainingCapacity = hourlyConstructionCapacity; // 可用建造力

        if (ongoingConstruction) {
            const pointsToApply = Math.min(remainingCapacity, ongoingConstruction.remainingPoints);
            ongoingConstruction.remainingPoints -= pointsToApply;
            remainingCapacity -= pointsToApply; // 消耗建造力

            if (ongoingConstruction.remainingPoints <= 0) {
                // 建造完成
                const buildingKey = ongoingConstruction.key;

                if (typeof region[buildingKey] === 'number') {
                    const currentCount = (region[buildingKey] as number) || 0;
                    const newValue: number = currentCount + ongoingConstruction.quantity;
                    (updatedRegionData as any)[buildingKey] = newValue;
                    // --- 重要：更新临时状态以用于 base 计算 ---
                    // 现在 tempRegionStateForBaseCalc 已经在外部初始化了
                    (tempRegionStateForBaseCalc as any)[buildingKey] = newValue; // 恢复 as any
                    // --- 更新结束 ---
                    constructionReport = `${ongoingConstruction.quantity}个 ${ongoingConstruction.type} 建造完成！`;
                } else {
                    console.error(`[结算错误] 地区 ${regionId}: 尝试更新非数字建筑字段 ${buildingKey}`);
                    constructionReport = `⚠️ 建造完成但无法更新: 字段 "${buildingKey}" 不是数字类型`;
                }

                ongoingConstruction = null; // 清空进行中的项目
            } else {
                // 建造未完成
                constructionReport = `${ongoingConstruction.type} (${ongoingConstruction.remainingPoints}点剩余)`;
            }
            updatedRegionData.ongoingconstruction = ongoingConstruction; // 更新或清空进行中的项目
        }

        // 存储本小时刷新后 *剩余* 的建造力 (如果“即取即用”是指命令可以消耗的话)
        // 或者存储 *总共* 刷新的建造力 (如果命令只能在下个周期开始前使用)
        // 按照用户描述“下个小时建造力刷新了，再建一下”，倾向于存储刷新值
        updatedRegionData.Constructioncapacity = hourlyConstructionCapacity; // 存储本小时 *总共* 产生的建造力

        // --- 6. 更新仓库 ---
        // 确保 warehouse 对象被更新
        updatedRegionData.warehouse = { ...currentWarehouse };


        // --- 7. 生成报告 ---
        reportMessages.push(`=====[地区报告推送]=====`);
        reportMessages.push(`地区编号：${regionId}`);
        reportMessages.push(`□人口总数: ${(newPopulation / 10000).toFixed(2)}万`);
        reportMessages.push(`■人口变化：${populationChange >= 0 ? '+' : ''}${populationChange}`);
        reportMessages.push(`■人口变化: ${populationChangeRate >= 0 ? '+' : ''}${(populationChangeRate * 100).toFixed(2)}%/小时`); // 假设每小时=每天
        reportMessages.push(''); // 空行
        reportMessages.push(`民生供给：${foodSupplyPercent.toFixed(0)}% (粮) / ${goodsSupplyPercent.toFixed(0)}% (消)`);
        reportMessages.push(`民生需求：（单位/小时）`); // 假设每小时=每天
        reportMessages.push(`■粮食：${foodNeeded}`);
        reportMessages.push(`■消费品: ${goodsNeeded}`);
        reportMessages.push(''); // 空行
        reportMessages.push(`□总劳动力:  ${(newTotalLabor / 10000).toFixed(2)}万`);
        reportMessages.push(`■空闲劳动力：${newIdleLabor}`); // 显示正确的空闲劳动力
        reportMessages.push(`■劳动力信息已刷新！`);
        reportMessages.push(`□总建造力: ${hourlyConstructionCapacity}`); // 显示本小时产生的总建造力
        reportMessages.push(`■建造力信息已刷新！`);
        reportMessages.push(`■建造状态: ${constructionReport}`); // 显示建造状态

        // 添加生产和消耗总结 (可选)
        const productionText = Object.entries(productionSummary)
            .map(([key, value]) => `${getResourceName(key)} +${value}`)
            .join(', ');
        const consumptionText = Object.entries(consumptionSummary)
            .filter(([key, value]) => value > 0) // 只显示有消耗的
            .map(([key, value]) => `${getResourceName(key)} -${value}`)
            .join(', ');

        if (productionText) reportMessages.push(`\n生产总结: ${productionText}`);
        if (consumptionText) reportMessages.push(`消耗总结: ${consumptionText}`);


        // --- 8. 准备数据库更新 ---
        // 过滤掉没有实际变化的更新，避免不必要的数据库写入
        const finalUpdateData: Partial<Region> = {};
        for (const key in updatedRegionData) {
            // 简单比较，对于对象可能不够精确，但对于基本类型和简单对象通常有效
            // 注意：对于深层嵌套对象（如 warehouse, resources），这可能不会检测到内部变化
            // 如果需要精确比较，可能需要更复杂的深度比较逻辑
            if (JSON.stringify(updatedRegionData[key]) !== JSON.stringify(region[key])) {
                finalUpdateData[key] = updatedRegionData[key];
            }
        }

        // 只有在有实际数据变动时才添加到更新队列
        if (Object.keys(finalUpdateData).length > 0) {
            updatePromises.push(
                ctx.database.set('regiondata', { RegionId: regionId }, finalUpdateData)
                    .catch(err => {
                        console.error(`[数据库错误] 更新地区 ${regionId} 数据失败:`, err);
                        // 可以在这里添加更详细的错误处理或重试逻辑
                    })
            );
        }

        // --- 9. 发送报告 ---
        const fullReport = reportMessages.join('\n');
        // 确保 guildId 是有效的字符串并且平台前缀正确
        if (guildId && typeof guildId === 'string' && guildId.length >= 4) {
             const channelIdWithPlatform = `onebot:${guildId}`; // 根据你的 Koishi 配置调整平台前缀
             ctx.broadcast([channelIdWithPlatform], fullReport).catch(err => {
                 console.warn(`[报告发送失败] 无法发送报告到频道 ${channelIdWithPlatform} (地区 ${regionId}):`, err.message);
                 // 可以根据错误类型进行更具体的处理，例如检查机器人是否在群组中
                 if (err.response?.status === 404 || err.message.includes('channel not found')) {
                     console.error(`[报告发送错误] 频道 ${channelIdWithPlatform} 未找到或机器人不在该群组。`);
                     // 可能需要标记该地区或通知管理员
                 }
             });
        } else {
             console.warn(`[报告跳过] 地区 ${regionId} 的 guildId (${guildId}) 无效，无法发送报告。`);
        }

    } // 结束 for...of 循环处理单个地区

    // --- 10. 等待所有数据库更新完成 ---
    try {
        await Promise.all(updatePromises);
        console.log(`[${new Date().toLocaleString()}] Hourly region processing finished. Updated ${updatePromises.length} regions.`);
    } catch (error) {
        console.error(`[${new Date().toLocaleString()}] Error during database updates:`, error);
    }
} // 结束 performHourlyUpdateLogic 函数

// --- 辅助函数 ---

// 获取资源中文名 (如果未在别处定义)
function getResourceName(key: string): string {
    return RESOURCE_NAMES[key] || key; // 使用常量或返回 key 本身
}

// 计算人口变化修正因子 (需要根据具体规则实现)
// --- 人口变化计算辅助函数 ---
function calculatePopulationModifier(foodSupplyPercent: number, goodsSupplyPercent: number): number {
    // 基础增长率 (每天/每小时)
    let baseGrowthRate = 0.005; // 0.5%

    // 粮食供给惩罚
    let foodPenalty = 0;
    if (foodSupplyPercent < 50) {
        foodPenalty = -0.02; // -2%
    } else if (foodSupplyPercent < 80) {
        foodPenalty = -0.01; // -1%
    }
    // else: 80%及以上无惩罚

    // 生活消费品供给修正
    let goodsModifier = 0;
    if (goodsSupplyPercent < 30) {
        goodsModifier = -0.005; // -0.5%
    } else if (goodsSupplyPercent >= 30 && goodsSupplyPercent < 50) {
        goodsModifier = 0; // 无修正
    } else if (goodsSupplyPercent >= 50 && goodsSupplyPercent < 80) {
        goodsModifier = 0.005; // +0.5%
    } else if (goodsSupplyPercent >= 80) {
        goodsModifier = 0.01; // +1%
    }

    // 特别机制：粮食供应率小于80%时，忽略生活消费品给予的正人口修正
    if (foodSupplyPercent < 80 && goodsModifier > 0) {
        goodsModifier = 0; // 忽略正修正
    }

    // 总变化率 = 基础增长率 + 粮食惩罚 + 生活消费品修正
    const totalModifier = baseGrowthRate + foodPenalty + goodsModifier;

    // 返回最终的人口变化率 (例如 0.01 表示 +1%, -0.005 表示 -0.5%)
    return totalModifier;
}

// 计算仓库已用容量 (如果未在别处定义)
function calculateUsedCapacity(warehouse: Record<string, number | undefined>): number {
    return Object.values(warehouse).reduce((sum, amount) => sum + (typeof amount === 'number' ? amount : 0), 0);
}

// --- Cron 任务设置 (如果未在别处定义) ---
// 确保 HourCheckIn 函数存在并调用 performHourlyUpdateLogic
export function HourCheckIn(ctx: Context) {
    // 每小时执行一次
    ctx.cron('0 * * * *', async () => {
        try {
            await performHourlyUpdateLogic(ctx);
        } catch (error) {
            console.error(`[${new Date().toLocaleString()}] Unhandled error during hourly update execution:`, error);
        }
    });

    console.log('Hourly region update task scheduled.');
}

