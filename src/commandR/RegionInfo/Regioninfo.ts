import { Context } from 'koishi';
// 移除未使用的 TRandom 导入
// import { TRandom } from '../../utils/Random';
import { Region } from '../../types';

export function Regioninfo(ctx: Context) {
  // 修改命令定义，接受一个可选参数 identifier
  ctx.command('查看地区 [identifier:string]')
    .usage('查看地区信息。可以提供4位地区编号，或群号，或在已绑定地区的群聊中不带参数执行。')
    .example('查看地区 0101')
    .example('查看地区 123456789 (群号)')
    .example('查看地区 (在已绑定的群聊中)')
    .action(async ({ session }, identifier) => {
      if (!session) {
        return '会话不存在';
      }

      const userId = session.userId;
      if (!userId) {
        return '无法获取用户ID';
      }

      const username = session.author?.name || '未知用户';

      // 检查用户是否注册 (移到 try 块外部，因为这是前置条件)
      const Userinfo = await ctx.database.get('userdata', { userId: userId });
      if (!Userinfo || Userinfo.length === 0) {
        return `
====[错误]====
${username} 同志！
您尚未注册！
请先发送“阅读报告”
`.trim();
      }

      let query: Partial<Region> = {}; // 初始化查询对象

      try {
        if (identifier) {
          // 如果提供了标识符
          if (/^\d{4}$/.test(identifier)) {
            // 如果是4位数字，按 RegionId 查询
            query = { RegionId: identifier };
          } else {
            // 否则，按 guildId 查询
            query = { guildId: identifier };
          }
        } else if (session.guildId) {
          // 如果没有提供标识符，但在群聊中，按当前 guildId 查询
          query = { guildId: session.guildId };
        } else {
          // 如果既没有标识符，也不在群聊中，则无法确定查询目标
          return '请提供地区编号或群号，或者在已绑定地区的群聊中使用此命令。';
        }

        // 执行数据库查询
        const regionDataResult = await ctx.database.get('regiondata', query);

        // 检查是否找到地区
        if (!regionDataResult || regionDataResult.length === 0) {
          if (identifier) {
            return `未找到标识符为 "${identifier}" 的地区。`;
          } else {
            return `当前群聊未绑定任何地区。`;
          }
        }

        // 获取地区数据 (取第一条结果)
        const regiondata: Region = regionDataResult[0];
        const FormalPopulation = (regiondata.population / 10000).toFixed(2);

        // 获取群成员数量 (如果需要，可以保留)
        // const memberCount = session.guildId ? (await session.bot.getGuildMemberList(session.guildId)).data.length : 'N/A';

        return `
=====[地区信息]=====
地区编号：${regiondata.RegionId}
绑定群聊：${regiondata.guildId || '未绑定'}
■控制方：${regiondata.owner || '无'}
■领导人：${regiondata.leader || '无'}
□地区人口：${FormalPopulation} 万
□基础设施：${regiondata.base}/${regiondata.maxbase}
□地区仓库： 未完成
□第一产业数量：${regiondata.farms}
□第二产业数量：${regiondata.Department}
■地区驻军：未完成
`.trim();
      } catch (error) {
        console.error('查看地区时出错:', error);
        return '查看地区信息时发生错误，请查看控制台日志。';
      }
    });
}
