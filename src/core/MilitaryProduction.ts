import { MilitaryItemConfig, Region } from "../types";

// 定义军事单位及其生产所需资源和劳动力
export const MILITARY_ITEMS: Record<string, MilitaryItemConfig> = {
  '坦克': {
    name: '坦克',
    output: 10,
    laborCost: 20000,
    resourceCosts: { steel: 500, rareMetal: 200 },
    factoriesRequired: 1,
  },
  '步兵装备': {
    name: '步兵装备',
    output: 1000,
    laborCost: 20000,
    resourceCosts: { steel: 3 },
    factoriesRequired: 1,
  },
  '装甲运兵车': {
    name: '装甲运兵车',
    output: 20,
    laborCost: 20000,
    resourceCosts: { steel: 500, rareMetal: 200 }, // 资源消耗与坦克相同？请确认
    factoriesRequired: 1,
  },
  '火炮': {
    name: '火炮',
    output: 10,
    laborCost: 20000,
    resourceCosts: { steel: 70, rareMetal: 30 },
    factoriesRequired: 1,
  },
  '军事卡车': {
    name: '军事卡车',
    output: 30,
    laborCost: 20000, // 假设也需要2万劳动力
    resourceCosts: { steel: 150, rubber: 15, rareMetal: 3 }, // 需要添加橡胶资源
    factoriesRequired: 1,
  },
  '反坦克炮': {
    name: '反坦克炮',
    output: 8,
    laborCost: 20000,
    resourceCosts: { steel: 64, rareMetal: 4 },
    factoriesRequired: 1,
  },
  '防空火炮': {
    name: '防空火炮',
    output: 6,
    laborCost: 20000,
    resourceCosts: { steel: 42, rareMetal: 2 },
    factoriesRequired: 1,
  },
  '轻型战斗机': {
    name: '轻型战斗机',
    output: 2,
    laborCost: 20000,
    resourceCosts: { aluminum: 10, rareMetal: 4 },
    factoriesRequired: 1,
  },
  '重型战斗机': {
    name: '重型战斗机',
    output: 1,
    laborCost: 20000,
    resourceCosts: { aluminum: 20, rareMetal: 8 },
    factoriesRequired: 1,
  },
  '战术轰炸机': {
    name: '战术轰炸机',
    output: 1,
    laborCost: 20000, // 每个工厂需要2万劳动力
    resourceCosts: { aluminum: 30, rareMetal: 10 },
    factoriesRequired: 2, // 需要2个工厂才能生产1架
  },
  '战略轰炸机': {
    name: '战略轰炸机',
    output: 1,
    laborCost: 20000,
    resourceCosts: { aluminum: 70, rareMetal: 30 },
    factoriesRequired: 10, // 需要10个工厂才能生产1架
  },
  '运输机': {
    name: '运输机',
    output: 1,
    laborCost: 20000,
    resourceCosts: { aluminum: 40, rareMetal: 20 },
    factoriesRequired: 1, // 假设需要1个工厂
  },
  '预警机': {
    name: '预警机',
    output: 1,
    laborCost: 20000,
    resourceCosts: { steel: 50, rareMetal: 25 }, // 示例中是钢铁，不是铝
    factoriesRequired: 1, // 假设需要1个工厂
  },
};

// 工厂产出物品与仓库字段映射 (移到这里或共享)
const PRODUCT_TO_WAREHOUSE_KEY: Record<string, string> = {
  "坦克": "Tank",
  "步兵装备": "InfantryEquipment",
  "装甲运兵车": "car", // 注意：装甲运兵车和军事卡车都映射到 car
  "火炮": "Artillery", // 注意：火炮和防空火炮都映射到 Artillery
  "军事卡车": "car",
  "反坦克炮": "AntiTankGun",
  "防空火炮": "Artillery",
  "轻型战斗机": "LightFighter",
  "重型战斗机": "HeavyFighter",
  "战术轰炸机": "TacticalBomber",
  "战略轰炸机": "StrategicBomber",
  "运输机": "Transportaircraft",
  "预警机": "AWACS",
};


