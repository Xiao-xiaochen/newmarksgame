import { Context, Session, Query } from 'koishi'; // 导入 Query
import { Region, userdata } from '../../types'; // 导入 Region 和 userdata 类型

// 辅助函数：格式化仓库内容 (可复用或单独定义)
// 注意：这里假设 Region 接口有 warehouse, warehouseCapacity, OwarehouseCapacity 字段
function formatRegionWarehouse(title: string, warehouse: object | null | undefined, capacity: number | undefined, occupied: number | undefined): string {
  if (!warehouse) {
    return `■ ${title}: (无数据)`;
  }
  const items = Object.entries(warehouse)
    .filter(([key, value]) => typeof value === 'number' && value > 0)
    .map(([key, value]) => `  -${key}: ${value}`)
    .join('\n');

  const capacityInfo = `容量: ${occupied ?? '?'} / ${capacity ?? '?'}`; // 使用 ?? 处理 undefined
  const itemsDisplay = items.length > 0 ? items : '  (空)';
  return `■ ${title}: ${capacityInfo}\n${itemsDisplay}`;
}

// 辅助函数：检查用户权限 (占位符 - 用于远程查看)
async function checkUserPermissionForRegion(ctx: Context, session: Session, region: Region): Promise<boolean> {
  // TODO: 实现详细的权限检查逻辑
  // 1. 获取用户信息
  const userId = session.userId;
  if (!userId) return false;
  const userDataResult = await ctx.database.get('userdata', { userId: userId });
  if (!userDataResult || userDataResult.length === 0) return false; // 未注册用户无权限
  const user = userDataResult[0];

  // 2. 检查是否为地区所属国家的成员
  const regionOwnerCountry = region.owner;
  if (!regionOwnerCountry) return false; // 无主地区，理论上不应有仓库，或另有规则

  if (user.countryName !== regionOwnerCountry) {
    return false; // 不是该国成员
  }

  // 3. TODO: 检查用户在该国的权限等级 (需要国家成员权限等级数据)
  // const userPermissionLevel = await getPermissionLevel(ctx, userId, regionOwnerCountry);
  // if (userPermissionLevel < 2) { // 假设需要 2 级权限
  //   return false;
  // }

  return true; // 暂时只检查国家成员身份
}


export function RegionWarehouse(ctx: Context) {
  // --- 修改命令定义，接受可选参数 identifier ---
  ctx.command('查看地区仓库 [identifier:string]', '查看指定地区或当前绑定地区的生活/工业仓库')
    .alias('地区仓库')
    .usage('查看指定地区或当前群聊绑定地区的仓库。可以提供4位地区编号，或群号，或在已绑定地区的群聊中不带参数执行。')
    .example('查看地区仓库 0101')
    .example('查看地区仓库 123456789 (群号)')
    .example('查看地区仓库 (在已绑定的群聊中)')
    .action(async ({ session }, identifier) => {
      if (!session || !session.userId || !session.author) {
        return '无法获取用户信息。';
      }
      const userId = session.userId;
      const username = session.author.name || '未知用户';

      let dbQuery: Query<Region>; // 使用 Query<Region> 类型
      let isRemoteViewById = false; // 标记是否通过 RegionId 远程查看

      try {
        // 检查用户是否注册 (可选)
        const userInfo = await ctx.database.get('userdata', { userId: userId });
        if (!userInfo || userInfo.length === 0) {
          return `
====[错误]====
${username} 同志！
您尚未注册！请先发送“阅读报告”
`.trim();
        }

        // --- 确定查询条件 (参照 ResourceInfo.ts) ---
        if (identifier) {
          if (/^\d{4}$/.test(identifier)) {
            // 按 RegionId 查询
            dbQuery = { RegionId: identifier };
            isRemoteViewById = true; // 通过ID查看，需要权限检查
          } else {
            // 按 guildId 查询
            dbQuery = { guildId: identifier };
            // 按群号查看，也视为远程，但权限检查可能不同或不需要？暂定需要
            // isRemoteViewById = true; // 或者根据你的规则决定是否检查权限
          }
        } else if (session.guildId) {
          // 按当前 guildId 查询 (本地查看)
          dbQuery = { guildId: session.guildId };
          isRemoteViewById = false; // 本地查看，通常权限要求较低或无
        } else {
          return '请提供地区编号或群号，或者在已绑定地区的群聊中使用此命令。';
        }
        // --- 查询条件确定完毕 ---

        // 执行数据库查询
        const regionDataResult = await ctx.database.get('regiondata', dbQuery);

        // 检查是否找到地区
        if (!regionDataResult || regionDataResult.length === 0) {
          if (identifier) {
            return `未找到标识符为 "${identifier}" 的地区。`;
          } else {
            return `当前群聊 (${session.guildId}) 未绑定任何地区，或该地区数据不存在。`;
          }
        }

        const regionData: Region = regionDataResult[0];

        // --- 权限检查 (仅在通过 RegionId 远程查看时强制执行) ---
        if (isRemoteViewById) {
          const hasPermission = await checkUserPermissionForRegion(ctx, session, regionData);
          if (!hasPermission) {
            return `权限不足：您无权查看地区 ${regionData.RegionId} 的仓库信息。`;
          }
        }
        // 对于按 guildId 查看或本地查看，可以根据需要添加不同的权限逻辑

        // --- 获取到地区数据后进行处理 ---
        const civilianWarehouse = regionData.warehouse;
        const civilianCapacity = regionData.warehouseCapacity;
        const civilianOccupied = regionData.OwarehouseCapacity;

        const civilianOutput = formatRegionWarehouse('仓库', civilianWarehouse, civilianCapacity, civilianOccupied);

        const output = `
=====[ 地区仓库 ]=====
地区编号: ${regionData.RegionId} ${dbQuery.guildId === session.guildId && !identifier ? '(当前频道绑定)' : ''}
所属群聊: ${regionData.guildId || '未绑定'}
${civilianOutput}
`.trim();

        return output;

      } catch (error) {
        console.error(`查询地区仓库信息时出错 (查询: ${JSON.stringify(dbQuery)}, 用户: ${userId}):`, error);
        return '查询地区仓库信息时发生内部错误。';
      }
    });
}