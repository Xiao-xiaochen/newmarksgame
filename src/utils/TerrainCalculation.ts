// 新马列文游 - 地形计算工具

import { Terrain } from '../types'

/**
 * 计算地形对建筑位的影响
 * @param terrain 地形特质
 * @param baseSlots 基础建筑位（由群人数决定）
 * @returns 实际可用建筑位
 */
export function calculateBuildingSlots(terrain: Terrain, baseSlots: number): number {
  // 地形损耗率
  const mountainLossRate = 0.5  // 山地损耗率50%
  const hillLossRate = 0.3      // 丘陵损耗率30%
  const plainLossRate = 0       // 平原损耗率0%
  
  // 计算各地形的影响
  const mountainEffect = baseSlots * (terrain.mountain / 100) * (1 - mountainLossRate)
  const hillEffect = baseSlots * (terrain.hill / 100) * (1 - hillLossRate)
  const plainEffect = baseSlots * (terrain.plain / 100) * (1 - plainLossRate)
  
  // 计算森林覆盖率的影响
  const forestEffect = 1 - (terrain.forest / 100)
  
  // 计算总建筑位
  const totalSlots = (mountainEffect + hillEffect + plainEffect) * forestEffect
  
  // 四舍五入并返回
  return Math.round(totalSlots)
}

/**
 * 计算地形对资源储量的影响
 * @param baseAmount 基础资源储量
 * @param terrain 地形特质
 * @param resourceType 资源类型
 * @returns 实际资源储量
 */
export function calculateResourceAmount(
  baseAmount: number,
  terrain: Terrain,
  resourceType: 'ironOre' | 'coal' | 'aluminum' | 'rareEarth' | 'oil' | 'rareMetal'
): number {
  // 地形对资源的修正系数
  const terrainModifiers = {
    ironOre: {
      plain: 1.2,
      mountain: 0.5,
      hill: 1.0
    },
    coal: {
      plain: 0.8,
      mountain: 1.0,
      hill: 1.5
    },
    aluminum: {
      plain: 1.0,
      mountain: 1.2,
      hill: 0.8
    },
    rareEarth: {
      plain: 0.5,
      mountain: 2.0,
      hill: 1.0
    },
    oil: {
      plain: 1.5,
      mountain: 0.3,
      hill: 0.8
    },
    rareMetal: {
      plain: 0.7,
      mountain: 1.8,
      hill: 1.0
    }
  }
  
  // 获取当前资源的修正系数
  const modifiers = terrainModifiers[resourceType]
  
  // 计算各地形的影响
  const plainEffect = baseAmount * (terrain.plain / 100) * modifiers.plain
  const mountainEffect = baseAmount * (terrain.mountain / 100) * modifiers.mountain
  const hillEffect = baseAmount * (terrain.hill / 100) * modifiers.hill
  
  // 计算总资源量
  const totalAmount = plainEffect + mountainEffect + hillEffect
  
  // 返回整数结果
  return Math.round(totalAmount)
}
