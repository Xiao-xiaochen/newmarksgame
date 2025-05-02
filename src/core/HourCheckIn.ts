import { Context } from 'koishi';
import { Region } from '../types';
// 仓库工具函数现在从本文件获取，如果移到 utils/Warehouse.ts，则需要修改导入
// import { calculateUsedCapacity, calculateWarehouseCapacity } from '../utils/Warehouse';

// --- 配置常量 (根据文档和游戏设计调整) ---
const BASE_BUILD_POWER_FACTOR = 0.01; // 每人口提供的基础建造力系数 (可调整)
const FOOD_CONSUMPTION_PER_CAPITA = 1;    // 每人每小时消耗粮食 (来自文档)
const GOODS_CONSUMPTION_PER_CAPITA = 0.5; // 每人每小时消耗消费品 (来自文档)

// 生产效率 (来自文档或假设)
const FARM_OUTPUT_PER_FARM = 3;             // 每座有足够工人的农场每小时产出粮食
const LIGHT_INDUSTRY_OUTPUT_PER_INDUSTRY = 2; // 每座有足够工人的轻工厂每小时产出消费品
// 假设轻工厂生产消费品不消耗额外资源 (如果需要消耗，需添加逻辑)

// 假设矿场生产效率 (需要调整) - 每矿场每小时产量
const MINE_OUTPUT_RATES: Record<string, number> = {
    coal: 50,
    ironOre: 30,
    oil: 40, // 假设值
    rareMetal: 5,
    rareEarth: 2,
    aluminum: 20, // 假设值
    rubber: 15, // 假设值
    // ... 其他可开采资源
};

// 资源名称映射 (用于报告)
const RESOURCE_NAMES: Record<string, string> = {
    food: '粮食',
    consumerGoods: '生活消费品',
    coal: '煤炭',
    ironOre: '铁矿石',
    oil: '原油',
    steel: '钢铁',
    rareMetal: '稀有金属',
    rareEarth: '稀土',
    aluminum: '铝',
    rubber: '橡胶',
    Mazout: '重油',
    Diesel: '柴油',
    Asphalt: '沥青',
    Gas: '天然气',
    fuel: '燃料油',
    // ... 其他资源
};

function getResourceName(key: string): string {
    return RESOURCE_NAMES[key] || key;
}

// 计算人口增长修正系数 (基于文档规则)
function calculatePopulationModifier(foodSupplyPercent: number, goodsSupplyPercent: number): number {
    let foodModifier = 0;
    if (foodSupplyPercent >= 80) {
        foodModifier = 0.005; // 基础增长率? 文档描述为+0.5%
    } else if (foodSupplyPercent >= 50) {
        foodModifier = -0.01; // -1%
    } else {
        foodModifier = -0.02; // -2%
    }

    let goodsModifier = 0;
    if (goodsSupplyPercent >= 80) {
        goodsModifier = 0.01; // +1%
    } else if (goodsSupplyPercent >= 50) {
        goodsModifier = -0.005; // -0.5%
    } else if (goodsSupplyPercent >= 30) {
        goodsModifier = -0.005; // <30% 时 -0.5%, 30-50% 文档未明确，暂按 <30% 处理
    } else {
         goodsModifier = -0.005; // <30% 时 -0.5%
    }

    // 如何组合? 取最差的？还是叠加？ 文档似乎暗示独立影响后叠加？
    // 简单处理：如果粮食充足 (>80%)，则应用消费品修正；否则，应用粮食修正（惩罚优先）
    // 或者：基础增长率 + 粮食修正 + 消费品修正？
    // 采用文档描述的独立影响：
    // 粮食供应率影响： >=80% (+0.5%), 50-80% (-1%), <50% (-2%)
    // 消费品供应率影响：>=80% (+1%), 50-80% (-0.5%), <30% (-0.5%), [30-50% 暂定为0%]
    // 总变化率 = 粮食影响 + 消费品影响

    let finalFoodModifier = 0;
    if (foodSupplyPercent >= 80) finalFoodModifier = 0.005;
    else if (foodSupplyPercent >= 50) finalFoodModifier = -0.01;
    else finalFoodModifier = -0.02;

    let finalGoodsModifier = 0;
    if (goodsSupplyPercent >= 80) finalGoodsModifier = 0.01;
    else if (goodsSupplyPercent >= 50) finalGoodsModifier = -0.005;
    else if (goodsSupplyPercent >= 30) finalGoodsModifier = 0; // 30-50% 暂定为无影响
    else finalGoodsModifier = -0.005;

    // 返回总的百分比变化
    return finalFoodModifier + finalGoodsModifier;
}


import { getBuildingDefinition } from './Buildings';

