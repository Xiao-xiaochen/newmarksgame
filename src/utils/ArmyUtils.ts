import { Context } from 'koishi';
import { Army } from '../types';

/**
 * 根据提供的目标字符串（ID或名称）和可选的地区ID查找军队。
 * 优先按ID查找，然后按名称在指定地区内查找。
 * @param ctx Koishi Context
 * @param target 军队ID或名称
 * @param regionId 可选，如果按名称查找，则在此地区内查找
 * @returns 找到的 Army 对象或 null
 */
export async function findArmyByTarget(ctx: Context, target: string, regionId?: string): Promise<Army | null> {
  try {
    // 1. 尝试按 Army ID 查询
    const armyById = await ctx.database.get('army', { armyId: target });
    if (armyById && armyById.length > 0) {
      // 如果指定了 regionId，验证找到的军队是否在该地区
      if (regionId && armyById[0].regionId !== regionId) {
        return null; // ID 存在但不在指定地区
      }
      return armyById[0];
    }

    // 2. 如果按 ID 未找到，并且提供了 regionId，则尝试按名称在该地区查询
    if (regionId) {
      const armyByName = await ctx.database.get('army', { name: target, regionId: regionId });
      if (armyByName && armyByName.length > 0) {
        return armyByName[0];
      }
    }

    // 3. 如果都未找到
    return null;

  } catch (error) {
    console.error(`查找军队时出错 (目标: ${target}, 地区: ${regionId}):`, error);
    return null; // 出错时返回 null
  }
}