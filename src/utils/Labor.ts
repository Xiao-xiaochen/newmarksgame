// 新马列文游 - 劳动力函数

import { PrimaryIndustry, Region, SecondaryIndustry } from '../types'

/**
 * 计算地区总劳动力
 * @param population 地区总人口（万）
 * @returns 劳动力人口（万）
 */
export function calculateLaborPopulation(population: number): number {
  // 劳动力人口是地区人口的60%
  return Math.floor(population * 0.6)
}

/**
 * 计算第一产业固定劳动力
 * @param primaryIndustry 第一产业数据
 * @returns 固定劳动力数量（万）
 */
export function calculatePrimaryIndustryLabor(primaryIndustry: PrimaryIndustry): number {
  // 每个农田需要1万人
  return primaryIndustry.farmland
}

/**
 * 计算第二产业固定劳动力
 * @param secondaryIndustry 第二产业数据
 * @returns 固定劳动力数量（万）
 */
export function calculateSecondaryIndustryLabor(secondaryIndustry: SecondaryIndustry): number {
  // 每个轻工业、建筑业需要1万人
  const lightIndustryLabor = secondaryIndustry.lightIndustry
  const constructionLabor = secondaryIndustry.construction
  
  // 每个重工业、军工业需要2万人
  const heavyIndustryLabor = secondaryIndustry.heavyIndustry * 2
  const militaryIndustryLabor = secondaryIndustry.militaryIndustry * 2
  
  return lightIndustryLabor + constructionLabor + heavyIndustryLabor + militaryIndustryLabor
}

/**
 * 计算地区劳动力分配情况
 * @param region 地区数据
 * @returns 劳动力分配情况 [总劳动力, 繁忙劳动力, 空闲劳动力, 固定劳动力]
 */
export function calculateLaborDistribution(region: Region): [number, number, number, number] {
  // 总劳动力
  const totalLabor = region.laborPopulation
  
  // 固定劳动力（第一产业 + 第二产业）
  const primaryLabor = region.primaryIndustry.fixedLabor
  const secondaryLabor = calculateSecondaryIndustryLabor(region.secondaryIndustry)
  const fixedLabor = primaryLabor + secondaryLabor
  
  // 繁忙劳动力（临时分配的劳动力）
  // 这里假设繁忙劳动力是通过其他命令临时分配的，存储在region的某个属性中
  const busyLabor = 0 // 这里需要根据实际情况计算
  
  // 空闲劳动力
  const idleLabor = Math.max(0, totalLabor - fixedLabor - busyLabor)
  
  return [totalLabor, busyLabor, idleLabor, fixedLabor]
}

/**
 * 分配劳动力到农业
 * @param region 地区数据
 * @param amount 要分配的劳动力数量（万）
 * @returns 更新后的地区数据
 */
export function assignLaborToAgriculture(region: Region, amount: number): Region {
  // 检查可用劳动力
  const [totalLabor, busyLabor, idleLabor, fixedLabor] = calculateLaborDistribution(region)
  
  // 如果空闲劳动力不足，调整分配数量
  const actualAmount = Math.min(amount, idleLabor)
  
  // 更新第一产业固定劳动力
  const updatedPrimaryIndustry = {
    ...region.primaryIndustry,
    fixedLabor: region.primaryIndustry.fixedLabor + actualAmount
  }
  
  // 返回更新后的地区数据
  return {
    ...region,
    primaryIndustry: updatedPrimaryIndustry
  }
}

/**
 * 取消分配劳动力
 * @param region 地区数据
 * @param industryType 产业类型 ('agriculture' | 'industry')
 * @param amount 要取消分配的劳动力数量（万）
 * @returns 更新后的地区数据
 */
export function unassignLabor(region: Region, industryType: 'agriculture' | 'industry', amount: number): Region {
  if (industryType === 'agriculture') {
    // 检查已分配的劳动力
    const currentLabor = region.primaryIndustry.fixedLabor
    
    // 如果已分配劳动力不足，调整取消数量
    const actualAmount = Math.min(amount, currentLabor)
    
    // 更新第一产业固定劳动力
    const updatedPrimaryIndustry = {
      ...region.primaryIndustry,
      fixedLabor: currentLabor - actualAmount
    }
    
    // 返回更新后的地区数据
    return {
      ...region,
      primaryIndustry: updatedPrimaryIndustry
    }
  } else {
    // 处理工业劳动力取消分配的逻辑
    // 这里需要根据实际情况实现
    return region
  }
}

/**
 * 获取劳动力分配描述文本
 * @param region 地区数据
 * @returns 劳动力分配描述文本
 */
export function getLaborDistributionDescription(region: Region): string {
  const [totalLabor, busyLabor, idleLabor, fixedLabor] = calculateLaborDistribution(region)
  
  return `=====[地区劳动力]=====\n` +
         `■总劳动力：${totalLabor}万人\n` +
         `■繁忙劳动力：${busyLabor}万人\n` +
         `■空闲劳动力：${idleLabor}万人\n` +
         `■固定劳动力：${fixedLabor}万人`
}
