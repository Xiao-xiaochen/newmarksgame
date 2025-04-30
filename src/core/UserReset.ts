import { Context } from 'koishi';

// 用于存储待确认的用户重置请求 { userId: timestamp }
const pendingUserResetConfirmations: Record<string, number> = {};
const UserResetTimeout = 30 * 1000; // 确认超时时间：30秒

export function UserReset(ctx: Context) {
  ctx.command('重置用户数据', { authority: 4 }) // 设置权限等级为4
    .action(async ({ session }) => {
      if (!session || !session.userId || !session.author) {
        return '无法获取用户信息。';
      }

      const userId = session.userId;
      const username = session.author.name || '未知用户';
      const now = Date.now();

      // 检查是否有待确认的请求且未超时
      if (pendingUserResetConfirmations[userId] && (now - pendingUserResetConfirmations[userId] < UserResetTimeout)) {
        try {
          console.log(`用户 ${username} (${userId}) 确认重置用户数据。`);

          // 清空数据库中的用户数据
          const removedCount = await ctx.database.remove('userdata', {});
          console.log(`已从数据库删除 ${removedCount} 条用户数据。`);

          // 清除确认状态
          delete pendingUserResetConfirmations[userId];

          return `
=====[用户数据管理]=====
${username} 同志！
所有用户数据已被成功重置！
已清除 ${removedCount} 条用户记录。
`.trim();

        } catch (error) {
          console.error('重置用户数据时出错:', error);
          delete pendingUserResetConfirmations[userId]; // 出错也要清除状态
          return `重置用户数据时发生错误: ${error.message}`;
        }

      } else {
        // --- 请求用户确认 ---
        pendingUserResetConfirmations[userId] = now;

        // 设置超时自动清除确认状态，并发送提示
        setTimeout(() => {
          // 检查是否是同一次请求并且仍然存在
          if (pendingUserResetConfirmations[userId] === now) {
            delete pendingUserResetConfirmations[userId];
            // 尝试发送超时提示 (如果会话仍然有效)
            session.send(`=====[确认操作]=====\n${username} 同志！\n用户数据重置操作已超时, 重置取消！`).catch(err => {
              console.warn(`发送用户数据重置超时消息失败: ${err.message}`);
            });
            console.log(`用户 ${username} (${userId}) 的用户数据重置确认已超时。`);
          }
        }, UserResetTimeout);

        return `
=====[确认操作]=====
${username} 同志！
警告：此操作将清除所有已注册用户的数据！
请在 ${UserResetTimeout / 1000} 秒内再次输入 :
'重置用户数据' 命令以确认。
`.trim();
        // --- 用户确认结束 ---
      }
    });
}