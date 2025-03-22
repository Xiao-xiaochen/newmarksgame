import { Context, Schema, Session, Command } from 'koishi' // 导入 Command 类型
import Database from '@koishijs/plugin-database-sqlite' // 修改 Database 导入方式
import * as region from './core/region' // 导入地区模块
// ... 导入其他模块和指令

export const name = 'newmarksgame'

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

// 声明数据库扩展
declare module 'koishi' {
  interface Database {
    newmarksgame: Context.Database & { // 修改数据库扩展类型声明
      getRegion: (id: string) => Promise<region.Region | undefined>
      createRegion: (data: region.Region) => Promise<region.Region>
      updateRegion: (id: string, data: Partial<region.Region>) => Promise<number>
      deleteRegion: (id: string) => Promise<number>
    }
  }
}


export function apply(ctx: Context, config: Config) {
  // 扩展 model
  ctx.model.extend(('region' as any), { // 强制类型转换 'region' 为 any
    id: 'string', // 地区 ID
    name: 'string', // 地区名称
    owner: 'string', // 控制方（国家 ID）
    leader: 'string', // 领导人（玩家 ID）
    population: 'integer', // 地区人口
    infrastructure: 'integer', // 基础设施（建筑位）
    maxInfrastructure: 'integer',
    warehouse: 'integer', // 地区仓库容量
    primaryIndustry: 'integer', // 第一产业数量
    secondaryIndustry: 'integer', // 第二产业数量
    garrison: 'integer', // 地区驻军
    terrainFeatures: 'json', // 地形特质, 使用 json 类型
    resourceReserves: 'json', // 资源储量, 使用 json 类型
  })


  // 注册指令
  ctx.command('地区注册', '注册一个新地区')
    .action(async ({ session }: Command.ActionPayload<any>) => { // 修改 action 函数参数类型为 Command.ActionPayload<any>
      const groupId = session!.guildId; // 使用 ! 断言 session 不为 undefined
      if (!groupId) {
        return '请在群聊中注册地区。';
      }

      // 检查地区是否已注册
      const existingRegion = await ctx.database.newmarksgame.getRegion(groupId); // 使用 ctx.database.newmarksgame
      if (existingRegion) {
        return '该群已注册地区，请勿重复注册。';
      }

      const regionData: region.Region = {
        id: groupId, // 使用群号作为地区 ID
        name: `[群号]的地区`, // 默认地区名称
        owner: '', // 初始控制方为空
        leader: session!.userId, // 使用 ! 断言 session 不为 undefined
        population: 0, // 初始人口为 0
        infrastructure: 50, // 初始基础设施为 50
        maxInfrastructure: 50,
        warehouse: 10000, // 初始仓库容量
        primaryIndustry: 0, // 初始第一产业数量为 0
        secondaryIndustry: 0, // 初始第二产业数量为 0
        garrison: 0, // 初始驻军为 0
        terrainFeatures: { // 默认地形特质
          mountain: 0.3,
          hill: 0.1,
          plain: 0.5,
          river: 0.1,
          forest: 0.4,
        },
        resourceReserves: { // 初始资源储量
          rareEarth: 79200,
          rareMetal: 33600,
          ironOre: 184400,
          coal: 322500,
          crudeOil: 108000,
        },
      };

      try {
        await ctx.database.newmarksgame.createRegion(regionData); // 使用 ctx.database.newmarksgame
        return `地区注册成功！\n地区名称：${regionData.name}\n领导人：${session!.username}`; // 使用 ! 断言 session 不为 undefined
      } catch (error) {
        console.error('地区注册失败', error);
        return '地区注册失败，请稍后重试。';
      }
    })

  ctx.command('查看地区', '查看当前地区信息')
    .action(async ({ session }: Command.ActionPayload<any>) => { // 修改 action 函数参数类型为 Command.ActionPayload<any>
      const groupId = session!.guildId; // 获取当前群号
      if (!groupId) {
        return '请在群聊中使用“查看地区”指令。';
      }

      // 从数据库中获取地区数据
      const regionData = await ctx.database.newmarksgame.getRegion(groupId);
      if (!regionData) {
        return '地区未注册，请先使用“地区注册”指令注册地区。';
      }

      // 格式化地区信息
      const regionInfo = [
        '=====[地区信息]=====',
        `■ 控制方：${regionData.owner || '无'}`,
        `■ 领导人：${regionData.leader}`,
        `□ 地区人口：${regionData.population}万`,
        `□ 基础设施：${regionData.infrastructure}/${regionData.maxInfrastructure}`,
        `□ 地区仓库：${regionData.warehouse}`,
        `□ 第一产业数量：${regionData.primaryIndustry}`,
        `□ 第二产业数量：${regionData.secondaryIndustry}`,
        `■ 地区驻军：${regionData.garrison}万`,
      ].join('\n');

      return regionInfo;
    })

  // 加载其他模块和指令
  // ...
  
  ctx.command('test', '测试指令').action(() => {
      return 'Hello, NewMarksGame!'
  })
}
