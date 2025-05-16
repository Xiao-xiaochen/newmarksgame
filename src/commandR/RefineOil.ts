import { Context, Session } from 'koishi';
import { Region, userdata } from '../types'; // 导入类型
import { BUILDINGS } from '../core/Buildings'; // 导入建筑定义

// 定义单厂单次精炼的消耗和产出 (基于用户示例)
// !! 重要：如果 Buildings.ts 中的定义不同，请以此为准或修改此处 !!
const REFINERY_INPUTS = {
    oil: 1000, // 原油
    coal: 200,  // 煤炭 (假设需要)
};
const REFINERY_OUTPUTS = {
    Mazout: 400, // 重油
    Diesel: 200, // 柴油
    Asphalt: 150,// 沥青
    Gas: 100,    // 天然气
    fuel: 100,   // 燃料油
};

export function RefineOilCommand(ctx: Context) {
    ctx.command('地区精炼 <refineryCount:number>', '使用地区炼油厂进行一次性精炼')
        .alias('精炼')
        .action(async ({ session }, refineryCount) => {
            if (!session || !session.userId || !session.author) {
                return '无法获取用户信息。';
            }
            if (!session.guildId) {
                return '此命令只能在群聊中使用。';
            }
            if (!Number.isInteger(refineryCount) || refineryCount <= 0) {
                return '分配的精炼厂数量必须为正整数。';
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
                return `地区 ${targetRegionId} 当前为无主地，无法进行精炼作业。`;
            }
            if (user.countryName !== region.owner) {
                return `您 (${user.countryName}) 不属于控制该地区 (${targetRegionId}) 的国家 (${region.owner})，无法下达精炼指令。`;
            }

            // --- 检查炼油厂数量 ---
            const totalRefineries = region.refinery || 0;
            if (totalRefineries < refineryCount) {
                return `炼油厂数量不足！\n地区总计: ${totalRefineries}\n本次需要: ${refineryCount}`;
            }
            // 注意：这里假设精炼是瞬时完成的，不检查“空闲”炼油厂。如果需要基于小时的分配，逻辑会更复杂。

            // --- 计算总消耗和总产出 ---
            const totalInputs: Record<string, number> = {};
            const totalOutputs: Record<string, number> = {};
            let totalOutputVolume = 0; // 用于检查仓库容量

            for (const [resource, amount] of Object.entries(REFINERY_INPUTS)) {
                totalInputs[resource] = amount * refineryCount;
            }
            for (const [product, amount] of Object.entries(REFINERY_OUTPUTS)) {
                totalOutputs[product] = amount * refineryCount;
                totalOutputVolume += totalOutputs[product]; // 假设每单位产物体积为1，用于容量计算
            }

            // --- 检查资源库存 ---
            const currentWarehouse = region.warehouse || {};
            const missingResources: string[] = [];
            for (const [resource, requiredAmount] of Object.entries(totalInputs)) {
                const currentAmount = currentWarehouse[resource] || 0;
                if (currentAmount < requiredAmount) {
                    missingResources.push(`${resource}: 缺少 ${requiredAmount - currentAmount}`);
                }
            }
            if (missingResources.length > 0) {
                return `资源不足！\n${missingResources.join('\n')}`;
            }

            // --- 执行精炼：更新仓库 ---
            const updatedWarehouse = { ...currentWarehouse };
            // 扣除消耗
            for (const [resource, consumedAmount] of Object.entries(totalInputs)) {
                updatedWarehouse[resource] = (updatedWarehouse[resource] || 0) - consumedAmount;
            }
            // 增加产出
            for (const [product, producedAmount] of Object.entries(totalOutputs)) {
                updatedWarehouse[product] = (updatedWarehouse[product] || 0) + producedAmount;
            }

            // --- 更新数据库 ---
            try {
                await ctx.database.set('regiondata', { RegionId: targetRegionId }, {
                    warehouse: updatedWarehouse
                });
            } catch (dbError) {
                console.error(`Database update error during refine command for region ${targetRegionId}:`, dbError);
                // 理论上应该回滚仓库更改，但这里简化处理
                return '数据库更新失败，精炼操作未完全执行或未保存。请检查资源状态或联系管理员。';
            }

            // --- 生成反馈信息 ---
            const consumedText = Object.entries(totalInputs)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n');
            const producedText = Object.entries(totalOutputs)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n');

            return `
=====[精炼报告]=====
${username} 同志：
■ 使用 ${refineryCount} 个炼油厂完成精炼。
■ 消耗资源：
${consumedText}
■ 获得产物：
${producedText}
`.trim();
        });
}