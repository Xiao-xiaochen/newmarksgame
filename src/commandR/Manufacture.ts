import { Context, Session } from 'koishi';
import { Region, userdata } from '../types'; // 导入类型
import { BUILDINGS, getBuildingDefinitionByName } from '../core/Buildings'; // 导入建筑定义

// 定义可制造的产品及其对应的工厂
const MANUFACTURABLE_PRODUCTS: Record<string, { factoryKey: keyof Region, factoryDisplayName: string }> = {
  '混凝土': { factoryKey: 'concretePlant', factoryDisplayName: '混凝土厂' },
  '机械': { factoryKey: 'machineryPlant', factoryDisplayName: '机械厂' },
  // 未来可以添加更多产品
};

export function ManufactureCommand(ctx: Context) {
  ctx.command('地区制造 <productName:string> <factoryQuantity:number>', '分配指定数量的工厂生产特定产品')
    .alias('制造')
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

      // --- 检查工厂数量和分配情况 ---
      const totalFactories = (region[factoryKey] as number) || 0;
      if (totalFactories === 0) {
        return `地区 ${targetRegionId} 没有任何 ${factoryDisplayName}。`;
      }

      // 假设使用 region.factoryAllocation 存储工厂分配信息
      // factoryAllocation: { 'concretePlant': 10, 'machineryPlant': 5 }
      const currentFactoryAllocation: Record<string, number> = region.factoryAllocation || {};
      const allocatedFactories = currentFactoryAllocation[factoryKey] || 0;
      const availableFactories = totalFactories - allocatedFactories;

      if (factoryQuantity > availableFactories) {
        return `可用于生产 ${productName} 的 ${factoryDisplayName} 数量不足！\n总计: ${totalFactories}\n已分配: ${allocatedFactories}\n可用: ${availableFactories}\n本次需要: ${factoryQuantity}`;
      }

      // --- 更新工厂分配 ---
      const updatedAllocation = { ...currentFactoryAllocation };
      updatedAllocation[factoryKey] = allocatedFactories + factoryQuantity;

      // --- 更新数据库 ---
      try {
        await ctx.database.set('regiondata', { RegionId: targetRegionId }, {
          factoryAllocation: updatedAllocation
        });
      } catch (dbError) {
        console.error(`Database update error during manufacture command for region ${targetRegionId}:`, dbError);
        return '数据库更新失败，生产分配未更改。请重试或联系管理员。';
      }

      // --- 生成反馈信息 ---
      const allocationDetails = Object.entries(updatedAllocation)
        .map(([key, count]) => {
          const productEntry = Object.entries(MANUFACTURABLE_PRODUCTS).find(([_, info]) => info.factoryKey === key);
          const name = productEntry ? productEntry[1].factoryDisplayName : key;
          return `${name}: ${count}`;
        })
        .join('\n');

      return `
=====[工业部 - 生产指令]=====
${username} 同志：
■ 已成功分配 ${factoryQuantity} 个 ${factoryDisplayName} 用于生产 ${productName}。
□ 地区 ${targetRegionId} 当前工厂分配情况：
${allocationDetails || '无'}
`.trim();
    });
}