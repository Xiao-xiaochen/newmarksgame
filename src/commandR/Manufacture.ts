import { Context, Session } from 'koishi';
import { Region, userdata } from '../types'; // 导入类型
// import { BUILDINGS, getBuildingDefinitionByName } from '../core/Buildings'; // 不再直接需要BUILDINGS和getBuildingDefinitionByName

// 定义可制造的产品及其对应的工厂、成本和产出
interface ManufacturableProductInfo {
  factoryKey: keyof Region; // 对应 Region 中工厂数量的字段
  factoryDisplayName: string; // 工厂的中文名
  warehouseProductKey: keyof Region['warehouse']; // 产品在地区仓库中的键名
  laborCostPerFactory: number; // 每单位工厂单次生产消耗的劳动力
  inputs: { resourceKey: keyof Region['warehouse'], amountPerFactory: number }[]; // 每单位工厂单次生产消耗的原料
  outputPerFactory: number; // 每单位工厂单次生产的产出量
}

const MANUFACTURABLE_PRODUCTS: Record<string, ManufacturableProductInfo> = {
  '混凝土': {
    factoryKey: 'concretePlant',
    factoryDisplayName: '混凝土厂',
    warehouseProductKey: 'concrete',
    laborCostPerFactory: 20000, // 假设值：每个混凝土厂单次生产消耗1000劳动力
    inputs: [{ resourceKey: 'stone', amountPerFactory: 2000 }], // 消耗2000石头
    outputPerFactory: 1800, // 产出1800混凝土 (基于Buildings.ts中TRandom(1700,1800,1950)的平均值)
  },
  '机械': {
    factoryKey: 'machineryPlant',
    factoryDisplayName: '机械厂',
    warehouseProductKey: 'machinery',
    laborCostPerFactory: 20000, // 假设值：每个机械厂单次生产消耗1500劳动力
    inputs: [{ resourceKey: 'steel', amountPerFactory: 1500 }], // 假设消耗1500钢铁
    outputPerFactory: 100, // 假设产出100机械
  },
  // 未来可以添加更多产品
};

