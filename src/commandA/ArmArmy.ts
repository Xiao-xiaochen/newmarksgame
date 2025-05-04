import { Context, Session } from 'koishi';
import { Region, userdata, Army } from '../types';
import { findArmyByTarget } from '../utils/ArmyUtils';
// --- 新增：导入装备配置 ---
// 注意：如果未来支持多种装备，需要更复杂的逻辑来获取对应装备的 stats
import { INFANTRY_EQUIPMENT_STATS } from '../core/equipmentStats';

// --- 修改：定义支持的装备类型及其在 regiondata.militarywarehouse 中的键名 ---
// 注意：确保这些键名在 Region 和 userdata 的 militarywarehouse 中都存在且意义相同
const SUPPORTED_EQUIPMENT: Record<string, keyof Region['militarywarehouse']> = {
  '枪械': 'InfantryEquipment',
  '步兵装备': 'InfantryEquipment',
  // 未来可以扩展其他装备类型，例如：
  // '坦克': 'Tank',
  // '火炮': 'Artillery',
};

export function ArmArmy(ctx: Context) {
  // --- 修改命令描述 ---
  ctx.command('武装 <equipmentType:string> <target:string> <amount:number>', '为指定军队配备地区仓库中的装备')
    .alias('装备军队')
    .usage('武装 <装备类型> <军队名称或编号> <数量>')
    .example('武装 枪械 11451 500')
    .example('武装 步兵装备 1145第一军 1000')
    .action(async ({ session }, equipmentType, target, amount) => {
      if (!session || !session.userId || !session.author) {
        return '无法获取用户信息。';
      }
      if (!session.guildId) {
        return '此命令只能在群聊中使用。';
      }
      if (!equipmentType || !target || !amount) {
        return '请输入有效的装备类型、军队名称/编号和要装备的数量。';
      }
      if (amount <= 0 || !Number.isInteger(amount)) {
        return '装备数量必须是正整数。';
      }

      // 检查装备类型是否支持
      const equipmentKey = SUPPORTED_EQUIPMENT[equipmentType];
      if (!equipmentKey) {
        return `不支持的装备类型：“${equipmentType}”。目前支持：${Object.keys(SUPPORTED_EQUIPMENT).join(', ')}。`;
      }

      const userId = session.userId;
      const guildId = session.guildId;
      const username = session.author.name || '未知用户';

      try {
        // 1. 获取用户数据 (仍然需要用于权限检查)
        const userDataResult = await ctx.database.get('userdata', { userId: userId });
        if (!userDataResult || userDataResult.length === 0) {
          return `${username} 同志，您尚未注册。`;
        }
        const user: userdata = userDataResult[0];
        // --- 不再需要获取用户仓库 ---
        // const userMilitaryWarehouse = user.militarywarehouse || {};

        // 2. 获取当前群聊绑定的地区数据
        const regionDataResult = await ctx.database.get('regiondata', { guildId: guildId });
        if (!regionDataResult || regionDataResult.length === 0) {
          return `当前群聊 (${guildId}) 未绑定任何地区。`;
        }
        const region: Region = regionDataResult[0];
        const regionId = region.RegionId;
        const regionMilitaryWarehouse = region.militarywarehouse || {};

        // 3. 查找目标军队
        const army = await findArmyByTarget(ctx, target, regionId);
        if (!army) {
          return `在地区 ${regionId} 未找到指定的军队 "${target}"。`;
        }
        const armyEquipment = army.equipment || {};

        // 4. 检查权限 (指挥官或地区领导)
        if (army.commanderId !== userId && region.leader !== userId) {
          return `您不是军队 ${army.name} (${army.armyId}) 的指挥官，也不是地区 ${regionId} 的领导，无权进行武装。`;
        }

        // --- 5. 检查地区仓库是否有足够装备 ---
        const regionEquipmentCount = regionMilitaryWarehouse[equipmentKey] || 0;
        if (regionEquipmentCount < amount) {
          // --- 修改错误消息 ---
          return `地区 ${regionId} 的军用仓库中 ${equipmentType} 数量不足 (${regionEquipmentCount})，无法装备 ${amount} 件。`;
        }

        // 6. 执行装备转移
        // --- 修改来源数量 ---
        const updatedRegionEquipmentCount = regionEquipmentCount - amount;
        const updatedArmyEquipmentCount = (armyEquipment[equipmentKey] || 0) + amount;

        // --- 更新地区仓库和军队装备 ---
        const updatedRegionMilitaryWarehouse = { ...regionMilitaryWarehouse, [equipmentKey]: updatedRegionEquipmentCount };
        const updatedArmyEquipment = { ...armyEquipment, [equipmentKey]: updatedArmyEquipmentCount };

        // --- 新增：计算新的总组织度 ---
        let newTotalOrganization = army.organization || 0; // 保留旧值或从0开始
        // 仅当装备是步兵装备时，才重新计算组织度
        if (equipmentKey === 'InfantryEquipment') {
            // 重新计算所有步兵装备提供的组织度
            const currentInfantryEqCount = updatedArmyEquipment['InfantryEquipment'] || 0;
            newTotalOrganization = currentInfantryEqCount * INFANTRY_EQUIPMENT_STATS.organization;
            // 如果未来有其他装备提供组织度，需要在这里累加:
            // newTotalOrganization += (updatedArmyEquipment['OtherOrgEq'] || 0) * OTHER_ORG_EQ_STATS.organization;
        }


        // --- 更新数据库：更新 regiondata, army (包括 organization) ---
        await ctx.database.set('regiondata', { RegionId: regionId }, { militarywarehouse: updatedRegionMilitaryWarehouse });
        await ctx.database.set('army', { armyId: army.armyId }, {
            equipment: updatedArmyEquipment,
            organization: newTotalOrganization // 更新组织度
        });

        // --- 修改成功消息，加入组织度信息 ---
        return `成功为军队 ${army.name} (${army.armyId}) 配备了 ${amount} 件 ${equipmentType}。\n军队现有 ${equipmentType}：${updatedArmyEquipmentCount} (总组织度: ${newTotalOrganization})\n地区仓库剩余 ${equipmentType}：${updatedRegionEquipmentCount}`;

      } catch (error) {
        console.error(`处理武装命令时出错 (用户: ${userId}, 装备: ${equipmentType}, 军队: ${target}, 数量: ${amount}):`, error);
        const errorMessage = (error as Error).message;
        return `处理武装命令时发生内部错误: ${errorMessage}`;
      }
    });
}