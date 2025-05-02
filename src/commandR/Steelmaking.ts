import { Context, Session } from 'koishi';
import { Region, userdata } from '../types'; // 导入类型
// import { BUILDINGS } from '../core/Buildings'; // 暂时不需要直接导入建筑定义，使用下方常量

// 定义单厂单次炼钢的消耗和产出 (基于 Buildings.ts 比例调整)
const STEELMILL_INPUTS = {
    ironOre: 150, // 铁矿石
    coal: 100,    // 煤炭
};
const STEELMILL_OUTPUTS = {
    steel: 100,   // 钢铁
};

export function SteelmakingCommand(ctx: Context) {
    ctx.command('地区炼钢 <steelmillCount:number>', '使用地区炼钢厂进行一次性炼钢')
        .alias('炼钢')
        .action(async ({ session }, steelmillCount) => {
            if (!session || !session.userId || !session.author) {
                return '无法获取用户信息。';
            }
            if (!session.guildId) {
                return '此命令只能在群聊中使用。';
            }
            if (!Number.isInteger(steelmillCount) || steelmillCount <= 0) {
                return '分配的炼钢厂数量必须为正整数。';
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
                return `地区 ${targetRegionId} 当前为无主地，无法进行炼钢作业。`;
            }
            if (user.countryName !== region.owner) {
                return `您 (${user.countryName}) 不属于控制该地区 (${targetRegionId}) 的国家 (${region.owner})，无法下达炼钢指令。`;
            }

            // --- 检查炼钢厂数量 ---
            const totalSteelMills = region.steelmill || 0;
            if (totalSteelMills < steelmillCount) {
                return `炼钢厂数量不足！\n地区总计: ${totalSteelMills}\n本次需要: ${steelmillCount}`;
            }

            // --- 计算总消耗和总产出 ---
            const totalInputs: Record<string, number> = {};
            const totalOutputs: Record<string, number> = {};
            let totalOutputVolume = 0; // 用于检查仓库容量

            for (const [resource, amount] of Object.entries(STEELMILL_INPUTS)) {
                totalInputs[resource] = amount * steelmillCount;
            }
            for (const [product, amount] of Object.entries(STEELMILL_OUTPUTS)) {
                totalOutputs[product] = amount * steelmillCount;
                totalOutputVolume += totalOutputs[product]; // 假设每单位产物体积为1
            }

            // --- 检查资源库存 ---
            const currentWarehouse = region.warehouse || {};
            const missingResources: string[] = [];
            for (const [resource, requiredAmount] of Object.entries(totalInputs)) {
                // 特殊处理资源名称显示
                let resourceName = resource;
                if (resource === 'ironOre') resourceName = '铁矿石';
                else if (resource === 'coal') resourceName = '煤炭';

                const currentAmount = currentWarehouse[resource] || 0;
                if (currentAmount < requiredAmount) {
                    missingResources.push(`${resourceName}: 缺少 ${requiredAmount - currentAmount}`);
                }
            }
            if (missingResources.length > 0) {
                return `资源不足！\n${missingResources.join('\n')}`;
            }

            // --- 检查仓库容量 ---
            const capacity = calculateWarehouseCapacity(region);
            const used = calculateUsedCapacity(currentWarehouse);
            const availableCapacity = capacity - used;

            if (availableCapacity < totalOutputVolume) {
                return `仓库空间不足！\n需要空间: ${totalOutputVolume}\n可用空间: ${availableCapacity} (当前 ${used}/${capacity})`;
            }

            // --- 执行炼钢：更新仓库 ---
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
                console.error(`Database update error during steelmaking command for region ${targetRegionId}:`, dbError);
                return '数据库更新失败，炼钢操作未完全执行或未保存。请检查资源状态或联系管理员。';
            }

            // --- 生成反馈信息 ---
            const consumedText = Object.entries(totalInputs)
                .map(([key, value]) => {
                    let name = key;
                    if (key === 'ironOre') name = '铁矿石';
                    else if (key === 'coal') name = '煤炭';
                    return `${name}: ${value}`;
                })
                .join('\n');
            const producedText = Object.entries(totalOutputs)
                .map(([key, value]) => {
                    let name = key;
                    if (key === 'steel') name = '钢铁';
                    return `${name}: ${value}`;
                })
                .join('\n');

            return `
=====[炼钢报告]=====
${username} 同志：
■ 使用 ${steelmillCount} 个炼钢厂完成炼钢。
■ 消耗资源：
${consumedText}
■ 获得产物：
${producedText}
`.trim();
        });
}

// 占位函数 - 你需要根据你的逻辑实现它们 (同 RefineOil.ts)
function calculateWarehouseCapacity(region: Region): number {
    return region.warehouseCapacity || 100000; // 返回仓库总容量
}

function calculateUsedCapacity(warehouse: Record<string, number>): number {
    return Object.values(warehouse).reduce((sum, amount) => sum + (amount || 0), 0); // 返回当前已用容量
}