export function ManufactureCommand(ctx: Context) {
  ctx.command('地区制造 <productName:string> <factoryQuantity:number>', '使用指定数量的工厂立即生产特定产品').alias('地区生产')
    .action(async ({ session }, productName, factoryQuantity) => {
      if (!session || !session.userId || !session.author) {
        return '无法获取用户信息。';
      }
      if (!session.guildId) {
        return '此命令只能在群聊中使用。';
      }
      if (!Number.isInteger(factoryQuantity) || factoryQuantity <= 0) {
        return '要分配的工厂数量必须为正整数。';
      }

      const userId = session.userId;
      const guildId = session.guildId;
      const username = session.author.name || '未知用户';

      // --- 验证产品类型 ---
      const productInfo = MANUFACTURABLE_PRODUCTS[productName];
      if (!productInfo) {
        const availableProducts = Object.keys(MANUFACTURABLE_PRODUCTS).join('、');
        return `无效的产品类型：“${productName}”。\n当前可制造的产品有：${availableProducts}`;
      }
      const { factoryKey, factoryDisplayName } = productInfo;

      // --- 获取用户和地区数据 ---
      const userDataResult = await ctx.database.get('userdata', { userId: userId });
      if (!userDataResult || userDataResult.length === 0) {
        return `${username} 同志，您尚未注册。`;
      }
      const user: userdata = userDataResult[0];

      const regionDataResult = await ctx.database.get('regiondata', { guildId: guildId });
      if (!regionDataResult || regionDataResult.length === 0) {
        return `当前群聊 (${guildId}) 未绑定任何地区。`;
      }
      const region: Region = regionDataResult[0];
      const targetRegionId = region.RegionId;

      // --- 检查驻扎状态 ---
      if (user.regionId !== targetRegionId) {
        return `您必须驻扎在地区 ${targetRegionId} 才能使用此命令。请先使用“驻扎”指令。`;
      }

      // --- 检查国家归属 ---
      if (!region.owner) {
        return `地区 ${targetRegionId} 当前为无主地，无法进行生产。`;
      }
      if (user.countryName !== region.owner) {
        return `您 (${user.countryName}) 不属于控制该地区 (${targetRegionId}) 的国家 (${region.owner})，无法下达生产指令。`;
      }

      // --- 检查工厂数量 ---
      const totalFactories = (region[productInfo.factoryKey] as number) || 0;
      if (totalFactories === 0) {
        return `地区 ${targetRegionId} 没有任何 ${factoryDisplayName}。`;
      }
      if (factoryQuantity > totalFactories) {
        return `地区 ${targetRegionId} 的 ${factoryDisplayName} 数量不足！\n总共拥有: ${totalFactories}\n本次需要: ${factoryQuantity}`;
      }

      // --- 计算并检查所需资源和劳动力 ---
      const laborNeeded = productInfo.laborCostPerFactory * factoryQuantity;
      if (region.Busylabor < laborNeeded) {
        return `劳动力不足！\n需要劳动力: ${laborNeeded}\n当前空闲劳动力: ${region.Busylabor}`;
      }

      const resourceCosts: { name: string, key: keyof Region['warehouse'], totalAmount: number }[] = [];
      for (const input of productInfo.inputs) {
        const totalAmountNeeded = input.amountPerFactory * factoryQuantity;
        const currentAmountInWarehouse = (region.warehouse[input.resourceKey] as number) || 0;
        if (currentAmountInWarehouse < totalAmountNeeded) {
          // TODO: Get resource display name if available
          return `原料 ${input.resourceKey} 不足！\n需要 ${input.resourceKey}: ${totalAmountNeeded}\n当前拥有 ${input.resourceKey}: ${currentAmountInWarehouse}`;
        }
        resourceCosts.push({ name: input.resourceKey, key: input.resourceKey, totalAmount: totalAmountNeeded });
      }

      // --- 执行生产：消耗资源和劳动力，增加产品 ---
      const updatedRegionData: Partial<Region> = {
        Busylabor: region.Busylabor - laborNeeded,
        warehouse: { ...region.warehouse },
      };

      for (const cost of resourceCosts) {
        (updatedRegionData.warehouse![cost.key] as number) -= cost.totalAmount;
      }

      const productProduced = productInfo.outputPerFactory * factoryQuantity;
      (updatedRegionData.warehouse![productInfo.warehouseProductKey] as number) = 
        ((region.warehouse[productInfo.warehouseProductKey] as number) || 0) + productProduced;

      // --- 更新数据库 ---
      try {
        await ctx.database.set('regiondata', { RegionId: targetRegionId }, updatedRegionData);
      } catch (dbError) {
        console.error(`Database update error during manufacture command for region ${targetRegionId}:`, dbError);
        return '数据库更新失败，生产未能完成。请重试或联系管理员。';
      }

      // --- 生成反馈信息 ---
      let consumedResourcesString = resourceCosts.map(rc => `  - ${rc.name}: ${rc.totalAmount}`).join('\n');
      if (!consumedResourcesString) consumedResourcesString = '  - 无';

      // 获取更新后的地区数据用于显示，或者直接使用计算后的值
      const finalProductAmount = updatedRegionData.warehouse![productInfo.warehouseProductKey];
      const finalLabor = updatedRegionData.Busylabor;

      return `
=====[工业部 - 即时生产报告]=====
${username} 同志：
■ 已成功使用 ${factoryQuantity} 个 ${factoryDisplayName} 生产了 ${productProduced} 单位 ${productName}。

□ 消耗详情：
  - 劳动力: ${laborNeeded}
${consumedResourcesString}

□ 地区 ${targetRegionId} 当前状态：
  - ${productName}: ${finalProductAmount}
  - 空闲劳动力: ${finalLabor}
  ${resourceCosts.map(rc => `- ${rc.name}: ${updatedRegionData.warehouse![rc.key]}`).join('\n')}
`.trim();
    });
}