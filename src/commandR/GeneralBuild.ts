
import { Context, Session } from 'koishi';
import { BUILDINGS, getBuildingDefinitionByName } from '../core/Buildings'; // 导入通用建筑定义
import { Region, userdata } from '../types'; // 导入类型

// 定义建造队列项结构
interface ConstructionQueueItem {
  type: string; // 建筑显示名称
  key: keyof Region; // 对应 Region 的字段 key
  remainingPoints: number; // 剩余所需建造点数
  quantity: number; // 本次建造的数量
}

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

      const missingResources: string[] = [];
      // 检查逻辑不变
      if (currentSteel < requiredSteel) missingResources.push(`钢铁: ${requiredSteel - currentSteel}`);
      if (currentConcrete < requiredConcrete) missingResources.push(`混凝土: ${requiredConcrete - currentConcrete}`);
      if (currentMachinery < requiredMachinery) missingResources.push(`机械: ${requiredMachinery - currentMachinery}`);

      if (missingResources.length > 0) {
        return `资源不足！缺少：\n${missingResources.join('\n')}`;
      }

      if (availableInfrastructure < requiredInfrastructure) {
        return `基础设施空间不足！需要 ${requiredInfrastructure}，可用 ${availableInfrastructure} (当前 ${currentBase}/${maxBase})。请先建造更多“基础设施”。`;
      }

      // --- 扣除资源和基础设施 ---
      // updatedWarehouse 基于有完整结构的 currentWarehouse 创建，类型也是安全的
      const updatedWarehouse = { ...currentWarehouse };
      updatedWarehouse.steel -= requiredSteel;
      updatedWarehouse.concrete -= requiredConcrete;
      updatedWarehouse.machinery -= requiredMachinery;

      const updatedBase = currentBase + requiredInfrastructure; // 建筑消耗基建，增加已用基建

      // --- 更新建造队列 ---
      let queue: ConstructionQueueItem[] = [];
      try {
        if (region.constructionQueue) {
          queue = JSON.parse(region.constructionQueue);
        }
      } catch (error) {
        console.error(`Error parsing construction queue for region ${region.RegionId}:`, error);
        // 可以选择返回错误或清空队列继续
        // return '处理建造队列时出错，请联系管理员。';
      }

      // 检查队列长度限制 (可选)
      // if (queue.length >= MAX_QUEUE_LENGTH) {
      //   return `建造队列已满 (最大 ${MAX_QUEUE_LENGTH} 项)。`;
      // }

      queue.push({
        type: buildingDef.name,
        key: buildingDef.key,
        remainingPoints: buildingDef.buildCost.constructionPoints,
        quantity: quantity,
      });

      const updatedQueueString = JSON.stringify(queue);

      // --- 更新数据库 ---
      try {
        await ctx.database.set('regiondata', { RegionId: region.RegionId }, {
          warehouse: updatedWarehouse,
          base: updatedBase,
          constructionQueue: updatedQueueString,
        });
      } catch (dbError) {
        console.error(`Database update error during build command for region ${region.RegionId}:`, dbError);
        return '数据库更新失败，建造未开始，资源未扣除。请重试或联系管理员。'; // 最好能回滚或标记问题
      }


      // --- 返回成功信息 ---
      const costDetails = [
        requiredSteel > 0 ? `钢铁 × ${requiredSteel}` : null,
        requiredConcrete > 0 ? `混凝土 × ${requiredConcrete}` : null,
        requiredMachinery > 0 ? `机械 × ${requiredMachinery}` : null,
      ].filter(Boolean).join('\n'); // 过滤掉数量为0的资源

      return `
=====[土木工程]=====
${username} 同志：
■ ${quantity} 个 ${buildingDef.name} 已加入地区 ${region.RegionId} 的建造队列！
□ 消耗资源：
${costDetails || '无'}
□ 消耗基础设施：${requiredInfrastructure} (当前 ${updatedBase}/${maxBase})
□ 预计需要建造点数：${buildingDef.buildCost.constructionPoints * quantity}
`.trim();
    });
}
