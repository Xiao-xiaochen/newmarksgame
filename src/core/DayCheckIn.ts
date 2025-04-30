import { Context } from 'koishi'

export function setupDailyReset(ctx: Context) {
  // 启动时检查是否需要重置
  CheckAndReset(ctx);
  // 每分钟检查一次是否需要重置 (可以考虑增加间隔，例如每小时检查一次)
  ctx.setInterval(async () => {
    await CheckAndReset(ctx);
  }, 60 * 60 * 1000) // 修改为每小时检查一次
}

async function CheckAndReset(ctx: Context) {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // 获取当前日期，格式为 YYYY-MM-DD
    
    // 直接查询今天是否已经有重置记录
    const systemRecordToday = await ctx.database.get('system', { LastResetDate: today });
    
    // 如果今天还没有重置记录 (即 systemRecordToday.length === 0)
    if (systemRecordToday.length === 0) {
      // 重置所有用户的签到状态
      await ctx.database.set('userdata', {}, { hasCheckedIn: false });
      
      // 使用 upsert 添加今天的重置记录
      // upsert 会查找 LastResetDate 为 today 的记录，如果不存在则创建
      await ctx.database.upsert('system', [{ LastResetDate: today }]);
      
      console.log(`已重置所有用户的签到状态，并记录日期：${today}`);
    }
    // 如果今天的记录已存在，则不执行任何操作
    
  } catch (error) {
     // 避免在启动时或正常检查时因数据库错误（如表不存在）而崩溃
     if (error.message.includes('Unknown table') || error.message.includes('no such table')) {
         console.warn(`System table not found during check/reset. It might be created later. Error: ${error.message}`);
     } else {
         console.error('检查或重置签到状态时出错:', error);
     }
  }
}