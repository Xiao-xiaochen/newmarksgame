import { Context, Session } from 'koishi';
import { Region, userdata } from '../types'; // 导入类型

// 资源名称到内部 key 的映射
const resourceNameToKey: Record<string, keyof Region['resources']> = {
  '煤炭': 'coal',
  '铁矿石': 'ironOre',
  '石油': 'oil', // 注意：石油通常由油井开采，矿场逻辑可能不适用，这里仅作示例
  '稀有金属': 'rareMetal',
  '稀土': 'rareEarth',
  // 根据你的 Region.resources 添加更多映射
};

// 反向映射，用于显示
const resourceKeyToName = Object.fromEntries(
  Object.entries(resourceNameToKey).map(([name, key]) => [key, name])
);


export function MineCommand(ctx: Context) {
  ctx.command('地区开采类型 <resourceType:string> <mineCount:number>', '分配地区矿场进行资源开采').alias('设置地区自动开采').alias('地区自动开采').alias('地区开采')
    .alias('开采')
    .action(async ({ session }, resourceType, mineCount) => {
      if (!session || !session.userId || !session.author) {
        return '无法获取用户信息。';
      }
      if (!session.guildId) {
        return '此命令只能在群聊中使用。';
      }
      if (!Number.isInteger(mineCount) || mineCount <= 0) {
        return '矿场数量必须为正整数。';
      }

      const userId = session.userId;
      const guildId = session.guildId;
      const username = session.author.name || '未知用户';

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
        return `地区 ${targetRegionId} 当前为无主地，无法进行开采作业。`;
      }
      if (user.countryName !== region.owner) {
        return `您 (${user.countryName}) 不属于控制该地区 (${targetRegionId}) 的国家 (${region.owner})，无法下达开采指令。`;
      }

      // --- 验证资源类型 ---
      const resourceKey = resourceNameToKey[resourceType];
      if (!resourceKey) {
        const availableResources = Object.keys(resourceNameToKey).join('、');
        return `无效的资源类型：“${resourceType}”。\n可开采资源类型有：${availableResources}`;
      }

      // --- 检查地区是否有该资源储量 ---
      // 注意：这里检查的是地下储量 (resources)，不是仓库 (warehouse)
      if (!region.resources || !(region.resources[resourceKey] > 0)) {
         return `地区 ${targetRegionId} 没有可开采的 ${resourceType} 资源。`;
      }

      // --- 检查矿场数量 ---
      const totalMines = region.Mine || 0;
      if (totalMines === 0) {
        return `地区 ${targetRegionId} 没有任何矿场。请先建造矿场。`;
      }

      // 获取当前的分配情况 (假设 miningAllocation 存在且为 JSON 对象)
      const currentAllocation: Record<string, number> = region.miningAllocation || {};
      const currentTotalAllocatedMines = Object.values(currentAllocation).reduce((sum, count) => sum + count, 0);

      // 计算此资源当前已分配的数量
      const currentlyAllocatedToThisResource = currentAllocation[resourceKey] || 0;

      // 计算空闲矿场数量
      const idleMines = totalMines - currentTotalAllocatedMines;

      if (mineCount > idleMines) {
        return `矿场数量不足！\n总矿场: ${totalMines}\n已分配: ${currentTotalAllocatedMines}\n空闲: ${idleMines}\n本次需要: ${mineCount}`;
      }

      // --- 更新分配 ---
      const updatedAllocation = { ...currentAllocation };
      updatedAllocation[resourceKey] = currentlyAllocatedToThisResource + mineCount;

      // --- 更新数据库 ---
      try {
        await ctx.database.set('regiondata', { RegionId: targetRegionId }, {
          miningAllocation: updatedAllocation
        });
      } catch (dbError) {
        console.error(`Database update error during mine command for region ${targetRegionId}:`, dbError);
        return '数据库更新失败，开采分配未更改。请重试或联系管理员。';
      }

      // --- 生成反馈信息 ---
      const allocationDetails = Object.entries(updatedAllocation)
        .map(([key, count]) => `${resourceKeyToName[key] || key}: ${count}`)
        .join('\n');

      return `
=====[矿业生产部]=====
${username} 同志：
■ 已成功分配 ${mineCount} 个矿场用于开采 ${resourceType}。
□ 地区 ${targetRegionId} 当前矿场分配：
总计: ${totalMines}
${allocationDetails}
□ 剩余空闲矿场: ${totalMines - currentTotalAllocatedMines - mineCount}
`.trim();
    });
}