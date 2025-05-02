import { Context } from 'koishi';

export function BindRegion(ctx: Context) {
  ctx.command('绑定地区 <regionId:string>')
    // 更新用法说明，移除“首都”限制
    .usage('将指定的地区与当前群聊绑定。仅国家领导人可操作，且只能绑定自己国家拥有的地区。')
    .example('绑定地区 0101')
    .action(async ({ session }, regionId) => {
      if (!session || !session.guildId) {
        return '此命令只能在群聊中使用。';
      }
      if (!regionId || !/^\d{4}$/.test(regionId)) {
        return '请提供有效的4位数地区编号，例如：0101';
      }

      const userId = session.userId;
      const guildId = session.guildId;
      const username = session.author?.name || '未知用户';

      if (!userId) {
        return '无法获取用户信息。';
      }

      try {
        // 1. 验证用户是否为领导人
        const userData = await ctx.database.get('userdata', { userId: userId, isLeader: true });
        if (!userData || userData.length === 0) {
          return `${username} 同志，您不是国家领导人，无权执行此操作。`;
        }
        const userCountryName = userData[0].countryName;
        if (!userCountryName) {
            return `${username} 同志，您的用户数据中缺少国家信息。`;
        }

        // 2. 获取国家信息 (不再需要检查是否为首都)
        // const countryData = await ctx.database.get('country', { name: userCountryName });
        // if (!countryData || countryData.length === 0) {
        //     return `错误：找不到您的国家 ${userCountryName} 的信息。`;
        // }
        // --- 移除首都检查 ---
        // if (countryData[0].capitalRegionId !== regionId) {
        //     return `您只能绑定您国家的首都地区 (${countryData[0].capitalRegionId})。`;
        // }
        // --- 移除首都检查结束 ---

        // 3. 获取地区信息
        const regionData = await ctx.database.get('regiondata', { RegionId: regionId });
        if (!regionData || regionData.length === 0) {
          return `错误：找不到地区 ${regionId} 的信息。`;
        }

        // 4. 检查地区是否属于该国家 (这个检查仍然需要)
        if (regionData[0].owner !== userCountryName) {
          return `地区 ${regionId} 不属于您的国家 ${userCountryName}。`;
        }

        // 5. 检查地区是否已被其他群聊绑定
        if (regionData[0].guildId && regionData[0].guildId !== guildId && String(regionData[0].guildId).length > 4) {
          return `地区 ${regionId} 已被群聊 ${regionData[0].guildId} 绑定。`;
        }

        // 检查是否已绑定到当前群聊
        if (regionData[0].guildId === guildId) {
            return `地区 ${regionId} 已经绑定到当前群聊。`;
        }

        // 6. 检查当前群聊是否已绑定其他地区
        const existingBinding = await ctx.database.get('regiondata', { guildId: guildId });
        if (existingBinding && existingBinding.length > 0 && existingBinding[0].RegionId !== regionId) {
          return `当前群聊已绑定了地区 ${existingBinding[0].RegionId}，请先解绑或联系管理员。`;
        }

        // 7. 执行绑定
        await ctx.database.set('regiondata', { RegionId: regionId }, { guildId: guildId });

        // 更新成功消息，移除“首都”字样
        return `成功将地区 ${regionId} (属于 ${userCountryName}) 绑定到当前群聊。`;

      } catch (error) {
        console.error(`绑定地区 ${regionId} 到群聊 ${guildId} 时出错:`, error);
        // 强类型断言 error 为 Error 类型
        const errorMessage = (error as Error).message;
        return `绑定地区时发生错误: ${errorMessage}`;
      }
    });
}