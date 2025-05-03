// src\commandR\RegionInfo\BuildPowerInfo.ts

import { Context } from 'koishi';
import { Region } from '../../types'; // 导入 Region 类型

export function BuildPowerInfo(ctx: Context) {
  ctx.command('查看地区建造力')
    .alias('地区建造力', '建造力') // 添加别名
    .action(async ({ session }) => {
      const username = session?.author?.name || '未知用户';
      const guildId = session?.guildId;

      if (!session) {
        return '无法获取会话信息。';
      }
      if (!guildId) {
        return '此命令只能在群聊中使用。';
      }

      // --- 查询地区数据 ---
      const regionDataResult = await ctx.database.get('regiondata', { guildId: guildId });
      if (!regionDataResult || regionDataResult.length === 0) {
        return `当前群聊 (${guildId}) 未绑定任何地区。请先使用“绑定地区”指令。`;
      }
      const region: Region = regionDataResult[0];

      // --- 提取建造力数据 ---
      const currentBuildPower = region.Constructioncapacity || 0;
      const formattedBuildPower = currentBuildPower.toLocaleString(); // 格式化数字

      return `
=====[地区建造力]=====
地区编号：${region.RegionId}
当前累积建造力：${formattedBuildPower}
`.trim();
    });
}