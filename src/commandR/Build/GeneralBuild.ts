import { checkTerrain } from '../../commandP/terrain_check';
import { POWER_PLANTS } from "../../core/Buiilding";           // 所有发电厂的配置，我的协作者，你要高内聚低耦合啊！
import { Context } from "koishi";
import { Region } from '../../types';

export function GeneralBuild(ctx: Context) {
  ctx.command('地区建造 <type:string> <quantity:number>')
  .action(async ({ session }, type, quantity) => {
    if (!session) {
      return '会话不存在'
    }
    const guildId = session?.guildId  || '未知频道'
    const username = session.author?.name || '未知用户'
    const userId = session.userId
    if (!userId) {
      return '无法获取用户ID'
    }
    const num = quantity; // 此时可以放心使用

    const plantConfig = POWER_PLANTS[type];
    if (!plantConfig) return '无效建筑类型';
        // 获取地区数据
    const region = await ctx.database.get('regiondata', { guildId })
    if (!region || region.length === 0) {
      return '地区数据不存在';
    }
    const { base, maxbase } = region[0]
                // 基础校验
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return '数量必须为正整数';
    }
      // 建筑位校验
    if ( maxbase < num ) {
      return `建筑位不足，当前可用：${base}/${maxbase}`;
    }
        // 扣除建筑位
    await ctx.database.set( 'regiondata' , { guildId }, { base: base - num })
    return `
=====[土木工程]=====
${username} 同志：
■ 建造成功！
□ 消耗资源：
钢铁 × ${plantConfig.steelCost * num} 吨
□ 消耗建筑位：${num}
□ 占用劳动力：
${plantConfig.laborCost * num} 人
`.trim();
  });
}
