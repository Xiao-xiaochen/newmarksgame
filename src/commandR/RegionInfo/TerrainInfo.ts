import { Context } from 'koishi';
import { WorldMap } from '../../core/Map/MapCore'; // 导入 WorldMap
import { Region } from '../../types'; // 导入 Region 类型

export function TerrainInfo(ctx: Context) {
  ctx.command('查看地区特质 <regionId:string>').alias('地区特质').alias('地形特质')
    .usage('查看指定地区的特质信息')
    .example('查看地区特质 0101')
    .action(async (_, regionId) => { // 将 action 改为 async 函数
      if (!regionId || !/^\d{4}$/.test(regionId)) {
        return '请提供有效的4位数地区编号，例如：0101';
      }
      try {
        // 2. 从数据库异步获取存储的地区数据
        const regionDataResult = await ctx.database.get('regiondata', { RegionId: regionId });
        if (!regionDataResult || regionDataResult.length === 0) {
          return `错误：未在数据库中找到地区 ${regionId} 的数据。`;
        }
        const regionData: Region = regionDataResult[0]; // 获取第一条记录

        // 4. 结合计算特质和数据库数据构建返回信息
        return `
=====[地区特质]=====
□地区编号：${regionId}
■基础设施：${regionData.base}/${regionData.maxbase}
■主要地形：${regionData.Terrain}
`.trim();
      } catch (error) {
        console.error(`获取地区 ${regionId} 特质时出错:`, error); // 建议在控制台打印详细错误
        return `获取地区特质时出错: ${error.message}`;
      }
    });
}

