import { Context, Session, h } from 'koishi';
import { userdata, Region } from '../types'; // 确保导入 userdata 和 Region 类型
import { Time } from 'koishi'; // 导入 Time 用于格式化时间

// 用于存储待确认的驻扎请求 { userId: { regionId: string, timestamp: number } }
const pendingStationConfirmations: Record<string, { regionId: string; timestamp: number }> = {};
//config
//StationTimeout 驻扎超时时间
//StationCooldown// 驻扎冷却时间

export function Stationed(ctx: Context) {
  ctx.command('驻扎', '驻扎到当前群聊绑定的地区')
    .action(async ({ session }) => {
      if (!session || !session.userId || !session.author) {
        return '无法获取用户信息。';
      }
      if (!session.guildId) {
        return '此命令只能在群聊中使用。';
      }

      const userId = session.userId;
      const guildId = session.guildId;
      const username = session.author.name || '未知用户';
      const now = Date.now();

      try {
        // 1. 获取用户数据
        const userDataResult = await ctx.database.get('userdata', { userId: userId });
        if (!userDataResult || userDataResult.length === 0) {
          return `${username} 同志，您尚未注册。`;
        }
        const user: userdata = userDataResult[0];

        // 2. 获取当前群聊绑定的地区数据
        const regionDataResult = await ctx.database.get('regiondata', { guildId: guildId });
        if (!regionDataResult || regionDataResult.length === 0) {
          return `当前群聊 (${guildId}) 未绑定任何地区。请先使用“绑定地区”命令。`;
        }
        const region: Region = regionDataResult[0];
        const targetRegionId = region.RegionId;

        // 3. 检查国家归属
        if (!user.countryName) {
          return `${username} 同志，您当前不属于任何国家，无法驻扎。`;
        }
        if (!region.owner) {
          return `地区 ${targetRegionId} 当前为无主地，无法驻扎。`;
        }
        if (user.countryName !== region.owner) {
          return `您 (${user.countryName}) 不属于控制该地区 (${targetRegionId}) 的国家 (${region.owner})，无法驻扎。`;
        }

        // 4. 检查驻扎冷却时间
        if (user.lastStationTimestamp && (now - user.lastStationTimestamp < ctx.config.StationCooldown*Time.hour)) {
          const remainingTime = Time.format(ctx.config.StationCooldown*Time.hour - (now - user.lastStationTimestamp));
          return `驻扎冷却中，距离下次可驻扎还有 ${remainingTime}。`;
        }

        // 5. 检查确认状态
        const pendingConfirmation = pendingStationConfirmations[userId];
        if (pendingConfirmation && pendingConfirmation.regionId === targetRegionId && (now - pendingConfirmation.timestamp < ctx.config.StationTimeout*Time.second)) {
          // --- 执行驻扎操作 ---
          console.log(`用户 ${username} (${userId}) 确认驻扎到地区 ${targetRegionId}。`);

          // 更新用户数据
          await ctx.database.set('userdata', { userId: userId }, {
            regionId: targetRegionId,
            lastStationTimestamp: now // 记录驻扎时间
          });

          // 清除确认状态
          delete pendingStationConfirmations[userId];

          return `驻扎成功！您已成功驻扎在地区 【${targetRegionId}】。未来3天内无法更改驻扎地。`;
          // --- 驻扎操作结束 ---

        } else {
          // --- 请求用户确认 ---
          pendingStationConfirmations[userId] = { regionId: targetRegionId, timestamp: now };

          // 设置超时自动清除确认状态
          setTimeout(() => {
            const currentPending = pendingStationConfirmations[userId];
            // 检查是否是同一次请求并且仍然存在
            if (currentPending && currentPending.timestamp === now) {
              delete pendingStationConfirmations[userId];
              // 尝试发送超时提示 (如果会话仍然有效)
              session.send(`=====[确认操作]=====\n${username} 同志！\n驻扎到地区 ${targetRegionId} 的操作已超时, 操作取消！`).catch(err => {
                console.warn(`发送驻扎超时消息失败: ${err.message}`);
              });
              console.log(`用户 ${username} (${userId}) 的驻扎地区 ${targetRegionId} 确认已超时。`);
            }
          }, ctx.config.StationTimeout*Time.second);

          return `
=====[确认操作]=====
${username} 同志！
您将驻扎到地区 【${targetRegionId}】。
驻扎后，您将在 ${Time.format(ctx.config.StationCooldown)}小时 内无法更改驻扎地。
请在 ${ctx.config.StationTimeout} 秒内再次输入 :
'驻扎' 命令以确认。
`.trim();
          // --- 用户确认结束 ---
        }

      } catch (error) {
        console.error(`处理驻扎命令时出错 (用户: ${userId}, 地区: ${guildId}):`, error);
        delete pendingStationConfirmations[userId]; // 出错也要清除状态
        const errorMessage = (error as Error).message;
        return `处理驻扎命令时发生内部错误: ${errorMessage}`;
      }
    });
}