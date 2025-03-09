// 新马列文游 - 地形生成工具

import { Terrain } from '../types'
import { randomInt } from './Random'
import { calculateBuildingSlots } from './TerrainCalculation'

/**
 * 生成随机地形
 * @returns 随机生成的地形特质
 */
export function generateTerrain(): Terrain {
  // 生成随机的地形百分比
  let mountain = randomInt(10, 40)  // 山地 10%-40%
  let hill = randomInt(10, 30)      // 丘陵 10%-30%
  let river = randomInt(0, 20)      // 河流 0%-20%
  
  // 确保山地、丘陵和河流的总和不超过100%
  const totalTerrainPercentage = mountain + hill + river
  if (totalTerrainPercentage > 100) {
    const scale = 100 / totalTerrainPercentage
    mountain = Math.floor(mountain * scale)
    hill = Math.floor(hill * scale)
    river = Math.floor(river * scale)
  }
  
  // 平原占剩余的百分比
  const plain = 100 - mountain - hill - river
  
  // 生成森林覆盖率
  const forest = randomInt(10, 60)  // 森林覆盖率 10%-60%
  
  // 创建地形对象
  const terrain: Terrain = {
    buildingSlots: 0,  // 暂时设为0，后面会计算
    mountain,
    hill,
    plain,
    river,
    forest
  }
  
  return terrain
}

/**
 * 根据群人数和地形计算建筑位
 * @param memberCount 群成员数量
 * @param terrain 地形特质
 * @returns 更新后的地形特质（包含计算后的建筑位）
 */
export function calculateTerrainBuildingSlots(memberCount: number, terrain: Terrain): Terrain {
  // 每个群成员提供5个建筑位
  const baseSlots = memberCount * 5
  
  // 计算地形影响后的实际建筑位
  const actualSlots = calculateBuildingSlots(terrain, baseSlots)
  
  // 更新地形对象
  return {
    ...terrain,
    buildingSlots: actualSlots
  }
}

/**
 * 检查地区是否满足建造水电站的条件
 * @param terrain 地形特质
 * @returns 是否满足条件
 */
export function canBuildHydroPower(terrain: Terrain): boolean {
  // 需要河流占比大于10%
  return terrain.river >= 10
}

/**
 * 获取地形描述文本
 * @param terrain 地形特质
 * @returns 地形描述文本
 */
export function getTerrainDescription(terrain: Terrain): string {
  return `■建筑位：${terrain.buildingSlots}\n` +
         `■地形特质：\n` +
         `□山地：${terrain.mountain}%\n` +
         `□丘陵：${terrain.hill}%\n` +
         `□平原：${terrain.plain}%\n` +
         `□河流：${terrain.river}%\n` +
         `□森林覆盖率：${terrain.forest}%`
}
