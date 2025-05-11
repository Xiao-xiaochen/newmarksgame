import { Context } from 'koishi';
import { Region } from '../types';
import { } from 'koishi-plugin-cron'; // 这行可以移除，因为 cron 是通过 Context 注入的
// --- 修改：导入新增的函数和 BUILDINGS ---
import { getBuildingDefinition, BUILDINGS } from './Buildings'; // 确保导入路径正确
                  import { TRandom } from '../utils/Random'; // 导入 TRandom
// --- 修改结束 ---


// 假设每小时结算代表一天
const FOOD_CONSUMPTION_PER_10K_CAPITA = 1; // 每万人每天消耗粮食
const GOODS_CONSUMPTION_PER_10K_CAPITA = 0.5; // 每万人每天消耗消费品
const FOOD_CONSUMPTION_PER_CAPITA = FOOD_CONSUMPTION_PER_10K_CAPITA / 10000; // 0.0001
const GOODS_CONSUMPTION_PER_CAPITA = GOODS_CONSUMPTION_PER_10K_CAPITA / 10000; // 0.00005
// 定义每座矿场的基础产出率 (石料除外，使用 TRandom)
const BASE_MINE_OUTPUT_RATES_PER_MINE: Record<string, number> = {
    coal: 2000, ironOre: 2000, /* oil: 40, */ rareMetal: 2000, rareEarth: 2000, aluminum: 2000, rubber: 15,
    // oil 由 oilwell 产出, stone 使用 TRandom
}
const FARM_OUTPUT_PER_FARM = 3; // 需要确认这个值是否基于有效劳动力
const LIGHT_INDUSTRY_OUTPUT_PER_INDUSTRY = 1; // 一个满劳动力轻工厂产出1生活消费品
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
                        const outputRate = BASE_MINE_OUTPUT_RATES_PER_MINE[resourceKey] || 0; // 使用基础速率
                        const producedAmount = Math.floor(workingMinesForResource * outputRate); // 产出 = 工作矿场数 * 速率
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
            // 计算石料产出 (只要有劳动力支持矿场工作就产石料)
            const potentialStoneProducingMines = Math.min(mineCount, maxWorkingMinesFromLabor);
            if (potentialStoneProducingMines > 0) {
                const stoneProduced = TRandom(2000, 2500, 3000, true) * potentialStoneProducingMines;
                if (stoneProduced > 0) {
                    currentWarehouse.stone = (currentWarehouse.stone || 0) + stoneProduced;
                    productionSummary['stone'] = (productionSummary['stone'] || 0) + stoneProduced;
                }
            }
            // 计入矿场劳动力 (基于实际参与资源开采的矿场，如果 actualTotalWorkingMines > 0)
            if (actualTotalWorkingMines > 0) {
                 totalAllocatedLabor += actualTotalWorkingMines * requiredLaborPerMine;
            } else if (potentialStoneProducingMines > 0 && mineLaborAllocated > 0) {
                // 如果没有具体资源分配，但有劳动力分配给矿业且有矿场，
                // 至少要为支持石料生产的那些“概念上”工作的矿场计算劳动力占用。
                // 这里假设劳动力是按比例分配的，或者至少一部分被占用了。
                // 一个简化处理是，如果 mineLaborAllocated > 0 且 mineCount > 0，
                // 即使 totalMinesAllocatedToResources 为0，也认为一部分劳动力被占用了。
                // 但更准确的是，totalAllocatedLabor 应该只计算那些真正产出主要矿物或明确分配的。
                // 石料作为副产品，其劳动力消耗已包含在主要矿物的劳动力中。
                // 如果 actualTotalWorkingMines 为0，但 potentialStoneProducingMines > 0，
                // 这意味着劳动力分配了，但没有分配到具体资源。
                // 这种情况下，劳动力是否应该被计入 totalAllocatedLabor 是一个设计选择。
                // 当前逻辑：如果 actualTotalWorkingMines 为0，则不增加 totalAllocatedLabor，
                // 这可能导致空闲劳动力偏高。
                // 一个折中：如果 mineLaborAllocated > 0 且 mineCount > 0，
                // 即使 actualTotalWorkingMines 为0，也认为 mineLaborAllocated 被占用了。
                // 但这与上面 maxWorkingMinesFromLabor 的计算方式有重叠。
                // 维持原状：totalAllocatedLabor 只因 actualTotalWorkingMines > 0 而增加。
                // 这意味着如果玩家只分配劳动力到矿业，但不分配矿场到具体资源，
                // 这些劳动力在小时结算时不会被视为“繁忙”（除非其他地方有处理）。
                // 考虑到 `分配劳动力` 命令会减少 Busylabor，这里可能不需要重复计算。
                // 确认：`totalAllocatedLabor` 的目的是什么？是为了后续计算新的空闲劳动力。
                // `分配劳动力` 命令已经减少了 Busylabor。
                // `HourCheckIn` 中的 `totalAllocatedLabor` 是为了核实这些分配出去的劳动力是否真的在工作
                // 并基于此调整人口变化等。
                // 保持原样，仅当 actualTotalWorkingMines > 0 时增加 totalAllocatedLabor。
                 if (actualTotalWorkingMines > 0) { // 再次检查，确保只在有主要产出时增加
                    // totalAllocatedLabor += actualTotalWorkingMines * requiredLaborPerMine; // 这行已在上面
                 }
            }
        }
        // 更新资源储量 (仅当有主要矿物产出时才需要更新，因为石料不消耗地下储量)
        if (actualTotalWorkingMines > 0 && totalMinesAllocatedToResources > 0) {
            updatedRegionData.resources = { ...currentResources };
        }


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
        // 注意：totalAllocatedLabor 是在生产计算步骤中累加的
        const effectiveTotalAllocatedLabor = Math.min(totalAllocatedLabor, newTotalLabor);
        const newIdleLabor = newTotalLabor - effectiveTotalAllocatedLabor; // 新的空闲劳动力

        updatedRegionData.population = newPopulation;
        updatedRegionData.labor = newTotalLabor; // 更新总劳动力
        updatedRegionData.Busylabor = newIdleLabor; // 更新空闲劳动力
        updatedRegionData.lastPopulationModifier = populationChangeRate; // 记录变化率

        // --- 5. 建造力计算与建造处理 ---
        // --- 修改：根据分配的劳动力计算实际工作的建筑部门数量 ---
        const constructionDeptLaborAllocated = laborAllocation['Department'] || 0; // 获取分配给建筑部门的总劳动力
        const constructionDeptBuildingDef = getBuildingDefinition('Department'); // 使用 key 'Department' 获取定义
        const requiredLaborPerDept = constructionDeptBuildingDef?.operation?.fixLabor || 10000; // 每个部门需要的劳动力
        const capacityPerDept = constructionDeptBuildingDef?.operation?.produces?.constructionCapacity || 200; // 每个部门的产能

        // 计算理论上可以支持多少个部门工作
        const maxWorkingDeptsByLabor = Math.floor(constructionDeptLaborAllocated / requiredLaborPerDept);
        // 实际工作的部门数量不能超过总部门数，也不能超过劳动力支持的数量
        const actualWorkingDepts = Math.min(constructionDepartments, maxWorkingDeptsByLabor);

        const hourlyConstructionCapacity = actualWorkingDepts * capacityPerDept; // 本小时产生的建造力
        // --- 修改结束 ---

        // --- 修改：累积建造力 --- 
        const currentConstructionCapacity = region.Constructioncapacity || 0;
        const newTotalConstructionCapacity = currentConstructionCapacity + hourlyConstructionCapacity;
        updatedRegionData.Constructioncapacity = newTotalConstructionCapacity; // 存储累积的总建造力
        // --- 修改结束 --- 

        // --- 移除旧的建造队列和进行中项目处理逻辑 --- 
        // let constructionReport = '空闲'; // 建造报告信息
        // let remainingCapacity = hourlyConstructionCapacity; // 可用建造力
        // if (ongoingConstruction) { ... } // 移除整个 if 块
        // updatedRegionData.ongoingconstruction = ongoingConstruction; // 移除
        // --- 移除结束 ---

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
        reportMessages.push(`■劳动力已增加！`);
        reportMessages.push(`□当前总建造力: ${updatedRegionData.Constructioncapacity}`); // 显示累积的总建造力
        reportMessages.push(`■本小时增加建造力: ${hourlyConstructionCapacity}`);
        reportMessages.push(`■建造力信息已刷新！`);
        // reportMessages.push(`■建造状态: ${constructionReport}`); // 移除建造状态显示

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

        // --- 9. 存储报告 ---
        const fullReport = reportMessages.join('\n');

        // 检查 guildId 是否为四位数字符串。
        // 循环开始时已确保 guildId 是字符串且长度至少为4 (如果执行到此处)。
        const isFourDigitChannelId = /^\d{4}$/.test(guildId);

        if (isFourDigitChannelId) {
            console.log(`[地区报告跳过] 地区 ${regionId} (频道 ${guildId}) 的频道ID为四位数，报告将不被存储。`);
            // 对于四位数的 guildId，不将报告存储到 updatedRegionData.lastHourlyReport
        } else {
            updatedRegionData.lastHourlyReport = fullReport; // 将报告存储到待更新数据中
            // 对于非四位数的有效 guildId，记录报告已生成并准备存储
            console.log(`[地区报告已生成] 地区 ${regionId} (频道 ${guildId}) 的报告已生成并准备存储。`);
            // 此处无需原先的 else (console.warn)，因为无效/过短的 guildId 已在循环开头被 continue。
            // 如果代码执行到这里，guildId 被认为是有效的（非四位数，且通过了初始检查）。
        }

        // 移除广播逻辑，只在控制台记录报告已生成
        if (guildId && typeof guildId === 'string' && guildId.length >= 4) {
            console.log(`[地区报告已生成] 地区 ${regionId} (频道 ${guildId}) 的报告已生成并准备存储。`);
        } else {
            console.warn(`[报告生成记录] 地区 ${regionId} 的 guildId (${guildId}) 无效，但报告仍已生成。`);
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

    // 生活消费品供给修正 (只加不减)
    let goodsModifier = 0;
    // 低于100%时无影响
    if (goodsSupplyPercent >= 100) {
        // 达到或超过100%时提供加成，例如1%
        goodsModifier = 0.01; // +1%
    }
    // 可以根据需要调整加成的具体数值和条件，例如分档次
    // else if (goodsSupplyPercent >= 80) { // 示例：80%-100%提供0.5%加成
    //     goodsModifier = 0.005;
    // }

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
