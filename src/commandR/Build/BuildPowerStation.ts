import { checkTerrain } from '../../commandP/terrain_check';
import { POWER_PLANTS } from "../../commandP/Power_plants";
import { Context } from "koishi";
import { Region } from '../../types';

export function registerConstructionCommands(ctx: Context) {
  // 动态注册所有发电厂建造指令
  Object.entries(POWER_PLANTS).forEach(([plantType, config]) => {
    ctx.command('地区建造 <type:string> <quantity:number>')
      .action(async ({ session }, type, quantity) => {
        if (!session) return '会话不存在';
        const username = session.author?.name || '未知用户';

        // 基础校验
        if (!Number.isInteger(quantity) || quantity <= 0) {
          return '数量必须为正整数';
        }
        const num = quantity; // 此时可以放心使用

        // 获取配置
        const plantConfig = POWER_PLANTS[type];
        if (!plantConfig) return '无效建筑类型';

        // 获取地区数据
        const region = await ctx.database.get('regiondata', {
          guildId: session.guildId?.toString() || '',
        });

        if (!region || region.length === 0) {
          return '地区数据不存在';
        }

        const { base, max_base } = region[0] as Region;

        // 建筑位校验
        if (base < num) {
          return `建筑位不足，当前可用：${base}/${max_base}`;
        }

        // 地形校验
        if (plantConfig.terrainCheck && !(await checkTerrain(session, ctx, plantConfig.terrainCheck))) {
          return `建造失败：需要满足地形条件 ${plantConfig.terrainCheck}`;
        }

        // 扣除建筑位
        await ctx.database.set(
          'regiondata',
          { guildId: session.guildId?.toString() || '' },
          { base: base - num }
        );

        // 生成建造报告
        return `
=====[土木工程]=====
${username} 同志：
■ 建造成功！
  □ 消耗资源：钢铁 × ${plantConfig.steelCost * num} 吨
  □ 消耗建筑位：${num}
  □ 占用劳动力：${plantConfig.laborCost * num} 人
  □ 新增发电量：${plantConfig.powerOutput * num} MW
■ 当前总发电量：--MW
${plantConfig.terrainCheck ? `（地形要求：${plantConfig.terrainCheck}）` : ''}
        `.trim();
      });
  });
}
