import { Context } from 'koishi';
import { userdata, Region } from '../types'; // 导入需要的类型

export function DisbindRegion(ctx: Context) {
  ctx.command('解绑地区', '解除当前群聊绑定的地区。')
    .usage('解除当前群聊与地区的绑定。仅国家领导人可操作，且只能解绑自己国家拥有的地区。')
    .example('解绑地区')
    .action(async ({ session }) => {
      if (!session || !session.guildId) {
        return '此命令只能在群聊中使用。';
      }

      const userId = session.userId;
      const guildId = session.guildId;
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

        // 2. 查找当前群聊绑定的地区
        const boundRegionResult = await ctx.database.get('regiondata', { guildId: guildId });
        if (!boundRegionResult || boundRegionResult.length === 0) {
          return `当前群聊 (${guildId}) 没有绑定任何地区。`;
        }
        const boundRegion: Region = boundRegionResult[0];
        const regionIdToDisbind = boundRegion.RegionId;

        // 3. 验证该地区是否属于执行命令的领导人所在的国家
        if (boundRegion.owner !== userCountryName) {
          return `地区 ${regionIdToDisbind} (当前群聊绑定) 属于国家 ${boundRegion.owner || '未知'}，您无法解绑不属于您国家 (${userCountryName}) 的地区。`;
        }

        // 4. 执行解绑 (将 guildId 设置为 null)
        await ctx.database.set('regiondata', { RegionId: regionIdToDisbind }, { guildId: null });

        return `成功将地区 ${regionIdToDisbind} (属于 ${userCountryName}) 与当前群聊解绑。`;

      } catch (error) {
        console.error(`解绑群聊 ${guildId} 的地区时出错:`, error);
        // 强类型断言 error 为 Error 类型
        const errorMessage = (error as Error).message;
        return `解绑地区时发生错误: ${errorMessage}`;
      }
    });
}