export function HourCheckIn(ctx: Context) {
    ctx.setInterval(async () => {
        console.log(`[${new Date().toLocaleString()}] 开始执行每小时结算...`);
        const regions = await ctx.database.get('regiondata', {});
        const updatePromises: Promise<any>[] = [];

        for (const region of regions) {
            const regionId = region.RegionId;
            const guildId = region.guildId;
            const reportMessages: string[] = [];
            const updatedRegionData: Partial<Region> = {};
            const productionSummary: Record<string, number> = {};
            const consumptionSummary: Record<string, number> = {};

            // --- 0. 获取当前状态 ---
            const currentPopulation = region.population || 0;

            // --- 修正: 定义默认仓库结构 ---
            const defaultWarehouse: Required<Omit<Region['warehouse'], 'concrete' | 'stone' | 'machinery'>> & Pick<Region['warehouse'], 'concrete' | 'stone' | 'machinery'> = {
                food: 0, goods: 0, rubber: 0, Mazout: 0, Diesel: 0, fuel: 0, Asphalt: 0, Gas: 0,
                rareMetal: 0, rareEarth: 0, coal: 0, ironOre: 0, steel: 0, aluminum: 0, oil: 0,
                concrete: 0, stone: 0, machinery: 0
            };
            const currentWarehouse: typeof defaultWarehouse = {
                ...defaultWarehouse,
                ...(region.warehouse || {}),
            };

            // --- 修正: 定义默认地下资源结构 ---
            const defaultResources: Required<Region['resources']> = {
                rareMetal: 0, rareEarth: 0, coal: 0, ironOre: 0, aluminum: 0, oil: 0,
            };
            // --- 修正: 使用默认值合并初始化 currentResources ---
            const currentResources: typeof defaultResources = {
                ...defaultResources,
                ...(region.resources || {}),
            };

            const laborAllocation = region.laborAllocation || {};
            const miningAllocation = region.miningAllocation || {};
            const farmCount = region.farms || 0;
            const lightIndustryCount = region.lightIndustry || 0;
            const mineCount = region.Mine || 0; // 总矿场数
            const constructionDepartments = region.Department || 0; // 建筑部门数量
            const constructionQueueString = region.constructionQueue || '[]'; // 建造队列

            // --- 1. 征战历 +1 (假设有此字段) ---
            // const newConquestCalendar = (region.ConquestCalendar || 0) + 1;
            // updatedRegionData.ConquestCalendar = newConquestCalendar;
            // reportMessages.push(`⏳ 征战历 ${newConquestCalendar} 天`); // 如果没有 ConquestCalendar 字段，注释掉这几行

            // --- 2. 计算生产 ---
            // 2.1  Productions (粮食)
            const farmLaborAllocated = laborAllocation['farms'] || 0;
            // --- 修正: 使用正确的函数名 ---
            const farmBuildingDef = getBuildingDefinition('farms');
            const requiredLaborPerFarm = farmBuildingDef?.operation?.fixLabor || 1; // 默认为1
            const maxWorkingFarms = Math.floor(farmLaborAllocated / requiredLaborPerFarm);
            const actualWorkingFarms = Math.min(farmCount, maxWorkingFarms); // 实际能运作的农场数
            if (actualWorkingFarms > 0) {
                const foodProduced = Math.floor(actualWorkingFarms * FARM_OUTPUT_PER_FARM);
                if (foodProduced > 0) {
                    currentWarehouse.food = (currentWarehouse.food || 0) + foodProduced; // 使用 .food
                    productionSummary['food'] = (productionSummary['food'] || 0) + foodProduced;
                }
            }


            // 2.2 轻工业生产 (消费品)
            const lightIndustryLaborAllocated = laborAllocation['lightIndustry'] || 0;
            // --- 修正: 使用正确的函数名 ---
            const lightIndustryBuildingDef = getBuildingDefinition('lightIndustry');
            const requiredLaborPerLightIndustry = lightIndustryBuildingDef?.operation?.fixLabor || 1; // 默认为1
            const maxWorkingLightIndustries = Math.floor(lightIndustryLaborAllocated / requiredLaborPerLightIndustry);
            const actualWorkingLightIndustries = Math.min(lightIndustryCount, maxWorkingLightIndustries);
            if (actualWorkingLightIndustries > 0) {
                // !! 如果轻工业需要消耗原料，在此处添加检查和扣除逻辑
                const goodsProduced = Math.floor(actualWorkingLightIndustries * LIGHT_INDUSTRY_OUTPUT_PER_INDUSTRY);
                if (goodsProduced > 0) {
                    // --- 修正: 使用 goods ---
                    currentWarehouse.goods = (currentWarehouse.goods || 0) + goodsProduced;
                    productionSummary['goods'] = (productionSummary['goods'] || 0) + goodsProduced;
                }
            }

            // 2.3 矿业生产
            let totalAllocatedMines = 0;
            for (const allocated of Object.values(miningAllocation)) {
                totalAllocatedMines += allocated;
            }
            const availableMineBuildings = Math.max(0, mineCount - totalAllocatedMines); // 可用于新分配的矿场建筑

            for (const [resourceKey, allocatedMines] of Object.entries(miningAllocation)) {
                if (allocatedMines > 0 && MINE_OUTPUT_RATES[resourceKey]) {
                    // 实际工作的矿场数受限于分配数和总矿场数
                    const workingMines = Math.min(allocatedMines, mineCount); // 不能超过总矿场数
                    const undergroundReserve = currentResources[resourceKey] || 0;
                    const potentialProduction = Math.floor(workingMines * MINE_OUTPUT_RATES[resourceKey]);

                    if (potentialProduction > 0 && undergroundReserve > 0) {
                        const actualProduction = Math.min(potentialProduction, undergroundReserve);
                        currentWarehouse[resourceKey] = (currentWarehouse[resourceKey] || 0) + actualProduction;
                        currentResources[resourceKey] = undergroundReserve - actualProduction;
                        productionSummary[resourceKey] = (productionSummary[resourceKey] || 0) + actualProduction;
                    } else if (undergroundReserve <= 0) {
                         reportMessages.push(`⚠️ ${getResourceName(resourceKey)} 地下储量耗尽！`);
                    }
                }
            }
             // --- 修正: 将类型正确的 currentResources 赋值给 updatedRegionData.resources ---
             updatedRegionData.resources = currentResources; // 更新地下储量


            // 2.4 检查仓库容量 (生产后)
            const capacity = calculateWarehouseCapacity(region);
            const usedAfterProduction = calculateUsedCapacity(currentWarehouse);
            if (usedAfterProduction > capacity) {
                reportMessages.push(`⚠️ 仓库容量不足 (${usedAfterProduction}/${capacity})，部分产出已丢失！`);
                // 简单处理：按比例缩减所有库存以适应容量 (非常粗略, 可能会导致重要物资丢失)
                const overflowRatio = capacity / usedAfterProduction;
                 for(const key in currentWarehouse){
                     currentWarehouse[key] = Math.floor(currentWarehouse[key] * overflowRatio);
                 }
            }

            // --- 3. 计算消耗 ---
            let foodNeeded = 0;
            let goodsNeeded = 0;
            let foodConsumed = 0;
            let goodsConsumed = 0;
            let foodShortage = false;
            let goodsShortage = false;

            if (currentPopulation > 0) {
                foodNeeded = Math.ceil(currentPopulation * FOOD_CONSUMPTION_PER_CAPITA);
                goodsNeeded = Math.ceil(currentPopulation * GOODS_CONSUMPTION_PER_CAPITA);

                // 扣除粮食
                const foodAvailable = currentWarehouse['food'] || 0;
                foodConsumed = Math.min(foodAvailable, foodNeeded);
                currentWarehouse['food'] = foodAvailable - foodConsumed;
                consumptionSummary['food'] = foodConsumed;
                if (foodConsumed < foodNeeded) {
                    foodShortage = true;
                    reportMessages.push(`🚨 粮食短缺！需求: ${foodNeeded}, 供应: ${foodConsumed}`);
                }

                // 扣除消费品
                // --- 修正: 使用 goods ---
                const goodsAvailable = currentWarehouse.goods || 0;
                goodsConsumed = Math.min(goodsAvailable, goodsNeeded);
                currentWarehouse.goods = goodsAvailable - goodsConsumed;
                consumptionSummary['goods'] = goodsConsumed;
                if (goodsConsumed < goodsNeeded) {
                    goodsShortage = true;
                    // --- 修正: 使用 goods ---
                    reportMessages.push(`🚨 生活消费品短缺！需求: ${goodsNeeded}, 供应: ${goodsConsumed}`);
                }
            }
            // --- 修正: 将类型正确的 currentWarehouse 赋值给 updatedRegionData.warehouse ---
            updatedRegionData.warehouse = currentWarehouse; // 更新仓库(消耗后)

            // --- 4. 计算人口变化 ---
            let populationChange = 0;
            let newPopulation = currentPopulation;
            if (currentPopulation > 0) {
                const foodSupplyPercent = foodNeeded > 0 ? (foodConsumed / foodNeeded) * 100 : 100;
                const goodsSupplyPercent = goodsNeeded > 0 ? (goodsConsumed / goodsNeeded) * 100 : 100;
                const modifier = calculatePopulationModifier(foodSupplyPercent, goodsSupplyPercent);
                populationChange = Math.floor(currentPopulation * modifier);
                newPopulation = Math.max(0, currentPopulation + populationChange); // 人口不能为负
            }
            updatedRegionData.population = newPopulation;

            // --- 5. 更新劳动力和建造力 (基于新人口) ---
            // 5.1 计算总已分配劳动力
            const totalAllocatedLabor = Object.values(laborAllocation).reduce((sum, count) => sum + count, 0);
            // 5.2 更新空闲劳动力 (Busylabor)
            const newBusyLabor = Math.max(0, newPopulation - totalAllocatedLabor);
            // 只有在数值变化时才更新数据库字段
            if (newBusyLabor !== region.Busylabor) {
                updatedRegionData.Busylabor = newBusyLabor;
            }
            // 5.3 重置建造力 (BuildPower)
            const newBuildPower = Math.floor(newPopulation * BASE_BUILD_POWER_FACTOR);
             if (newBuildPower !== region.Constructioncapacity) {
                updatedRegionData.Constructioncapacity = newBuildPower;
            }

            // --- 6. 更新数据库 ---
            // 只有在有实际变化时才执行更新
            if (Object.keys(updatedRegionData).length > 0) {
                 updatePromises.push(
                    ctx.database.set('regiondata', { RegionId: regionId }, updatedRegionData)
                        .catch(err => {
                             console.error(`数据库更新失败 - 地区 ${regionId}:`, err);
                             // 可以在这里添加更详细的错误处理或日志记录
                        })
                );
            }


            // --- 7. 准备并发送报告 ---
            if (guildId) {
                const reportHeader = `=====[地区 ${regionId} 每小时报告]=====`;
                const productionText = Object.entries(productionSummary)
                    .map(([key, value]) => `生产 ${getResourceName(key)}: +${value}`)
                    .join('\n') || "无生产";
                const consumptionText = Object.entries(consumptionSummary)
                    .map(([key, value]) => `消耗 ${getResourceName(key)}: -${value}`)
                    .join('\n') || "无消耗";
                const populationText = `人口: ${newPopulation} (${populationChange >= 0 ? '+' : ''}${populationChange})`;
                const laborText = `空闲劳动力: ${updatedRegionData.Busylabor ?? region.Busylabor}`; // 显示更新后的空闲劳动力
                const buildPowerText = `建造力: ${updatedRegionData.Constructioncapacity ?? region.Constructioncapacity }`; // 显示更新后的建造力

                const fullReport = [
                    reportHeader,
                    ...reportMessages, // 显示日期和警告
                    "--- 生产与消耗 ---",
                    productionText,
                    consumptionText,
                    "--- 状态更新 ---",
                    populationText,
                    laborText,
                    buildPowerText,
                ].filter(line => line).join('\n'); // 过滤空行

                ctx.broadcast([guildId], fullReport).catch(err => {
                     console.warn(`发送报告到群组 ${guildId} (地区 ${regionId}) 失败:`, err.message);
                 });
            }
        }

        // 等待所有数据库更新完成
        try {
            await Promise.all(updatePromises);
            console.log(`[${new Date().toLocaleString()}] 每小时结算完成，尝试处理了 ${regions.length} 个地区。`);
        } catch (error) {
            // Promise.all 在第一个 reject 时就会停止, 上面的 catch 已经处理了单个错误
            // 这里可以记录一个总体错误，但单个地区的失败已在上面捕获
            console.error(`[${new Date().toLocaleString()}] 每小时结算过程中发生了一个或多个数据库更新错误。`);
        }

    }, 3600 * 1000); // 每小时执行一次

    console.log('每小时结算任务已启动。');
}

// --- 仓库容量计算函数 (需要与游戏中其他地方保持一致) ---
// 如果这些函数在 utils/Warehouse.ts 中，请从那里导入并删除这里的定义
function calculateWarehouseCapacity(region: Region): number {
    // 示例：基于仓库建筑等级或固定值 + 基础容量
    // const baseCapacity = 10000;
    // const capacityPerLevel = 5000;
    // const warehouseLevel = region.buildings?.warehouse || 0; // 假设仓库等级存储在这里
    // return baseCapacity + warehouseLevel * capacityPerLevel;
    return region.warehouseCapacity || 100000; // 使用数据库中的字段或默认值
}

// --- 仓库已用容量计算函数 ---
// --- 修正: warehouse 参数类型允许 undefined 值 ---
function calculateUsedCapacity(warehouse: Record<string, number | undefined>): number {
    return Object.values(warehouse).reduce((sum, amount) => sum + (amount || 0), 0);
}