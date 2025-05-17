
import { Context, Session } from 'koishi';
import { BUILDINGS, getBuildingDefinitionByName } from '../core/Buildings'; // 导入通用建筑定义
import { Region, userdata } from '../types'; // 导入类型

export function GeneralBuild(ctx: Context) {
  ctx.command('地区建造 <type:string> [quantity:number]') // 将 quantity 设为可选，默认为 1
    .alias('建') // 添加别名
    .action(async ({ session }, type, quantity = 1) => { // 默认数量为 1
      if (!session || !session.userId || !session.guildId) {
        return '无法获取必要的用户或频道信息。';
      }
      const userId = session.userId;
      const guildId = session.guildId; // 使用 guildId 作为地区标识符
      const username = session.author?.name || '未知用户';

      // --- 基础校验 ---
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return '数量必须为正整数。';
      }

      // --- 获取用户和地区数据 ---
      const userData = await ctx.database.get('userdata', { userId });
      if (!userData || userData.length === 0) {
        return '找不到您的用户数据，请先注册或签到。';
      }
      const user = userData[0];

      if (!user.regionId) {
        return '您当前未驻扎在任何地区，请先使用“驻扎”指令。'; // 提示需要驻扎
      }

      // 使用 guildId 查询地区数据 (假设 guildId 就是 RegionId 或需要映射)
      // **重要**: 如果 guildId 不是 RegionId，你需要根据 user.regionId 查询
      const regionData = await ctx.database.get('regiondata', { RegionId: user.regionId });
      if (!regionData || regionData.length === 0) {
        return `找不到您驻扎的地区 ${user.regionId} 的数据。`;
      }
      const region = regionData[0];

      // --- 权限校验 ---
      if (!region.owner) {
        return `地区 ${region.RegionId} 当前为无主地，无法进行国家级建造。`;
      }
      if (user.countryName !== region.owner) {
        return `您不属于控制该地区 (${region.RegionId}) 的国家 (${region.owner})。`;
      }

      // --- 获取建筑定义 ---
      const buildingDef = getBuildingDefinitionByName(type);
      if (!buildingDef) {
        // 列出所有可建造建筑的名称
        const availableBuildings = Object.values(BUILDINGS).map(b => b.name).join('、');
        return `无效的建筑类型：“${type}”。\n可建造类型有：${availableBuildings}`;
      }

      // --- 检查资源和基础设施 ---
      const requiredSteel = (buildingDef.buildCost.steel || 0) * quantity;
      const requiredConcrete = (buildingDef.buildCost.concrete || 0) * quantity;
      const requiredMachinery = (buildingDef.buildCost.machinery || 0) * quantity;
      const requiredInfrastructure = buildingDef.infrastructureCost * quantity;

      // 明确 currentWarehouse 的类型，并提供包含所有必需键的默认值
      const defaultWarehouse: Required<Region['warehouse']> = {
          food: 0, goods: 0, rubber: 0, Mazout: 0, Diesel: 0, fuel: 0, Asphalt: 0, Gas: 0,
          rareMetal: 0, rareEarth: 0, coal: 0, ironOre: 0, steel: 0, aluminum: 0, oil: 0,
          stone: 0, concrete: 0, machinery: 0, // 确保所有 warehouse 中的键都在这里，值为 0
          // 如果 warehouse 接口还有其他属性，也需要在这里添加
      };
      const currentWarehouse: Required<Region['warehouse']> = {
          ...defaultWarehouse, // 先用默认值填充
          ...(region.warehouse || {}), // 再用数据库中的值覆盖（如果存在）
      };

      // 现在可以安全地访问属性，因为 currentWarehouse 保证有这些键
      const currentSteel = currentWarehouse.steel;
      const currentConcrete = currentWarehouse.concrete;
      const currentMachinery = currentWarehouse.machinery;
      const currentBase = region.base || 0;
      const maxBase = region.maxbase || 0;
      const availableInfrastructure = maxBase - currentBase; // 可用基建空间
      const requiredConstructionPoints = buildingDef.buildCost.constructionPoints * quantity;
      const currentConstructionCapacity = region.Constructioncapacity || 0;

      const missingResources: string[] = [];
      if (currentSteel < requiredSteel) missingResources.push(`钢铁: ${requiredSteel - currentSteel}`);
      if (currentConcrete < requiredConcrete) missingResources.push(`混凝土: ${requiredConcrete - currentConcrete}`);
      if (currentMachinery < requiredMachinery) missingResources.push(`机械: ${requiredMachinery - currentMachinery}`);

      if (missingResources.length > 0) {
        return `资源不足！缺少：\n${missingResources.join('\n')}`;
      }

      if (availableInfrastructure < requiredInfrastructure) {
        return `基础设施空间不足！需要 ${requiredInfrastructure}，可用 ${availableInfrastructure} (当前 ${currentBase}/${maxBase})。请先建造更多“基础设施”。`;
      }

      // --- 修改：检查建造力 --- 
      if (currentConstructionCapacity < requiredConstructionPoints) {
        return `建造力不足！需要 ${requiredConstructionPoints}，当前拥有 ${currentConstructionCapacity}。`;
      }
      // --- 修改结束 --- 

      // --- 扣除资源、基础设施和建造力 --- 
      const updatedWarehouse = { ...currentWarehouse };
      updatedWarehouse.steel -= requiredSteel;
      updatedWarehouse.concrete -= requiredConcrete;
      updatedWarehouse.machinery -= requiredMachinery;

      const updatedBase = currentBase + requiredInfrastructure;
      const updatedConstructionCapacity = currentConstructionCapacity - requiredConstructionPoints;

      // --- 修改：直接增加建筑数量 --- 
      const buildingKey = buildingDef.key;
      const currentBuildingCount = (region[buildingKey] as number) || 0;
      const newBuildingCount = currentBuildingCount + quantity;
      const updatePayload: Partial<Region> = {
        warehouse: updatedWarehouse,
        base: updatedBase,
        Constructioncapacity: updatedConstructionCapacity,
        [buildingKey]: newBuildingCount, // 直接更新建筑数量
      };
      // --- 修改结束 --- 

      // --- 移除建造队列逻辑 --- 
      // let queue: ConstructionQueueItem[] = [];
      // try { ... } catch { ... }
      // queue.push({ ... });
      // const updatedQueueString = JSON.stringify(queue);
      // --- 移除结束 --- 

      // --- 更新数据库 --- 
      try {
        // --- 修改：使用新的更新载荷，移除 constructionQueue --- 
        await ctx.database.set('regiondata', { RegionId: region.RegionId }, updatePayload);
        // --- 修改结束 --- 
      } catch (dbError) {
        console.error(`Database update error during build command for region ${region.RegionId}:`, dbError);
        return '数据库更新失败，建造未完成，资源未扣除。请重试或联系管理员。';
      }

      // --- 返回成功信息 --- 
      const costDetails = [
        requiredSteel > 0 ? `钢铁 × ${requiredSteel}` : null,
        requiredConcrete > 0 ? `混凝土 × ${requiredConcrete}` : null,
        requiredMachinery > 0 ? `机械 × ${requiredMachinery}` : null,
      ].filter(Boolean).join('\n');

      // --- 修改：调整反馈信息为即时完成 --- 
      return `
=====[土木工程]=====
${username} 同志：
■ ${quantity} 个 ${buildingDef.name} 已在地区 ${region.RegionId} 建造完成！
□ 消耗物资：
${costDetails || '无'}
□ 消耗基础设施：${requiredInfrastructure} (当前 ${updatedBase}/${maxBase})
□ 消耗建造力：${requiredConstructionPoints} (剩余 ${updatedConstructionCapacity})
□ ${buildingDef.name} 总数：${newBuildingCount}
`.trim();
      // --- 修改结束 ---
    });
}
