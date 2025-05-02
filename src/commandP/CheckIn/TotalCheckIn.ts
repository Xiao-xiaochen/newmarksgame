
// src/commandP/CheckIn/TotalCheckIn.ts

import { Context } from 'koishi'
import { userdata } from '../../types' // 确保导入 userdata 类型
import { TRandom } from '../../utils/Random'

export function CheckIn(ctx: Context) {
  ctx.command('阅读报告').alias('签到')
    .action(async ({ session }) => {
      if (!session || !session.userId || !session.author) {
        return '无法获取用户信息。';
      }
      const username = session.author.name || '未知用户';
      const userId = session.userId;

      try {
        // 使用更符合约定的变量名 userInfo
        const userInfo = await ctx.database.get('userdata', { userId: userId });

        if (!userInfo || userInfo.length === 0) {
          // --- 用户不存在，创建新用户 ---
          const initialPopulation = TRandom(40000, 80000, 120000);
          const initialLabor = Math.floor(initialPopulation * 0.6);
          const InitialFarms = Math.max( 1, Math.floor( (initialPopulation / 30000) * TRandom( 0.6, 0.8, 1, false ) ) );
          const InitialFood = TRandom( 5, 10, 20 );

          // 新用户数据，使用 models.ts 中定义的 initial 值
          const newUser: userdata = {
            userId: userId,
            regionId: '', // 初始为空
            hasCheckedIn: true, // 注册即视为当天已签到/阅读报告
            population: initialPopulation,
            Labor: initialLabor,
            Busylabor: 0,
            Fixlabor: 0,
            base: 0,
            maxbase: 20, // 初始最大基础设施
            Department: 1, // 初始建筑部门

            // 仓库和资源使用 models.ts 中的默认初始值，但可以覆盖特定项
            warehouse: {
              food: InitialFood, // 设定初始食物
              goods: 0, rubber: 0, Mazout: 0, Diesel: 0, fuel: 0, Asphalt: 0, Gas: 0,
              rareMetal: 0, rareEarth: 0, coal: 0, ironOre: 0, steel: 0, aluminum: 0, oil: 0
            },
            militarywarehouse: {
              bomb: 0, car: 0, Tank: 0, AntiTankGun: 0, Artillery: 0, AWACS: 0, HeavyFighter: 0,
              InfantryEquipment: 0, LightFighter: 0, StrategicBomber: 0, TacticalBomber: 0, Transportaircraft: 0
            },
            resources: {
              rareMetal: 0, rareEarth: 0, coal: 0, ironOre: 0, aluminum: 0, oil: 0
            },

            // 建筑设施 (如果玩家个人拥有)
            farms: InitialFarms, 
            mfactory: 0,
            busymfactory: 0, 
            Mine: 0, 
            busymine: 0,
            oilwell: 0, 
            busyoilwell: 0, 
            steelmill: 0, 
            busysteelmill: 0,

            // 仓库容量
            warehouseCapacity: 200,
            OwarehouseCapacity: InitialFood,
            militarywarehouseCapacity: 200,
            OmilitarywarehouseCapacity: 0,

            // 国家相关
            countryName: null,
            isLeader: false,
            lastCountryLeaveTimestamp: 0,
          };

          await ctx.database.create('userdata', newUser);

          const formalPopulation = (newUser.population / 10000).toFixed(2);
          const formalLabor = (newUser.Labor / 10000).toFixed(2);

          return `
====[征战文游]====
${username} 同志！
□初始状态:
■ 人口：${formalPopulation}万 (劳动力 ${formalLabor}万)
■ 基础设施：${newUser.base}/${newUser.maxbase}
■ 建筑部门：${newUser.Department}
■ 仓库-粮食：${newUser.warehouse.food} / ${newUser.warehouseCapacity}
`.trim();
        } else {
          // --- 处理已注册用户的签到/阅读报告 ---
          const currentUserData = userInfo[0];

          if (currentUserData.hasCheckedIn === true) {
            return `
===[新马列文游]===
${username} 同志！
您今天已经阅读过报告了！无需重复操作。
`.trim();
          } else {
            // 每日奖励
            const populationIncrease = TRandom(300, 1000, 5000);
            const foodIncrease = TRandom(1, 3, 5); // 稍微增加点食物奖励

            // 更新用户数据
            const updatedPopulation = currentUserData.population + populationIncrease;
            // 确保 warehouse 对象存在 (虽然 model 有 initial，增加健壮性)
            const updatedWarehouse = currentUserData.warehouse || { food: 0 };
            updatedWarehouse.food = (updatedWarehouse.food || 0) + foodIncrease;

            // 计算新的仓库占用
            // 注意：这里简化处理，实际应计算所有物资总和
            const updatedOwarehouseCapacity = Object.values(updatedWarehouse).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);


            await ctx.database.set('userdata', { userId: userId }, {
              hasCheckedIn: true,
              population: updatedPopulation,
              Labor: Math.floor(updatedPopulation * 0.6), // 同时更新劳动力
              warehouse: updatedWarehouse,
              OwarehouseCapacity: updatedOwarehouseCapacity // 更新仓库占用
            });

            return `
===[新马列文游]===
${username} 同志！
每日报告已阅，获得物资：
■ 人口：+${populationIncrease}
■ 仓库-粮食：+${foodIncrease}
`.trim();
          }
        }
      } catch (error) {
        console.error('阅读报告/注册时数据库操作错误:', error);
        return '处理报告时发生数据库错误，请联系管理员或查看控制台日志。';
      }
    });
}
