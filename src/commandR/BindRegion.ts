import { Context } from 'koishi';
import { Region } from '../types'; // 导入 Region 类型
import { TRandom } from '../utils/Random'; // 导入 TRandom 工具

export function BindRegion(ctx: Context) {
  ctx.command('绑定地区 <regionId:string>')
    .usage('将指定的地区与当前群聊绑定。仅国家领导人可操作，且只能绑定自己国家拥有的地区。')
    .example('绑定地区 0101')
    .action(async ({ session }, regionId) => {
      if (!session || !session.guildId) {
        return '此命令只能在群聊中使用。';
      }
      if (!regionId || !/^\d{4}$/.test(regionId)) {
        return '请提供有效的4位数地区编号，例如：0101';
      }

      const userId = session.userId;
      const guildId = session.guildId;
      const username = session.author?.name || '未知用户';

      if (!userId) {
        return '无法获取用户信息。';
      }

      try {
        // 1. 验证用户是否为领导人
        const userData = await ctx.database.get('userdata', { userId: userId, isLeader: true });
        if (!userData || userData.length === 0) {
          return `${username} 同志，您不是国家领导人，无权执行此操作。`;
        }
        const userCountryName = userData[0].countryName;
        if (!userCountryName) {
            return `${username} 同志，您的用户数据中缺少国家信息。`;
        }

        // 2. 获取地区信息
        const regionDataResult = await ctx.database.get('regiondata', { RegionId: regionId });
        if (!regionDataResult || regionDataResult.length === 0) {
          return `错误：找不到地区 ${regionId} 的信息。`;
        }
        const region: Region = regionDataResult[0]; // 获取地区数据

        // 3. 检查地区是否属于该国家
        if (region.owner !== userCountryName) {
          return `地区 ${regionId} 不属于您的国家 ${userCountryName}。`;
        }

        // 4. 检查地区是否已被其他有效群聊绑定 (非4位数ID)
        const currentGuildId = region.guildId;
        const isCurrentlyBound = currentGuildId && currentGuildId !== guildId && !/^\d{4}$/.test(String(currentGuildId));
        if (isCurrentlyBound) {
          return `地区 ${regionId} 已被群聊 ${currentGuildId} 绑定。`;
        }

        // 5. 检查是否已绑定到当前群聊
        if (currentGuildId === guildId) {
            return `地区 ${regionId} 已经绑定到当前群聊。`;
        }

        // 6. 检查当前群聊是否已绑定其他地区
        const existingBinding = await ctx.database.get('regiondata', { guildId: guildId });
        if (existingBinding && existingBinding.length > 0 && existingBinding[0].RegionId !== regionId) {
          return `当前群聊已绑定了地区 ${existingBinding[0].RegionId}，请先解绑或联系管理员。`;
        }

        // --- 核心逻辑：首次绑定时添加初始资源和建筑 ---
        let initialSetupMessage = '';
        let gaveInitialResources = false;
        // 检查 region.guildId 是否为空或是4位数，表示这是首次有效绑定
        const isFirstBinding = !currentGuildId || /^\d{4}$/.test(String(currentGuildId));

        if (isFirstBinding) {
            gaveInitialResources = true; // 标记发放了初始资源
            initialSetupMessage = '首次绑定，发放初始资源和建筑：';
            const updatedRegionData: Partial<Region> = {};

            // --- 修改：确保仓库对象包含所有必需的键 ---
            const defaultWarehouse = { // 定义所有仓库键的默认值
                food: 0, goods: 0, rubber: 0, Mazout: 0, Diesel: 0, fuel: 0, Asphalt: 0, Gas: 0,
                rareMetal: 0, rareEarth: 0, coal: 0, ironOre: 0, steel: 0, aluminum: 0, oil: 0,
                concrete: 0, stone: 0, machinery: 0 // 补充可能缺少的键
            };
            const defaultMilitaryWarehouse = { // 定义所有军仓键的默认值
                bomb: 0, car: 0, Tank: 0, AntiTankGun: 0, Artillery: 0, AWACS: 0, HeavyFighter: 0,
                InfantryEquipment: 0, LightFighter: 0, StrategicBomber: 0, TacticalBomber: 0, Transportaircraft: 0
            };

            // 先扩展默认值，再扩展现有值，确保所有键存在
            const updatedWarehouse = { ...defaultWarehouse, ...(region.warehouse || {}) };
            const updatedMilitaryWarehouse = { ...defaultMilitaryWarehouse, ...(region.militarywarehouse || {}) };
            // --- 修改结束 ---


            // a. 初始建筑部门
            const initialDepartments = 1;
            updatedRegionData.Department = initialDepartments;
            initialSetupMessage += `\n - 建筑部门: +${initialDepartments}`;

            // b. 初始农田
            const initialPopulation = region.population || 50000;
            const initialFarms = Math.max( 1, Math.floor( (initialPopulation / 30000) * TRandom( 0.6, 0.8, 1, false ) ) );
            updatedRegionData.farms = initialFarms;
            initialSetupMessage += `\n - 农田: +${initialFarms}`;

            // c. 初始矿场 (例如，数量是农田的一半左右，最少1个)
            const initialMines = Math.max(1, Math.floor(initialFarms * TRandom(0.4, 0.5, 0.6)));
            // --- 修正：确保使用小写的 mines ---
            updatedRegionData.Mine = initialMines;
            initialSetupMessage += `\n - 矿场: +${initialMines}`;

            // d. 初始粮食
            const dailyFoodNeed = Math.ceil(initialPopulation * 0.0001);
            const initialFood = Math.max(10, Math.ceil(dailyFoodNeed * TRandom(0.8, 1.0, 1.2)));
            // --- 修改：直接在保证类型安全的对象上操作 ---
            updatedWarehouse.food += initialFood;
            initialSetupMessage += `\n - 仓库-粮食: +${initialFood}`;

            // e. 初始生活消费品
            const dailyGoodsNeed = Math.ceil(initialPopulation * 0.00005);
            const initialGoods = Math.max(5, Math.ceil(dailyGoodsNeed * TRandom(0.8, 1.0, 1.2)));
            // --- 修改：直接在保证类型安全的对象上操作 ---
            updatedWarehouse.goods += initialGoods;
            initialSetupMessage += `\n - 仓库-消费品: +${initialGoods}`;

            // f. 初始步兵装备
            const initialInfEq = TRandom(2000, 3500, 5000);
            // --- 修改：直接在保证类型安全的对象上操作 ---
            updatedMilitaryWarehouse.InfantryEquipment += initialInfEq;
            initialSetupMessage += `\n - 军仓-步兵装备: +${initialInfEq}`;

            // 更新仓库对象 (现在类型是安全的)
            updatedRegionData.warehouse = updatedWarehouse;
            updatedRegionData.militarywarehouse = updatedMilitaryWarehouse;

            // 7. 执行绑定并应用初始设置
            await ctx.database.set('regiondata', { RegionId: regionId }, {
              ...updatedRegionData, // 应用初始建筑和仓库更新
              guildId: guildId // 设置新的 guildId
            });

        } else {
             // 如果不是首次绑定，只更新 guildId
             await ctx.database.set('regiondata', { RegionId: regionId }, { guildId: guildId });
        }

        // 8. 发送消息
        await session.send(`成功将地区 ${regionId} (属于 ${userCountryName}) 绑定到当前群聊。`);
        if (gaveInitialResources) {
            await session.send(initialSetupMessage); // 如果发放了资源，单独发送资源消息
        }

        return; // 因为消息已发送，不再返回字符串

      } catch (error) {
        console.error(`绑定地区 ${regionId} 到群聊 ${guildId} 时出错:`, error);
        const errorMessage = (error as Error).message;
        return `绑定地区时发生错误: ${errorMessage}`; // 错误消息仍然返回
      }
    });
}