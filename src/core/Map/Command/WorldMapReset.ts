
import { Context } from 'koishi';
import { WorldMap } from '../MapCore'; // 修正导入路径为 MapCore.ts
import * as fs from 'fs';
import * as path from 'path';

const pendingConfirmations: Record<string, number> = {};
const WaitingTimeout = 30 * 1000; // 修改为毫秒，30秒

export function WorldMapReset(ctx: Context) {
  ctx.command('重置世界地图', { authority: 4 })
    .action(async ({ session }) => {
      if (!session || !session.userId || !session.author) {
        return '无法获取用户信息。';
      }

      const userId = session.userId;
      const username = session.author.name || '未知用户';
      const now = Date.now();

      // 检查是否有待确认的请求且未超时
      if (pendingConfirmations[userId] && (now - pendingConfirmations[userId] < WaitingTimeout)) {
        try {
          console.log(`用户 ${username} (${userId}) 确认重置世界地图。`);
          const worldMap = WorldMap.getInstance(ctx);

          // 1. 删除地图文件
          const mapDataPath = path.join(path.resolve(ctx.baseDir, 'data'), 'world_map.json');
          if (fs.existsSync(mapDataPath)) {
            fs.unlinkSync(mapDataPath);
            console.log(`已删除地图文件: ${mapDataPath}`);
          } else {
            console.log('地图文件不存在，无需删除。');
          }
          // 2. 删除地图 HTML 文件
          const mapHtmlPath = path.resolve(__dirname, '..', 'Map.html');
          if (fs.existsSync(mapHtmlPath)) {
            fs.unlinkSync(mapHtmlPath);
            console.log(`已删除地图 HTML 文件: ${mapHtmlPath}`);
          } else {
            console.log(`${mapHtmlPath} 地图 HTML 文件不存在，无需删除。`);
          }

          // 3. 清空数据库中的地区数据
          const removedCount = await ctx.database.remove('regiondata', {});
          console.log(`已从数据库删除 ${removedCount} 条地区数据。`);

          // 4. 重置 WorldMap 实例状态
          worldMap.resetInitialization();

          // 清除确认状态
          delete pendingConfirmations[userId];

          return `
=====[世界地图]=====
${username} 同志！
世界地图已被成功重置！
已清除所有地区数据。
`.trim();

        } catch (error) {
          console.error('重置世界地图时出错:', error);
          delete pendingConfirmations[userId];
          return `重置世界地图时发生错误: ${error.message}`;
        }

      } else {
        // --- 请求用户确认 ---
        pendingConfirmations[userId] = now;

        // 设置超时自动清除确认状态，并发送提示
        setTimeout(() => {
          // 检查是否是同一次请求并且仍然存在（可能用户已经确认了）
          if (pendingConfirmations[userId] === now) {
            delete pendingConfirmations[userId];
            // 使用 session.send 发送超时提示
            session.send(`=====[确认操作]=====\n${username} 同志！\n操作已超时, 重置取消！`);
            console.log(`用户 ${username} (${userId}) 的世界地图重置确认已超时。`);
          }
        }, WaitingTimeout); // 使用毫秒

        return `
=====[确认操作]=====
${username} 同志！
这是一个非常危险的操作！
请在 ${WaitingTimeout / 1000} 秒内再次输入 :
'重置世界地图' 命令以确认。
`.trim();
        // --- 用户确认结束 ---
      }
    });
}