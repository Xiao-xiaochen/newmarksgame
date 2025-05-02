import { Context, segment } from 'koishi'; // 导入 segment
import { userdata, Country } from '../types'; // 确保导入 userdata 和 Country 类型
import path from 'path'; // 导入 path 模块用于处理路径

// 用于存储待确认的国家解散请求 { userId: timestamp }
const pendingDismissConfirmations: Record<string, number> = {};
const DismissTimeout = 30 * 1000; // 确认超时时间：30秒

export function Dismisscountry(ctx: Context) {
  ctx.command('解散国家', '解散你领导的国家 (仅限领袖)', { authority: 1 }) // 基础权限1，代码内检查领袖身份
    .action(async ({ session }) => {
      if (!session || !session.userId || !session.author) {
        return '无法获取用户信息。';
      }

      const leaderId = session.userId;
      const leaderName = session.author.name || '未知用户';
      const now = Date.now(); // 获取当前时间戳

      // 检查用户是否为领袖 (提前检查，减少不必要的确认流程)
      try {
        const leaderDataResult = await ctx.database.get('userdata', { userId: leaderId });
        if (!leaderDataResult || leaderDataResult.length === 0) {
          return `${leaderName} 同志，你尚未注册。`;
        }
        const leaderData = leaderDataResult[0];

        if (!leaderData.isLeader || !leaderData.countryName) {
          return `${leaderName} 同志，你不是国家领袖，无法解散国家。`;
        }
        const countryName = leaderData.countryName;

        // 检查是否有待确认的请求且未超时
        if (pendingDismissConfirmations[leaderId] && (now - pendingDismissConfirmations[leaderId] < DismissTimeout)) {
          // --- 开始执行解散操作 ---
          console.log(`用户 ${leaderName} (${leaderId}) 确认解散国家 ${countryName}。`);

          // 2. 获取国家信息，再次确认国家存在 (防止确认期间被删除)
          const countryData = await ctx.database.get('country', { name: countryName });
          if (!countryData || countryData.length === 0) {
            delete pendingDismissConfirmations[leaderId]; // 清除确认状态
            console.warn(`数据不一致：领袖 ${leaderId} 确认解散时，国家 ${countryName} 已不存在。`);
            // 即使国家不存在，也尝试重置领袖状态并记录离开时间
            await ctx.database.set('userdata', { userId: leaderId }, { countryName: null, isLeader: false, lastCountryLeaveTimestamp: now }); // 添加时间戳
            return `发生数据错误，似乎您领导的国家 ${countryName} 已不存在。已将您的状态重置。`;
          }
          const country = countryData[0];
          const memberIds = country.members || [];

          // 3. 将所有成员（包括领袖）设置为无国家状态，并记录离开时间
          // --- 修改这里，增加 lastCountryLeaveTimestamp: now ---
          const updateResult = await ctx.database.set('userdata', { userId: { $in: memberIds } }, {
            countryName: null,
            isLeader: false,
            lastCountryLeaveTimestamp: now // 记录解散（离开）时间
          });
          // --- 修改结束 ---
          console.log(`国家 ${countryName} 解散：更新了 ${updateResult.matched} 个成员的状态并记录离开时间。`);

          // 4. 释放国家控制的所有地区，并清除群聊绑定
          const regionUpdateResult = await ctx.database.set('regiondata', { owner: countryName }, { owner: null, leader: null, guildId: null });
          console.log(`国家 ${countryName} 解散：释放了 ${regionUpdateResult.matched} 个地区，并清除了它们的群聊绑定。`);

          // 5. 删除国家记录
          await ctx.database.remove('country', { name: countryName });

          // 清除确认状态
          delete pendingDismissConfirmations[leaderId];

          // --- 发送解散后的音乐 ---
          try {
            const audioAbsolutePath = 'e:/Dev/koishi-app/external/newmarksgame/src/Music/战斗仍将继续.ogg';
            if (session.platform === 'onebot') {
                await session.send(segment.audio(`file:///${audioAbsolutePath}`));
                console.log(`已向会话 ${session.sid} 发送解散国家后的音频。`);
            } else {
                console.warn(`当前平台 ${session.platform} 可能不支持直接发送本地音频文件路径。`);
            }
          } catch (audioError) {
            console.error(`发送解散国家音频时出错:`, audioError);
          }
          // --- 音频发送结束 ---

          // --- 发送两条消息 ---
          // 6. 通知领袖 - 第一条消息 (解散结果)
          await session.send(`国家 【${countryName}】 已解散。所有成员已恢复为无国家状态，所有控制地区已被释放并解除群聊绑定。`);

          // 7. 通知领袖 - 第二条消息 (伤感的话)
          await session.send(`人民们！战斗仍将继续！`);
          // --- 消息发送结束 ---

          // --- 解散操作结束 ---

        } else {
          // --- 请求用户确认 ---
          pendingDismissConfirmations[leaderId] = now;

          // 设置超时自动清除确认状态，并发送提示
          setTimeout(() => {
            // 检查是否是同一次请求并且仍然存在
            if (pendingDismissConfirmations[leaderId] === now) {
              delete pendingDismissConfirmations[leaderId];
              // 尝试发送超时提示 (如果会话仍然有效)
              session.send(`=====[确认操作]=====\n${leaderName} 同志！\n解散国家 ${countryName} 的操作已超时, 操作取消！`).catch(err => {
                console.warn(`发送解散国家超时消息失败: ${err.message}`);
              });
              console.log(`用户 ${leaderName} (${leaderId}) 的解散国家 ${countryName} 确认已超时。`);
            }
          }, DismissTimeout);

          return `
=====[确认操作]=====
${leaderName} 同志！
警告：此操作将解散国家 【${countryName}】！
所有成员将失去国家归属，所有控制地区将被释放！
请在 ${DismissTimeout / 1000} 秒内再次输入 :
'解散国家' 命令以确认。
`.trim();
          // --- 用户确认结束 ---
        }

      } catch (error) {
        console.error(`处理解散国家命令时出错 (领袖: ${leaderId}):`, error);
        delete pendingDismissConfirmations[leaderId]; // 出错也要清除状态
        // 强类型断言 error 为 Error 类型
        const errorMessage = (error as Error).message;
        return `处理解散国家命令时发生内部错误: ${errorMessage}`; // 返回错误信息
      }
    });
}