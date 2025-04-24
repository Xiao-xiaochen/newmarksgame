import { Context } from 'koishi'

export function setupDailyReset(ctx: Context) {
  // 启动时检查是否需要重置
  CheckAndReset(ctx);
  // 每分钟检查一次是否需要重置
  ctx.setInterval(async () => {
    await CheckAndReset(ctx);
  }, 60 * 1000) // 每分钟检查一次
}

async function CheckAndReset(ctx: Context) {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // 获取当前日期，格式为 YYYY-MM-DD
    
    // 获取系统中记录的上次重置日期
    const systemData = await ctx.database.get('system', {});
    const lastResetDate = systemData[0]?.LastResetDate || '';
    
    // 如果今天还没有重置过，并且现在的时间已经过了0点，则进行重置
    if (lastResetDate !== today && now.getHours() >= 0) {
      // 重置所有用户的签到状态
      await ctx.database.set('userdata', {}, { hasCheckedIn: false });
      
      // 更新上次重置日期
      if (systemData.length > 0) {
        await ctx.database.set('system', { }, { LastResetDate: today });
      } else {
        await ctx.database.create('system', { LastResetDate: today });
      }
      
      console.log(`已重置所有用户的签到状态，日期：${today}`);
    }
  } catch (error) {
    console.error('检查或重置签到状态时出错:', error);
  }
}