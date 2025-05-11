import { Context } from 'koishi';
import { Region } from '../../types'; // 确保路径正确

export function ReadRegionReportCommand(ctx: Context) {
  ctx.command('阅读地区报告', '查看当前地区的最新小时结算报告')
    .alias('查报告', '看报告')
    .action(async ({ session }) => {
      if (!session || !session.guildId) {
        return '此命令只能在群聊中使用。';
      }

      const guildId = session.guildId;
      const username = session.author?.name || '指挥官';

      try {
        const regionDataResult = await ctx.database.get('regiondata', { guildId: guildId });
        if (!regionDataResult || regionDataResult.length === 0) {
          return `当前群聊 (${guildId}) 未绑定任何地区，无法查询报告。`;
        }

        const region: Region = regionDataResult[0];

        if (region.lastHourlyReport && region.lastHourlyReport.trim() !== '') {
          // 直接发送存储的报告内容
          // 为了避免被 Koishi 的消息长度限制截断，可以考虑分段发送或提示用户报告较长
          // 但这里我们先直接发送
          return `${username}同志，这是地区 ${region.RegionId} 的最新报告：\n\n${region.lastHourlyReport}`;
        } else {
          return `地区 ${region.RegionId} 暂时还没有可供查阅的报告。请等待下一次小时结算。`;
        }
      } catch (error) {
        console.error(`[查报告失败] 查询地区 ${guildId} 报告时发生错误:`, error);
        return '查询地区报告时发生内部错误，请稍后再试或联系管理员。';
      }
    });
}