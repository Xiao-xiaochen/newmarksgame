// 新马列文游 - 主入口文件

import { Context, Schema } from 'koishi'
import { resolve } from 'path'
import { GameState, NewMarksGameOptions, PluginContext } from './types'
import * as fs from 'fs/promises'

// 导入核心系统
import { initializeIndustrySystem } from './core/IndustrySystem'
import { initializePopulationSystem } from './core/PopulationSystem'
import { initializeWarSystem } from './core/WarSystem'
import { initializeEconomySystem } from './core/EconomySystem'
import { initializeRegionSystem } from './core/RegionSystem'
import { initializeTerrainSystem } from './core/TerrainSystem'

// 导入玩家命令
import { registerPlayerInfoCommand } from './commandP/Playerinfo'
import { registerMyPrimaryIndustryCommand } from './commandP/PrimaryIndustry/MyPrimaryIndustry'
import { registerReadAgricultureReportCommand } from './commandP/PrimaryIndustry/ReadAgricultureReport'

// 导入地区命令
import { registerRegionInfoCommand } from './commandR/Regioninfo'
import { registerLaborInfoCommand } from './commandR/Laborinfo'
import { registerTerrainInfoCommand } from './commandR/Terraininfo'
import { registerRegionPrimaryIndustryCommand } from './commandR/PrimaryIndustry/RegionPrimaryIndustry'

// 插件配置
export const name = 'newmarksgame'
export const usage = '一个模块化，轻量化的硬核战争文游'

// 插件选项
export interface Config extends NewMarksGameOptions {}

// 插件选项的Schema
export const Config: Schema<Config> = Schema.object({
  gameStartHour: Schema.number().default(6).description('游戏开始小时（0-23）'),
  gameEndHour: Schema.number().default(0).description('游戏结束小时（0-23）'),
})

// 数据库初始化
const initializeDatabase = (ctx: Context) => {
  return {
    async getPlayer(id: string) {
      return await ctx.database.get('newmarksgame_players', { id }).then(players => players[0] || null)
    },
    async savePlayer(player) {
      await ctx.database.upsert('newmarksgame_players', [player])
    },
    async getCountry(id: string) {
      return await ctx.database.get('newmarksgame_countries', { id }).then(countries => countries[0] || null)
    },
    async saveCountry(country) {
      await ctx.database.upsert('newmarksgame_countries', [country])
    },
    async getRegion(id: string) {
      return await ctx.database.get('newmarksgame_regions', { id }).then(regions => regions[0] || null)
    },
    async saveRegion(region) {
      await ctx.database.upsert('newmarksgame_regions', [region])
    },
    async getGameState() {
      return await ctx.database.get('newmarksgame_state', {}).then(states => states[0] || {
        currentHour: new Date().getHours(),
        gameActive: true,
        players: {},
        countries: {},
        regions: {}
      })
    },
    async saveGameState(state) {
      await ctx.database.upsert('newmarksgame_state', [state])
    }
  }
}

// 初始化数据库表
const setupDatabase = async (ctx: Context) => {
  // 玩家表
  await ctx.database.extend('newmarksgame_players', {
    id: 'string',
    name: 'string',
    population: 'number',
    infrastructure: 'number',
    constructionDept: 'number',
    lightIndustry: 'number',
    farmland: 'number',
    food: 'number',
    country: 'string',
    position: 'string'
  }, {
    primary: 'id'
  })

  // 国家表
  await ctx.database.extend('newmarksgame_countries', {
    id: 'string',
    name: 'string',
    leader: 'string',
    members: 'json',
    positions: 'json',
    totalArmy: 'number',
    totalIndustry: 'number'
  }, {
    primary: 'id'
  })

  // 地区表
  await ctx.database.extend('newmarksgame_regions', {
    id: 'string',
    name: 'string',
    controller: 'string',
    leader: 'string',
    population: 'number',
    laborPopulation: 'number',
    infrastructure: 'json',
    warehouse: 'number',
    primaryIndustry: 'json',
    secondaryIndustry: 'json',
    army: 'number',
    terrain: 'json',
    resources: 'json',
    powerPlants: 'json',
    militaryBase: 'json',
    militaryWarehouse: 'json',
    intelligenceNetwork: 'json'
  }, {
    primary: 'id'
  })

  // 游戏状态表
  await ctx.database.extend('newmarksgame_state', {
    currentHour: 'number',
    gameActive: 'boolean',
    players: 'json',
    countries: 'json',
    regions: 'json'
  })
}

// 游戏时钟
const setupGameClock = (pluginContext: PluginContext) => {
  const { ctx, options, gameState } = pluginContext

  // 每小时检查一次游戏状态
  ctx.setInterval(async () => {
    const currentHour = new Date().getHours()
    
    // 更新游戏状态
    gameState.currentHour = currentHour
    
    // 检查游戏是否应该活跃
    if (options.gameStartHour < options.gameEndHour) {
      // 例如：6点到0点
      gameState.gameActive = currentHour >= options.gameStartHour && currentHour < options.gameEndHour
    } else {
      // 例如：0点到6点
      gameState.gameActive = !(currentHour >= options.gameEndHour && currentHour < options.gameStartHour)
    }
    
    // 如果游戏活跃，执行每小时的游戏逻辑
    if (gameState.gameActive) {
      // 处理资源生产、人口变化等
      await processHourlyEvents(pluginContext)
    }
    
    // 保存游戏状态
    await pluginContext.db.saveGameState(gameState)
  }, 60 * 60 * 1000) // 每小时执行一次
}

// 每小时事件处理
const processHourlyEvents = async (pluginContext: PluginContext) => {
  // 这里实现每小时的游戏逻辑，如资源生产、人口变化等
  // 可以调用各个系统的方法来处理
}

// 插件入口
export function apply(ctx: Context, config: Config) {
  // 设置数据库
  setupDatabase(ctx)
  
  // 初始化数据库接口
  const db = initializeDatabase(ctx)
  
  // 获取游戏状态
  db.getGameState().then(gameState => {
    // 创建插件上下文
    const pluginContext: PluginContext = {
      ctx,
      db,
      options: config,
      gameState
    }
    
    // 设置游戏时钟
    setupGameClock(pluginContext)
    
    // 初始化核心系统
    initializeIndustrySystem(pluginContext)
    initializePopulationSystem(pluginContext)
    initializeWarSystem(pluginContext)
    initializeEconomySystem(pluginContext)
    initializeRegionSystem(pluginContext)
    initializeTerrainSystem(pluginContext)
    
    // 注册玩家命令
    registerPlayerInfoCommand(pluginContext)
    registerMyPrimaryIndustryCommand(pluginContext)
    registerReadAgricultureReportCommand(pluginContext)
    
    // 注册地区命令
    registerRegionInfoCommand(pluginContext)
    registerLaborInfoCommand(pluginContext)
    registerTerrainInfoCommand(pluginContext)
    registerRegionPrimaryIndustryCommand(pluginContext)
    
    // 其他初始化逻辑...
  })
}
