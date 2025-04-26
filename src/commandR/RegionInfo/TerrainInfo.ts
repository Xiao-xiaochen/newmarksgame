import { Context } from 'koishi';
import { WorldMap } from '../../core/Map/MapCore';

export function TerrainInfo(ctx: Context) {
  // 获取世界地图单例
  const worldMap = WorldMap.getInstance();
  
  // 注册查看地区特质命令
  ctx.command('查看地区特质 <regionId:string>')
    .alias('地区特质')
    .usage('查看指定地区的特质信息')
    .example('查看地区特质 0101')
    .action(async (_, regionId) => {
      if (!regionId || !/^\d{4}$/.test(regionId)) {
        return '请提供有效的4位数地区编号，例如：0101';
      }
      
      try {
        // 调用WorldMap中的方法获取地区描述
        return worldMap.getRegionDescription(regionId);
      } catch (error) {
        return `获取地区特质时出错: ${error.message}`;
      }
    });
}