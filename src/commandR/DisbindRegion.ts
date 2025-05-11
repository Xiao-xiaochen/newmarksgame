import { Context } from 'koishi';
import { userdata, Region } from '../types'; // 导入需要的类型

export function DisbindRegion(ctx: Context) {
  ctx.command('解绑地区 [targetRegionId:string]', '解除地区与群聊的绑定。可指定地区ID，否则为当前群聊绑定地区。')
    .usage('解绑地区 [地区ID]\n解除指定地区ID或当前群聊所绑定地区的群聊绑定。仅国家领导人可操作，且只能解绑自己国家拥有的地区。')
    .example('解绑地区')
    .example('解绑地区 1145')
    .action(async ({ session }, targetRegionId) => {
      const userId = session.userId;
      const currentGuildId = session.guildId; // 当前群聊ID，用于无参数时
      const username = session.author?.name || '未知用户';

      if (!userId) {
        return '无法获取用户信息。';
      }

      try {
        // 1. 验证用户是否为领导人
        const userDataResult = await ctx.database.get('userdata', { userId: userId, isLeader: true });
        if (!userDataResult || userDataResult.length === 0) {
          return `${username} 同志，您不是国家领导人，无权执行此操作。`;
        }
        const userCountryName = userDataResult[0].countryName;
        if (!userCountryName) {
          return `${username} 同志，您的用户数据中缺少国家信息。`;
        }

        let regionToDisbind: Region | undefined;
        let operationDescription: string; // 用于日志和返回消息

        if (targetRegionId) {
          // --- 情况1: 指定了地区ID ---
          operationDescription = `地区 ${targetRegionId}`;
          const targetRegionResult = await ctx.database.get('regiondata', { RegionId: targetRegionId });
          if (!targetRegionResult || targetRegionResult.length === 0) {
            return `未找到地区ID为 ${targetRegionId} 的地区。`;
          }
          regionToDisbind = targetRegionResult[0];

          if (!regionToDisbind.guildId) {
            return `地区 ${targetRegionId} 当前未绑定任何群聊，无需解绑。`;
          }

        } else {
          // --- 情况2: 未指定地区ID，解绑当前群聊 ---
          if (!currentGuildId) {
            return '此命令在私聊中使用时必须指定地区ID。';
          }
          operationDescription = `当前群聊 (${currentGuildId}) 绑定的地区`;
          const boundRegionResult = await ctx.database.get('regiondata', { guildId: currentGuildId });
          if (!boundRegionResult || boundRegionResult.length === 0) {
            return `当前群聊 (${currentGuildId}) 没有绑定任何地区。`;
          }
          regionToDisbind = boundRegionResult[0];
        }

        // 3. 验证该地区是否属于执行命令的领导人所在的国家
        if (regionToDisbind.owner !== userCountryName) {
          return `${operationDescription} (ID: ${regionToDisbind.RegionId}) 属于国家 ${regionToDisbind.owner || '未知'}，您无法解绑不属于您国家 (${userCountryName}) 的地区。`;
        }

        // 4. 执行解绑 (将 guildId 设置为 null)
        // 保存一下被解绑的群聊ID，用于返回消息
        const previouslyBoundGuildId = regionToDisbind.guildId;
        await ctx.database.set('regiondata', { RegionId: regionToDisbind.RegionId }, { guildId: null });

        if (targetRegionId) {
          return `成功将地区 ${targetRegionId} (属于 ${userCountryName}) 从群聊 ${previouslyBoundGuildId || '未知'} 解绑。`;
        } else {
          return `成功将地区 ${regionToDisbind.RegionId} (属于 ${userCountryName}) 与当前群聊 (${currentGuildId}) 解绑。`;
        }

      } catch (error) {
        console.error(`解绑地区时出错 (用户: ${userId}, 目标地区: ${targetRegionId || '当前群聊'}):`, error);
        const errorMessage = (error as Error).message;
        return `解绑地区时发生错误: ${errorMessage}`;
      }
    });
}
