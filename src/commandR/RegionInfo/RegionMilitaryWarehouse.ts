import { Context, Session, Query } from 'koishi'; // 导入 Query
import { Region, userdata } from '../../types'; // 导入 Region 和 userdata 类型

// --- 复用或重新定义辅助函数 ---

// 格式化军事仓库 (与 RegionWarehouse.ts 中的类似，但针对 militarywarehouse)
function formatRegionMilitaryWarehouse(title: string, warehouse: object | null | undefined, capacity: number | undefined, occupied: number | undefined): string {
    if (!warehouse) {
        return `■ ${title}: (无数据)`;
    }
    const items = Object.entries(warehouse)
        .filter(([key, value]) => typeof value === 'number' && value > 0)
        .map(([key, value]) => `  -${key}: ${value}`)
        .join('\n');

    const capacityInfo = `${occupied ?? '?'} / ${capacity ?? '?'}`;
    const itemsDisplay = items.length > 0 ? items : '  (空)';
    return `■ ${title}: ${capacityInfo}\n${itemsDisplay}`;
}

// 权限检查函数 (可以从 RegionWarehouse.ts 导入或在此重新定义/调用)
// 假设 checkUserPermissionForRegion 函数已在别处定义或导入
async function checkUserPermissionForRegion(ctx: Context, session: Session, region: Region): Promise<boolean> {
    // ... (与 RegionWarehouse.ts 中相同的权限检查逻辑) ...
    const userId = session.userId;
    if (!userId) return false;
    const userDataResult = await ctx.database.get('userdata', { userId: userId });
    if (!userDataResult || userDataResult.length === 0) return false;
    const user = userDataResult[0];
    const regionOwnerCountry = region.owner;
    if (!regionOwnerCountry) return false;
    if (user.countryName !== regionOwnerCountry) return false;
    // TODO: 添加权限等级检查
    return true;
}


export function RegionMilitaryWarehouse(ctx: Context) {
  // --- 修改命令定义，接受可选参数 identifier ---
  ctx.command('查看地区军事仓库 [identifier:string]', '查看指定地区或当前绑定地区的军事仓库')
    .alias('地区军事仓库')
    .usage('查看指定地区或当前群聊绑定地区的军事仓库。可以提供4位地区编号，或群号，或在已绑定地区的群聊中不带参数执行。')
    .example('查看地区军事仓库 0101')
    .example('查看地区军事仓库 123456789 (群号)')
    .example('查看地区军事仓库 (在已绑定的群聊中)')
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
            // isRemoteViewById = true; // 根据规则决定是否检查权限
          }
        } else if (session.guildId) {
          // 按当前 guildId 查询 (本地查看)
          dbQuery = { guildId: session.guildId };
          isRemoteViewById = false;
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
            return `权限不足：您无权查看地区 ${regionData.RegionId} 的军事仓库信息。`;
          }
        }
        // 对于按 guildId 查看或本地查看，可以根据需要添加不同的权限逻辑

        // --- 获取到地区数据后进行处理 ---
        const militaryWarehouse = regionData.militarywarehouse;
        const militaryCapacity = regionData.militarywarehouseCapacity;
        const militaryOccupied = regionData.OmilitarywarehouseCapacity;

        const militaryOutput = formatRegionMilitaryWarehouse('军事仓库', militaryWarehouse, militaryCapacity, militaryOccupied);

        const output = `
=====[ 地区军事仓库 ]=====
地区编号: ${regionData.RegionId} ${dbQuery.guildId === session.guildId && !identifier ? '(当前频道绑定)' : ''}
所属群聊: ${regionData.guildId || '未绑定'}
${militaryOutput}
`.trim();

        return output;

      } catch (error) {
        console.error(`查询地区军事仓库信息时出错 (查询: ${JSON.stringify(dbQuery)}, 用户: ${userId}):`, error);
        return '查询地区军事仓库信息时发生内部错误。';
      }
    });
}