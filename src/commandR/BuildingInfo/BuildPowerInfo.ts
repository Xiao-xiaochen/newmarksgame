// src\commandR\RegionInfo\BuildPowerInfo.ts

import { Context } from 'koishi';
import { Region } from '../../types'; // 导入 Region 类型

export function BuildPowerInfo(ctx: Context) {
  ctx.command('查看地区建筑业').alias('地区建筑业', '地区建造力', '查看地区建造力') // 更新指令名称和别名
  .action(async ( {session} ) => {
    const username = session?.author?.name || '未知用户';
    const guildId = session?.guildId;

    if (!session || !guildId) {
      return '无法获取会话或频道信息。';
    }

    try {
      // 1. 根据 guildId 查询地区数据
      const regionDataResult = await ctx.database.get('regiondata', { guildId: guildId });
      if (!regionDataResult || regionDataResult.length === 0) {
        return `当前群聊 (${guildId}) 未绑定任何地区。请先使用“绑定地区”指令。`;
      }
      const region: Region = regionDataResult[0];

      // 2. 提取建筑业相关数据
      const constructionDepartments = region.Department || 0; // 建筑部门数量
      const accumulatedConstructionCapacity = region.Constructioncapacity || 0; // 累积建造力
      const laborAllocatedToConstruction = region.laborAllocation?.['Department'] || 0; // 分配给建筑部门的劳动力

      // 3. 构建返回信息
      return `
===[地区建筑业信息]===
${username} 同志！
地区编号： ${region.RegionId}
■ 建筑部门数量：${constructionDepartments}
■ 分配给建筑业的劳动力：${laborAllocatedToConstruction}
■ 本地区累积建造力：${accumulatedConstructionCapacity}
`.trim();
    } catch (error) {
      ctx.logger('error').error('查询地区建筑业信息时出错:', error);
      return '查询地区建筑业信息时发生内部错误，请联系管理员。';
    }
  });
}