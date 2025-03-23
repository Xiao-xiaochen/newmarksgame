import { Context } from 'koishi'
import { Region } from './types'

declare module 'koishi' {
    interface Tables {
      region: Region
    }
  }

//我不会写数据模型定义都先'string'吧,这个ctx不知道为什么会报错

ctx.model.extend('RegionData', {
  id: 'unsigned',
  owner: 'string',                     // 控制方（国家 ID）
  leader: 'string',                    // 领导人（玩家 ID）
  population: 'string',                // 地区人口
  infrastructure: 'string',            // 基础设施（建筑位）
  maxInfrastructure: 'string',         // 最大基础设施
  warehouse: 'string',                 // 地区仓库容量
  primaryIndustry: 'string',           // 第一产业数量
  secondaryIndustry: 'string',         // 第二产业数量
  garrison: 'string',                  // 军事驻守数量                 
})