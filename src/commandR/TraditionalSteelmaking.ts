import { Context, Session } from 'koishi';
import { Region } from '../types'; // 确保 types.ts 的路径正确
import { TRandom } from '../utils/Random'; // 导入三角分布随机函数

export function TraditionalSteelmakingCommand(ctx: Context) {
  ctx.command('地区土法炼钢', '使用传统方法消耗铁矿石炼钢').alias('土法炼钢')
    .action(async ({ session }) => {
      if (!session || !session.guildId) {
        return '请在已绑定地区的群聊中使用此指令。';
      }

      const regionId = session.guildId;
      // --- 修改：正确获取地区数据 ---
      const regions = await ctx.database.get('regiondata', { guildId: regionId });
      if (!regions || regions.length === 0) {
        return '错误：找不到当前群聊绑定的地区数据。';
      }
      const region: Region = regions[0]; // 获取第一个匹配的地区
      // --- 修改结束 ---

      const requiredLabor = 20000;
      const requiredIronOre = 2000;
      const minSteel = 900;
      const modeSteel = 1200;
      const maxSteel = 1500;

      // 检查资源和劳动力
      if (region.Busylabor < requiredLabor) {
        return `劳动力不足！土法炼钢需要 ${requiredLabor} 空闲劳动力，当前仅有 ${region.Busylabor}。`;
      }
      if (!region.warehouse || region.warehouse.ironOre < requiredIronOre) {
        const currentIronOre = region.warehouse?.ironOre || 0;
        return `铁矿石不足！土法炼钢需要 ${requiredIronOre} 铁矿石，当前仓库仅有 ${currentIronOre}。`;
      }

      // 计算产出
      const steelProduced = TRandom(minSteel, maxSteel, modeSteel, true);

      // 更新仓库数据
      const newWarehouse = { ...region.warehouse };
      newWarehouse.ironOre = (newWarehouse.ironOre || 0) - requiredIronOre;
      newWarehouse.steel = (newWarehouse.steel || 0) + steelProduced;

      // --- 修改：扣除劳动力 --- 
      const newBusyLabor = region.Busylabor - requiredLabor;
      // --- 修改结束 ---

      // 更新数据库
      try {
        // --- 修改：正确更新数据库，指定更新条件，并包含劳动力更新 ---
        await ctx.database.set('regiondata', { guildId: regionId }, { warehouse: newWarehouse, Busylabor: newBusyLabor });
        // --- 修改结束 ---
        return `土法炼钢成功！消耗 ${requiredIronOre} 铁矿石和 ${requiredLabor} 劳动力，产出 ${steelProduced} 吨钢。`;
      } catch (error) {
        console.error(`[土法炼钢] 更新地区 ${regionId} 数据失败:`, error);
        return '执行土法炼钢时发生数据库错误，请稍后再试或联系管理员。';
      }
    });
}