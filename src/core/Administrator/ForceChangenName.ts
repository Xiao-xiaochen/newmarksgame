import { Context } from 'koishi';
import { Country } from '../../types'; // 导入需要的类型
import { validateCountryName } from '../../utils/Namecheck'; // 导入国家名称验证函数

export function ForceChangenName(ctx: Context) {
  // --- 定义管理员命令，权限设置为 4 ---
  ctx.command('强制修改国家名称 <targetCountryName:string> <newCountryName:string>', '管理员强制修改国家名称', { authority: 4 })
    .usage('强制修改指定国家的名称。仅限4级及以上权限管理员使用。')
    .example('强制修改国家名称 "旧国名" "新国名"')
    .action(async ({ session }, targetCountryName, newCountryName) => {
      // Koishi 会在 action 执行前检查权限，这里无需再次检查 session.user.authority

      if (!session || !session.userId || !session.author) {
        return '无法获取执行者信息。'; // 虽然权限检查过了，但 session 信息还是需要的
      }
      if (!targetCountryName || !newCountryName) {
        return '请提供目标国家名称和新的国家名称。用法：强制修改国家名称 "目标国家名" "新国家名"';
      }

      const userId = session.userId; // 执行操作的管理员ID
      const username = session.author.name || '未知管理员';

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
        // 3. 获取目标国家信息
        const targetCountryResult = await ctx.database.get('country', { name: targetCountryName });
        if (!targetCountryResult || targetCountryResult.length === 0) {
          return `错误：找不到名为 "${targetCountryName}" 的国家。`;
        }
        // const targetCountry: Country = targetCountryResult[0]; // 不需要国家对象本身了

        // 权限检查已由 Koishi 完成

        // 4. 执行改名操作 (数据库更新) - 无需更新冷却时间戳
        // a. 更新 country 表
        await ctx.database.set('country', { name: targetCountryName }, { name: newCountryName });

        // b. 更新 userdata 表中所有成员的 countryName
        await ctx.database.set('userdata', { countryName: targetCountryName }, { countryName: newCountryName });

        // c. 更新 regiondata 表中所有地区的 owner
        await ctx.database.set('regiondata', { owner: targetCountryName }, { owner: newCountryName });

        console.log(`管理员 ${username} (${userId}) 已强制将国家 ${targetCountryName} 的名称更改为 ${newCountryName}。`);
        return `操作成功：已强制将国家 "${targetCountryName}" 的名称更改为 "${newCountryName}"。`;

      } catch (error) {
        console.error(`强制修改国家名称时出错 (目标: ${targetCountryName}, 新名: ${newCountryName}, 管理员: ${userId}):`, error);
        const errorMessage = (error as Error).message;
        return `强制修改国家名称时发生内部错误: ${errorMessage}`;
      }
    });
}