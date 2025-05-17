import { Context, Session } from 'koishi';
import { Region, userdata, BuildingDefinition } from '../types'; // 导入类型
import { BUILDINGS, getBuildingDefinitionByName } from '../core/Buildings'; // 导入建筑定义

// 允许分配/取消分配劳动力的建筑类型名称列表 (与 Labor.ts 保持一致)
// --- 修改：移除 '炼钢厂', '混凝土厂', '机械厂', '炼油厂' --- 
const ALLOCATABLE_BUILDING_NAMES = ['农场', '轻工厂', '矿场', '建筑部门', '油井'];
// --- 修改结束 ---

// 辅助函数：获取建筑定义对应的 key
function getBuildingKeyByName(name: string): keyof Region | null {
    const def = getBuildingDefinitionByName(name);
    return def ? def.key : null;
}

export function DislaborCommand(ctx: Context) {
    ctx.command('地区取消分配劳动力 <buildingName:string> <laborAmount:number>', '从指定生产建筑取消分配劳动力，使其变为空闲')
        .alias('取消分配劳工', '解雇劳工')
        .action(async ({ session }, buildingName, laborAmount) => {
            if (!session || !session.userId || !session.author) {
                return '无法获取用户信息。';
            }
            if (!session.guildId) {
                return '此命令只能在群聊中使用。';
            }
            if (!Number.isInteger(laborAmount) || laborAmount <= 0) {
                return '要取消的劳动力数量必须为正整数。';
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
                return `地区 ${targetRegionId} 当前为无主地，无法取消分配劳动力。`;
            }
            if (user.countryName !== region.owner) {
                return `您 (${user.countryName}) 不属于控制该地区 (${targetRegionId}) 的国家 (${region.owner})，无法下达取消分配指令。`;
            }

            // --- 验证建筑类型 ---
            if (!ALLOCATABLE_BUILDING_NAMES.includes(buildingName)) {
                return `无效的建筑类型：“${buildingName}”。\n只允许为 ${ALLOCATABLE_BUILDING_NAMES.join('、')} 取消分配劳动力。`;
            }
            const buildingKey = getBuildingKeyByName(buildingName);
            const buildingDef = getBuildingDefinitionByName(buildingName);
            if (!buildingKey || !buildingDef || !buildingDef.operation?.fixLabor) {
                return `无法找到有效的建筑定义或该建筑 (${buildingName}) 不需要分配固定劳动力。`;
            }

            // --- 检查当前分配情况 ---
            const currentAllocation: Record<string, number> = region.laborAllocation || {};
            const allocatedToBuilding = currentAllocation[buildingKey] || 0;

            if (allocatedToBuilding === 0) {
                return `${buildingName} 当前没有分配任何劳动力。`;
            }

            if (laborAmount > allocatedToBuilding) {
                return `取消的劳动力数量 (${laborAmount}) 不能超过当前已分配给 ${buildingName} 的数量 (${allocatedToBuilding})。`;
            }

            // --- 更新分配和空闲劳动力 ---
            const updatedAllocation = { ...currentAllocation };
            updatedAllocation[buildingKey] = allocatedToBuilding - laborAmount;
            // 如果减少后为0，可以从对象中移除该键 (可选)
            if (updatedAllocation[buildingKey] === 0) {
                delete updatedAllocation[buildingKey];
            }

            const currentIdleLabor = region.Busylabor || 0;
            const updatedIdleLabor = currentIdleLabor + laborAmount;

            // --- 更新数据库 ---
            try {
                await ctx.database.set('regiondata', { RegionId: targetRegionId }, {
                    laborAllocation: updatedAllocation,
                    Busylabor: updatedIdleLabor
                });
            } catch (dbError) {
                console.error(`Database update error during dislabor command for region ${targetRegionId}:`, dbError);
                return '数据库更新失败，劳动力分配未更改。请重试或联系管理员。';
            }

            // --- 生成反馈信息 ---
            const allocationDetails = Object.entries(updatedAllocation)
                .map(([key, count]) => {
                    const def = Object.values(BUILDINGS).find(b => b.key === key);
                    return `${def ? def.name : key}: ${count}`;
                })
                .join('\n');
            const totalAllocated = Object.values(updatedAllocation).reduce((sum, count) => sum + count, 0);

            return `
=====[劳动人事部 - 调令]=====
${username} 同志：
■ 已成功从 ${buildingName} 取消分配 ${laborAmount} 劳动力。
□ 地区 ${targetRegionId} 当前劳动力分配：
总人口: ${region.population}
空闲劳动力: ${updatedIdleLabor}
已分配劳动力: ${totalAllocated}
详细分配:
${allocationDetails || '无'}
`.trim();
        });
}