// 生产函数，返回生产结果和消耗信息
export function produce(
  region: Region,
  itemName: string,
  factoryCount: number
): { success: boolean; message: string; changes?: Partial<Region>; producedAmount?: number; resourceCosts?: Record<string, number> } { // 添加返回字段
  const config = MILITARY_ITEMS[itemName];
  if (!config) {
    return { success: false, message: `无效的生产物品类型：${itemName}` };
  }
  // 检查工厂数量是否满足最低要求
  if (factoryCount < config.factoriesRequired) {
    return { success: false, message: `至少需要 ${config.factoriesRequired} 个满编军工厂才能生产一个 ${itemName}` };
  }
  // 检查可用工厂是否足够
  if (region.mfactory < factoryCount) {
    return { success: false, message: `可用军工厂不足，当前可用：${region.mfactory}，需要分配：${factoryCount}` };
  }
  // 检查劳动力 (使用 Busylabor 即空闲劳动力)
  const totalLaborNeedForAssignedFactories = config.laborCost * factoryCount;
  if (region.Busylabor < totalLaborNeedForAssignedFactories) {
    return { success: false, message: `空闲劳动力不足以支撑分配的 ${factoryCount} 个工厂进行生产，当前空闲：${region.Busylabor}，需要：${totalLaborNeedForAssignedFactories}` };
  }

  // 计算基于分配工厂和所需工厂比例的最大可生产批次
  const maxBatchesByFactory = Math.floor(factoryCount / config.factoriesRequired);
  // 计算基于可用空闲劳动力和每批所需劳动力的最大可生产批次
  const laborPerBatch = config.laborCost * config.factoriesRequired; // 这是生产一个完整单位/批次所需的劳动力
  const maxBatchesByLabor = Math.floor(region.Busylabor / laborPerBatch); // 使用空闲劳动力计算

  // 实际生产批次，受限于工厂和空闲劳动力
  const actualBatches = Math.min(maxBatchesByFactory, maxBatchesByLabor);

  if (actualBatches <= 0) {
    // 细化错误信息
    if (maxBatchesByFactory < 1) {
       return { success: false, message: `分配的工厂数量 (${factoryCount}) 不足以生产至少一批 ${itemName} (需要 ${config.factoriesRequired} 个工厂)` };
    }
    if (maxBatchesByLabor < 1) {
       return { success: false, message: `空闲劳动力 (${region.Busylabor}) 不足以生产至少一批 ${itemName} (每批需要 ${laborPerBatch} 劳动力)` };
    }
    return { success: false, message: `未知原因导致无法生产 ${itemName}` }; // 一般不应到达这里
  }

  // 检查资源 (基于实际生产批次)
  const totalResourceNeed: Record<string, number> = {};
  for (const [res, amount] of Object.entries(config.resourceCosts)) {
    totalResourceNeed[res] = (amount || 0) * actualBatches;
    if ((region.warehouse as any)[res] === undefined || (region.warehouse as any)[res] < totalResourceNeed[res]) {
      return { success: false, message: `资源不足，缺少：${res}，需要：${totalResourceNeed[res]}，当前拥有：${(region.warehouse as any)[res] ?? 0}` };
    }
  }

  // 检查仓库空间
  const productKey = PRODUCT_TO_WAREHOUSE_KEY[itemName];
  if (!productKey) {
      return { success: false, message: `错误：物品 ${itemName} 没有对应的仓库键名映射。` };
  }
  const producedAmount = config.output * actualBatches;
  const newItems: Record<string, number> = {};
  newItems[productKey] = producedAmount;
  // 仓库容量检查逻辑已被移除，因此删除相关代码
  // const warehouseCheck = hasEnoughWarehouseSpace(region, newItems);
  // if (!warehouseCheck.hasSpace) {
  //   return { success: false, message: `仓库空间不足，生产 ${producedAmount} 单位 ${itemName} (存入 ${productKey}) 需额外空间：${warehouseCheck.needed}，当前可用：${warehouseCheck.available}` };
  // }

    // --- 5. 更新地区数据 ---
    const laborConsumed = laborPerBatch * actualBatches;
    const currentLabor = region.labor || 0;
    const currentBusyLabor = region.Busylabor || 0;
    const currentMFactory = region.mfactory || 0;
    const currentBusyMFactory = region.busymfactory || 0;

    // 实际消耗的工厂数等于分配的工厂数，因为前面已经检查过 region.mfactory >= factoryCount
    const factoriesConsumedInThisProduction = factoryCount; 

    const updatedRegionData: Partial<Region> = {
        Busylabor: currentBusyLabor - laborConsumed, // 减少空闲劳动力
        // labor: currentLabor, // 总劳动力不因生产而改变
        mfactory: currentMFactory - factoriesConsumedInThisProduction, // 减少可用军工厂
        busymfactory: currentBusyMFactory + factoriesConsumedInThisProduction, // 增加繁忙军工厂
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
            ...(region.militarywarehouse || {}),
        },
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
            concrete: 0,
            stone: 0,
            machinery: 0,
            ...(region.warehouse || {}),
        },
    };

    // 更新军事仓库库存
    // const productWarehouseKey = PRODUCT_TO_WAREHOUSE_KEY[itemName]; // 使用 itemName
    if (productKey && updatedRegionData.militarywarehouse) { // 使用已定义的 productKey
        const currentMilitaryWarehouseStock = (region.militarywarehouse as any)?.[productKey] || 0;
        updatedRegionData.militarywarehouse[productKey] = currentMilitaryWarehouseStock + producedAmount;
    }

    // 从普通仓库扣除消耗的资源
    for (const [resource, cost] of Object.entries(totalResourceNeed)) { // 使用 totalResourceNeed
        if (updatedRegionData.warehouse && updatedRegionData.warehouse[resource] !== undefined) {
            (updatedRegionData.warehouse[resource] as number) -= cost;
        }
    }

    return {
        success: true,
        message: "生产成功",
        producedAmount: producedAmount,
        resourceCosts: totalResourceNeed, // 返回总资源消耗
        changes: updatedRegionData, // 返回需要更新到数据库的变更
    };
}