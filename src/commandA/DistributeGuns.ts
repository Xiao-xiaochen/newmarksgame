import { Context, Session } from 'koishi';
import { Region, userdata, Army } from '../types'; // 导入所需类型
import { findArmyByTarget } from '../utils/ArmyUtils'; // 导入查找军队的工具函数
import { INFANTRY_EQUIPMENT_STATS } from '../core/equipmentStats';
import { format } from '../utils/Format';

const EQUIPMENT_KEY: keyof Region['militarywarehouse'] = 'InfantryEquipment'; // 固定为步兵装备
const EQUIPMENT_NAME = '枪械'; // 显示名称

export function DistributeGuns(ctx: Context) {
  // --- 修改命令描述 ---
  ctx.command('发枪 <target:string> <amount:number>', '为指定军队发放地区仓库中的枪械（步兵装备）')
    .usage('发枪 <军队名称或编号> <数量>')
    .example('发枪 11451 500')
    .example('发枪 1145第一军 1000')
    .action(async ({ session }, target, amount) => {
      if (!session || !session.userId || !session.author) {
        return '无法获取用户信息。';
      }
      if (!session.guildId) {
        return '此命令只能在群聊中使用。';
      }
      if (!target || !amount) {
        return '请输入有效的军队名称/编号和要发放的数量。';
      }
      if (amount <= 0 || !Number.isInteger(amount)) {
        return '发放数量必须是正整数。';
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
          return `您不是军队 ${army.name} (${army.armyId}) 的指挥官，也不是地区 ${regionId} 的领导，无权发放枪械。`;
        }

        // 5. 检查地区仓库是否有足够枪械
        const regionEquipmentCount = regionMilitaryWarehouse[EQUIPMENT_KEY] || 0;
        if (regionEquipmentCount < amount) {
          return `地区 ${regionId} 的军用仓库中 ${EQUIPMENT_NAME} 数量不足 (${regionEquipmentCount})，无法发放 ${amount} 件。`;
        }

        // 6. 执行装备转移
        const updatedRegionEquipmentCount = regionEquipmentCount - amount;
        const updatedArmyEquipmentCount = (armyEquipment[EQUIPMENT_KEY] || 0) + amount;

        // --- 更新地区仓库和军队装备 ---
        const updatedRegionMilitaryWarehouse = { ...regionMilitaryWarehouse, [EQUIPMENT_KEY]: updatedRegionEquipmentCount };
        const updatedArmyEquipment = { ...armyEquipment, [EQUIPMENT_KEY]: updatedArmyEquipmentCount };

        // --- 新增：计算新的总组织度 ---
        // 注意：这里简单地只计算了步兵装备的组织度。如果未来有其他装备提供组织度，需要累加。
        const newTotalOrganization = updatedArmyEquipmentCount * INFANTRY_EQUIPMENT_STATS.organization;

        // --- 更新数据库：更新 regiondata, army (包括 organization) ---
        await ctx.database.set('regiondata', { RegionId: regionId }, { militarywarehouse: updatedRegionMilitaryWarehouse });
        await ctx.database.set('army', { armyId: army.armyId }, {
            equipment: updatedArmyEquipment,
            organization: newTotalOrganization // 更新组织度
        });

        // --- 修改成功消息，加入组织度信息 ---
        return `
====[军事系统]====
军队名称：${army.name}
军队编号：${army.armyId}
军队现有：
■${EQUIPMENT_NAME}：${format(updatedArmyEquipmentCount)}
总组织度：${format(newTotalOrganization)}
仓库剩余：
■${EQUIPMENT_NAME}：${format(updatedRegionEquipmentCount)}`;
      } catch (error) {
        console.error(`处理发枪命令时出错 (用户: ${userId}, 军队: ${target}, 数量: ${amount}):`, error);
        const errorMessage = (error as Error).message;
        return `处理发枪命令时发生内部错误: ${errorMessage}`;
      }
    });
}