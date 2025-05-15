import { Context } from 'koishi';

import * as path from 'path';
import { WorldMap } from '../MapCore';

export function InitializeRegions(ctx: Context) {
  // 创建一个管理员命令来初始化所有地区
  ctx.command('初始化世界', { authority: 4 })
    .action(async ({ session }) => {
      if (!session) {
        return '会话不存在';
      }
      
      try {
        const username = session.author?.name || '未知用户';
        
        // 获取世界地图单例
        const worldMap = WorldMap.getInstance(ctx);
        
        // 检查是否已经初始化
        if (worldMap.isInitialized()) {
          return `
=====[初始化失败]=====
${username} 同志！
世界地图已经初始化过了，不能重复初始化！
`.trim();
        }
        
        // 开始初始化
        const success = await worldMap.initializeWorld(ctx);
        
        if (!success) {
          return `
=====[初始化失败]=====
${username} 同志！
初始化世界地图时出错，请查看日志。
`.trim();
        }
        
        // 获取地图文件路径
        const mapDataPath = path.join(path.resolve(ctx.baseDir, 'data'), 'world_map.json');
        
        return `
=====[初始化成功]=====
${username} 同志！
成功初始化所有地区的数据！
`.trim();
      } catch (error) {
        console.error('初始化地区时出错:', error);
        return `初始化地区时出错: ${error.message}`;
      }
    });
}