// 新马列文游 - 随机数生成工具

/**
 * 生成指定范围内的随机整数
 * @param min 最小值（包含）
 * @param max 最大值（包含）
 * @returns 随机整数
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 生成指定范围内的随机浮点数
 * @param min 最小值（包含）
 * @param max 最大值（包含）
 * @returns 随机浮点数
 */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

/**
 * 三角分布随机数生成
 * 根据最小值、最可能值和最大值生成符合三角分布的随机数
 * @param min 最小值
 * @param mode 最可能值
 * @param max 最大值
 * @returns 符合三角分布的随机数
 */
export function triangularDistribution(min: number, mode: number, max: number): number {
  const F = (mode - min) / (max - min)
  const rand = Math.random()
  
  let result: number
  if (rand < F) {
    result = min + Math.sqrt(rand * (max - min) * (mode - min))
  } else {
    result = max - Math.sqrt((1 - rand) * (max - min) * (max - mode))
  }
  
  return Math.round(result)
}

/**
 * 生成带误差的数值
 * 用于情报系统中显示不准确的信息
 * @param realValue 真实值
 * @param errorRange 误差范围（百分比，如30表示±30%）
 * @returns 带误差的数值范围 [最小值, 最大值]
 */
export function generateErrorRange(realValue: number, errorRange: number): [number, number] {
  const minError = -errorRange / 100
  const maxError = errorRange / 100
  
  // 生成两个随机误差
  const error1 = randomFloat(minError, maxError)
  const error2 = randomFloat(minError, maxError)
  
  // 计算带误差的值
  const value1 = Math.round(realValue * (1 + error1))
  const value2 = Math.round(realValue * (1 + error2))
  
  // 返回最小值和最大值
  return [Math.min(value1, value2), Math.max(value1, value2)]
}

/**
 * 生成资源储量
 * 使用三角分布生成各类资源的基础储量
 * @returns 资源储量对象
 */
export function generateResourceBase() {
  return {
    ironOre: triangularDistribution(30000, 80000, 150000),
    coal: triangularDistribution(50000, 120000, 250000),
    aluminum: triangularDistribution(0, 30000, 100000),
    rareEarth: triangularDistribution(0, 15000, 30000),
    oil: triangularDistribution(0, 60000, 100000),
    rareMetal: triangularDistribution(0, 30000, 60000)
  }
}
