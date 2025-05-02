import { Context, Time } from 'koishi'; // 导入 Time
import { Country } from '../types'; // 导入需要的类型
import { validateCountryName } from '../utils/Namecheck'; // 导入国家名称验证函数

// --- 新增：改名冷却时间 (72小时) ---
const RENAME_COOLDOWN = 72 * Time.hour; // 单位：毫秒

export function ChangenName(ctx: Context) {
  // --- 修改命令名称和描述 ---
  ctx.command('修改国家名称 <newCountryName:string>', '国家领导人修改自己国家的名称', { authority: 1 }) // 基础权限1，检查领袖身份
    .usage('修改您领导的国家名称。有72小时冷却时间。')
    .example('修改国家名称 "新的伟大国家"')
    // --- 修改结束 ---
    .action(async ({ session }, newCountryName) => { // --- 修改：移除 targetCountryName 参数 ---
      if (!session || !session.userId || !session.author) {
        return '无法获取用户信息。';
      }
      // --- 修改：检查 newCountryName 是否提供 ---
      if (!newCountryName) {
        return '请提供新的国家名称。用法：修改国家名称 "新国家名"';
      }
      // --- 修改结束 ---

      const userId = session.userId;
      const username = session.author.name || '未知用户';
      // const userAuthority = session.user?.authority ?? 0; // 不再需要检查管理员权限

      // 1. 校验新国家名称
      const validationError = validateCountryName(newCountryName);
      if (validationError) {
        return validationError;
      }

      // 2. 检查新国家名称是否已存在
      const existingNewCountry = await ctx.database.get('country', { name: newCountryName });
      if (existingNewCountry && existingNewCountry.length > 0) {
        return `错误：国家名称 "${newCountryName}" 已被占用。`;
      }

      try {
        // 3. 获取执行命令的用户信息，确认是领袖及其国家
        const userDataResult = await ctx.database.get('userdata', { userId: userId });
        if (!userDataResult || userDataResult.length === 0 || !userDataResult[0].isLeader || !userDataResult[0].countryName) {
          return `您不是国家领导人，无法执行此操作。`;
        }
        const userData = userDataResult[0];
        const currentCountryName = userData.countryName; // 获取当前国家名称

        // 4. 获取目标国家信息 (使用从用户信息中获取的 currentCountryName)
        const targetCountryResult = await ctx.database.get('country', { name: currentCountryName });
        if (!targetCountryResult || targetCountryResult.length === 0) {
          // 理论上不应该发生，因为用户信息里有国家名
          console.error(`数据不一致：用户 ${userId} 属于国家 ${currentCountryName}，但找不到该国家记录。`);
          return `错误：找不到您当前领导的国家 "${currentCountryName}" 的记录。`;
        }
        const targetCountry: Country = targetCountryResult[0];

        // --- 新增：冷却时间检查 ---
        const now = Date.now();
        if (targetCountry.lastRenameTimestamp && (now - targetCountry.lastRenameTimestamp < RENAME_COOLDOWN)) {
          const remainingTime = Time.format(RENAME_COOLDOWN - (now - targetCountry.lastRenameTimestamp));
          return `国家名称修改冷却中，剩余时间：${remainingTime}。`;
        }
        // --- 冷却检查结束 ---

        // 权限检查已在第3步完成 (确认是领袖)

        // 5. 执行改名操作 (数据库更新)
        // a. 更新 country 表 (加入时间戳)
        await ctx.database.set('country', { name: currentCountryName }, {
          name: newCountryName,
          lastRenameTimestamp: now // 更新冷却时间戳
        });

        // b. 更新 userdata 表中所有成员的 countryName
        await ctx.database.set('userdata', { countryName: currentCountryName }, { countryName: newCountryName });

        // c. 更新 regiondata 表中所有地区的 owner
        await ctx.database.set('regiondata', { owner: currentCountryName }, { owner: newCountryName });

        console.log(`国家 ${currentCountryName} 领袖 ${username} (${userId}) 已将国家名称更改为 ${newCountryName}。`);
        return `您已成功将国家名称从 "${currentCountryName}" 更改为 "${newCountryName}"。`;

      } catch (error) {
        console.error(`修改国家名称时出错 (原名: ${/* currentCountryName is not defined here, log inside try */ ''}, 新名: ${newCountryName}, 用户: ${userId}):`, error);
        const errorMessage = (error as Error).message;
        return `修改国家名称时发生内部错误: ${errorMessage}`;
      }
    });
}
