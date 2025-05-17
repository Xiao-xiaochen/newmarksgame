//src\commandR\RegionFarminfo.ts

import { Context } from 'koishi';
import { Region } from '../../types'; // 确保引入 Region 类型

export function RegionFarminfo(ctx: Context) {
  ctx.command('查看地区第一产业').alias('第一产业', '第一产业报告')
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

      // 2. 提取第一产业相关数据
      const farmCount = region.farms || 0;
      const laborAllocatedToFarms = region.laborAllocation?.['farms'] || 0;
      // const rubberFarmCount = region.rubberFarms || 0; // 示例，如果数据模型中有此字段

      // 3. 构建返回信息
      let response = `
===[地区第一产业]===
${username} 同志！
地区编号：${region.RegionId} 
■农田数量：${farmCount}
■农业劳动力：${laborAllocatedToFarms}
`.trim();
      // 示例：如果将来有更详细的作物类型信息
      // response += '■作物类型：\n';
      // if (typeof rubberFarmCount !== 'undefined' && rubberFarmCount > 0) {
      //   response += `  □橡胶作物农场：${rubberFarmCount}\n`;
      // }
      // if (farmCount > 0 && (typeof rubberFarmCount === 'undefined' || rubberFarmCount === 0)) {
      //   response += '  □主要种植粮食作物\n';
      // }
      // if (farmCount === 0) {
      //   response += '  □暂无特定作物种植信息\n';
      // }
    } catch (error) {
      ctx.logger('error').error('查询地区第一产业信息时出错:', error);
      return '查询地区第一产业信息时发生内部错误，请联系管理员。';
    }
  });
}
