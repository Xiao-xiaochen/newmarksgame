import { Region } from "../types";

// 检查仓库空间是否足够
export function hasEnoughWarehouseSpace(
  region: Region,
  newItems: Record<string, number>
): { hasSpace: boolean; needed: number; available: number } {
  // 假设 region.warehouse 有 totalSpace 字段，已用空间为所有物品数量之和
  const totalSpace = (region.warehouse as any).totalSpace || 10000; // 默认10000
  let used = 0;
  for (const key in region.warehouse) {
    if (key !== "totalSpace") used += region.warehouse[key] || 0;
  }
  let add = 0;
  for (const key in newItems) {
    add += newItems[key] || 0;
  }
  const available = totalSpace - used;
  const needed = add - available;
  return {
    hasSpace: available >= add,
    needed: needed > 0 ? needed : 0,
    available,
  };
}