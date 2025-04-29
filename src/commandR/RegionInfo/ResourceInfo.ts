import { Context } from 'koishi';
import { Region } from '../../types';

export function ResourceInfo(ctx: Context) {
  // 修改命令定义，接受可选参数 identifier
  ctx.command('查看地区资源储量 [identifier:string]').alias('查看地区资源')
    .usage('查看指定地区或当前群聊绑定地区的资源储量。可以提供4位地区编号，或群号，或在已绑定地区的群聊中不带参数执行。')
    .example('查看地区资源 0101')
    .example('查看地区资源 123456789 (群号)')
    .example('查看地区资源 (在已绑定的群聊中)')
    .action(async ({ session }, identifier) => {
      if (!session) {
        return '会话不存在';
      }

      const userId = session.userId; // 获取 userId 用于后续可能的检查
      if (!userId) {
        return '无法获取用户信息。';
      }

      const username = session.author?.name || '未知用户';
      const format = (num: number | undefined) => num ? num.toLocaleString() : '未知'; // 处理 undefined 的情况

      let query: Partial<Region> = {}; // 初始化查询对象

      try {
        // 检查用户是否注册 (可选，但建议保留)
        const userInfo = await ctx.database.get('userdata', { userId: userId });
        if (!userInfo || userInfo.length === 0) {
          return `
====[错误]====
${username} 同志！
您尚未注册！
请先发送“阅读报告”
`.trim();
        }

        // --- 确定查询条件 ---
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
        // --- 查询条件确定完毕 ---

        // 执行数据库查询
        const regionDataResult = await ctx.database.get('regiondata', query);

        // 检查是否找到地区
        if (!regionDataResult || regionDataResult.length === 0) {
          if (identifier) {
            return `未找到标识符为 "${identifier}" 的地区。`;
          } else {
            return `当前群聊 (${session.guildId}) 未绑定任何地区，或该地区数据不存在。`;
          }
        }

        // 获取地区数据 (取第一条结果)
        const regiondata: Region = regionDataResult[0];

        // 检查资源数据是否存在且有内容 (例如检查某个关键资源字段)
        // 注意：直接检查 resources 对象可能不够，因为可能存在空对象 {}
        // 最好检查一个具体的资源字段，或者检查 resources 是否为 null/undefined
        if (!regiondata.resources || regiondata.resources.ironOre === undefined) { // 以 ironOre 是否存在为例
          return `
===[地区资源储量 - ${regiondata.RegionId}]===
地区：${regiondata.guildId || '未绑定群聊'}
${username} 同志！
地区 ${regiondata.RegionId} 尚未勘探资源！
请发送：勘探地区资源
`.trim();
        }

        // 格式化并返回资源信息
        return `
===[地区资源储量 - ${regiondata.RegionId}]===
地区：${regiondata.guildId || '未绑定群聊'}
资源单位：（吨）
■稀土资源：${format(regiondata.resources.rareEarth)}
■稀有金属：${format(regiondata.resources.rareMetal)}
■铁矿：${format(regiondata.resources.ironOre)}
■煤矿：${format(regiondata.resources.coal)}
■铝矿：${format(regiondata.resources.aluminum)}
■原油：${format(regiondata.resources.oil)}
`.trim();

      } catch (error) {
        console.error('查询地区资源时出错:', error);
        // 避免暴露详细错误给用户
        return '查询地区资源时发生内部错误，请联系管理员。';
      }
    });  
}