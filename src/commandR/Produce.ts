import { Context } from "koishi";
// 导入 produce 函数和 MILITARY_ITEMS
import { MILITARY_ITEMS, produce } from "../core/MilitaryProduction";
import { Region, userdata } from "../types"; // <--- 确保导入 userdata 类型
// 移除未使用的 hasEnoughWarehouseSpace，因为它现在在 produce 函数内部处理
// import { hasEnoughWarehouseSpace } from "../utils/Warehouse";

// PRODUCT_TO_WAREHOUSE_KEY 映射现在由 core/MilitaryProduction.ts 管理，这里不再需要
// const PRODUCT_TO_WAREHOUSE_KEY: Record<string, string> = { ... };

export function RegionProduce(ctx: Context) {
  ctx.command("地区军事生产 <item:string> <factoryCount:number>")
    .usage("地区生产 [物品] [分配工厂数]")
    .example("地区生产 坦克 1")
    .action(async ({ session }, item, factoryCount) => {
      if (!session) return "会话不存在";
      const username = session.author?.name || "未知用户";
      const userId = session.userId;
      const guildId = session.guildId;
      if (!userId || !guildId) return "无法获取用户或地区信息";

      // 检查用户注册
      const userInfoResult = await ctx.database.get("userdata", { userId }); // 修改变量名避免冲突
      if (!userInfoResult || userInfoResult.length === 0) {
        return `====[错误]====\n${username} 同志！\n您尚未注册！\n请先发送“阅读报告”`;
      }
      const user: userdata = userInfoResult[0]; // 获取用户数据

      // 获取地区数据
      const regionArr = await ctx.database.get("regiondata", { guildId });
      if (!regionArr || regionArr.length === 0) {
        return `====[错误]====\n${username} 同志！\n当前群聊未绑定任何地区。`;
      }
      const region: Region = regionArr[0];
      const targetRegionId = region.RegionId; // 获取地区ID

      // --- 新增：检查驻扎状态 ---
      if (user.regionId !== targetRegionId) {
        return `====[错误]====\n${username} 同志！\n您必须驻扎在地区 ${targetRegionId} 才能在此进行生产。请先使用“驻扎”指令。`;
      }
      // --- 驻扎状态检查结束 ---

      // --- 权限和国家检查 (可选但推荐) ---
      if (!region.owner) {
          return `====[错误]====\n地区 ${targetRegionId} 当前为无主地，无法进行生产。`;
      }
      if (user.countryName !== region.owner) {
          return `====[错误]====\n您 (${user.countryName}) 不属于控制该地区 (${targetRegionId}) 的国家 (${region.owner})，无法进行生产。`;
      }
      // --- 权限检查结束 ---


      // --- 基本参数校验 ---
      if (!item || !MILITARY_ITEMS[item]) {
        return `无效的生产物品类型。\n可生产：${Object.keys(MILITARY_ITEMS).join("、")}`;
      }
      if (!factoryCount || !Number.isInteger(factoryCount) || factoryCount <= 0) {
        return "分配工厂数必须为正整数";
      }
      // --- 基本参数校验结束 ---


      // --- 调用核心生产逻辑 ---
      const productionResult = produce(region, item, factoryCount);
      // --- 核心生产逻辑调用结束 ---


      // --- 处理生产结果 ---
      if (!productionResult.success) {
        // 如果生产失败，直接返回核心逻辑提供的错误消息
        return `====[生产失败]====\n${username} 同志：\n${productionResult.message}`;
      }

      // 如果生产成功，更新数据库
      // 确保 productionResult.changes 不为 undefined
      if (!productionResult.changes) {
          console.error("生产成功但未返回变更数据！", productionResult);
          return "发生内部错误：生产成功但无法更新数据。";
      }
      await ctx.database.set("regiondata", { guildId }, productionResult.changes);

      // --- 组织成功回复 ---
      // 组织消耗资源文本
      let resourceText = "";
      if (productionResult.resourceCosts) {
          for (const [res, amount] of Object.entries(productionResult.resourceCosts)) {
              if (amount > 0) { // 只显示实际消耗的资源
                  let resName = res;
                  // 可以创建一个资源名称映射来简化这里
                  if (res === "steel") resName = "钢铁";
                  else if (res === "rareMetal") resName = "稀有金属";
                  else if (res === "aluminum") resName = "铝";
                  else if (res === "rubber") resName = "橡胶";
                  resourceText += `□${resName}：${amount}\n`;
              }
          }
      }

      // 获取更新后的劳动力（如果存在于 changes 中）
      const updatedLabor = productionResult.changes.labor ?? region.labor; // 如果没变，用旧值
      const laborWan = (updatedLabor / 10000).toFixed(2);
      // 计算消耗的劳动力 = 初始劳动力 - 更新后劳动力
      const laborConsumed = region.labor - updatedLabor;

      const reply = [
        "=====[军事工业]=====",
        `${username} 同志：`,
        "■生产成功",
        `■${item}+${productionResult.producedAmount || '未知数量'}`, // 使用返回的实际产量
        `■空闲劳动力：${laborWan}万 (-${laborConsumed})`, // 显示消耗的劳动力
        "■消耗资源：（吨）",
        resourceText.trim() || "无", // 如果没有消耗，显示无
      ].join("\n");

      return reply;
      // --- 成功回复结束 ---
    });
}