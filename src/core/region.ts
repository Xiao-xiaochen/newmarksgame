// src/core/region.ts
import { Context } from 'koishi'
import { RegionData } from '../models'

export class RegionSystem {
  constructor(private ctx: Context) {}

  // 获取或创建地区数据
  async getRegion(channelId: string): Promise<RegionData> {
    // 查询数据库
    const [region] = await this.ctx.database.get('region', { channelId })
    // 如果不存在则创建初始数据
    if (!region) {
      return await this.createDefaultRegion(channelId)
    }
    return region
  }

  // 创建默认地区数据
  private async createDefaultRegion(channelId: string): Promise<RegionData> {
    const defaultData: RegionData = {
      channelId,
      controller: '未分配',
      leader: '',
      population: 30, // 默认30万人口
      infrastructure: {
        used: 30,
        total: 86
      },
      storage: 14000,
      primaryIndustry: 20,
      secondaryIndustry: 10,
      garrison: 3
    }

    await this.ctx.database.create('region', defaultData)
    return defaultData
  }
}
