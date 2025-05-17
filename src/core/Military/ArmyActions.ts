import { Context } from 'koishi';
import { Army, ArmyStatus, Region } from '../../types';
import { initiateCombat } from './war'; // 导入战斗逻辑函数

/**
 * 处理军队到达目标地区的逻辑。
 * @param ctx Koishi Context
 * @param armyId 到达的军队 ID
 */
export async function handleArmyArrival(ctx: Context, armyId: string): Promise<void> {
    console.log(`[行军到达] 开始处理军队 ${armyId} 的到达逻辑...`);
    let army: Army | undefined;
    try {
        const armyResult = await ctx.database.get('army', { armyId: armyId });
        if (!armyResult || armyResult.length === 0) {
            console.error(`[行军到达] 错误：无法找到军队 ${armyId} 的数据。`);
            return;
        }
        army = armyResult[0];

        // 验证军队状态和目标
        if (army.status !== ArmyStatus.MARCHING || !army.targetRegionId || !army.marchEndTime) {
            console.warn(`[行军到达] 警告：军队 ${armyId} 状态 (${army.status}) 或目标 (${army.targetRegionId}) 无效，取消处理。`);
            // 考虑是否需要重置状态，例如如果不是MARCHING，可能需要设为GARRISONED
            if (army.status !== ArmyStatus.MARCHING) {
                await ctx.database.set('army', { armyId: armyId }, { status: ArmyStatus.GARRISONED, targetRegionId: undefined, marchEndTime: undefined });
                console.log(`[行军到达] 军队 ${armyId} 状态非行军，已重置为驻扎。`);
            }
            return;
        }

        // 稍微放宽时间检查，允许几秒的误差
        const timeDifference = Date.now() - army.marchEndTime;
        if (timeDifference < -5000) { // 如果提前超过 5 秒到达，可能是有问题
            console.warn(`[行军到达] 警告：军队 ${armyId} 尚未到达预定时间 (差 ${-timeDifference}ms)，取消处理。`);
            // 重新设置一个短延时定时器以防万一？或者依赖 Koishi 的定时器机制
            return;
        }
        console.log(`[行军到达] 军队 ${armyId} 时间检查通过 (实际到达时间与预定时间差: ${timeDifference}ms)。`);

        const targetRegionId = army.targetRegionId;
        console.log(`[行军到达] 军队 ${armyId} 确认到达目标地区 ${targetRegionId}`);

        // 1. 获取目标地区信息
        const targetRegionResult = await ctx.database.get('regiondata', { RegionId: targetRegionId });
        if (!targetRegionResult || targetRegionResult.length === 0) {
            console.error(`[行军到达] 错误：无法找到目标地区 ${targetRegionId} 的数据。军队 ${armyId} 将返回驻扎状态。`);
            await ctx.database.set('army', { armyId: armyId }, {
                status: ArmyStatus.GARRISONED,
                targetRegionId: undefined,
                marchEndTime: undefined,
                // 考虑是否移回原驻地？需要 army 对象有原始 regionId
                // regionId: army.originalRegionId // 假设有这个字段
            });
            return;
        }
        const targetRegion: Region = targetRegionResult[0];
        console.log(`[行军到达] 成功获取目标地区 ${targetRegionId} 数据。`);

        // 2. 获取目标地区的所有驻军 (不包括自己)
        const defendingArmiesResult = await ctx.database.get('army', {
            regionId: targetRegionId,
            status: ArmyStatus.GARRISONED, // 只考虑驻扎中的
            armyId: { $ne: armyId }
        });
        const potentialDefenders: Army[] = defendingArmiesResult;
        console.log(`[行军到达] 目标地区 ${targetRegionId} 发现 ${potentialDefenders.length} 支潜在防御军队。`);

        // 3. 检查是否有敌对驻军
        const armyOwnerData = (await ctx.database.get('userdata', { userId: army.commanderId }))?.[0];
        const armyOwnerCountry = armyOwnerData?.countryName;
        console.log(`[行军到达] 进攻方军队 ${armyId} 指挥官 ${army.commanderId} 所属国家: ${armyOwnerCountry || '无'}`);

        const enemyArmies: Army[] = [];
        for (const defArmy of potentialDefenders) {
            const defCommanderData = await ctx.database.get('userdata', { userId: defArmy.commanderId });
            const defCommanderCountry = defCommanderData?.[0]?.countryName;
            console.log(`[行军到达] 检查防御方军队 ${defArmy.armyId} 指挥官 ${defArmy.commanderId} 所属国家: ${defCommanderCountry || '无'}`);

            let isEnemy = false;
            if (!targetRegion.owner) { // 目标地区无主
                isEnemy = true;
                console.log(`[行军到达] 判定: 目标地区 ${targetRegionId} 无主，军队 ${defArmy.armyId} 是敌人。`);
            } else if (armyOwnerCountry) { // 进攻方有国家
                if (!defCommanderCountry || defCommanderCountry !== armyOwnerCountry) { // 防守方无国家或是不同国家
                    isEnemy = true;
                    console.log(`[行军到达] 判定: 进攻方国家 ${armyOwnerCountry} 与防御方国家 ${defCommanderCountry || '无'} 不同，军队 ${defArmy.armyId} 是敌人。`);
                }
            } else { // 进攻方无国家，目标地区有主
                 isEnemy = true; // 暂定无国家者攻击有主地时，所有驻军都是敌人
                 console.log(`[行军到达] 判定: 进攻方无国家，目标地区 ${targetRegionId} 有主，军队 ${defArmy.armyId} 是敌人。`);
            }

            if (isEnemy) {
                enemyArmies.push(defArmy);
            }
        }
        console.log(`[行军到达] 敌对判断完成，发现 ${enemyArmies.length} 支敌军: [${enemyArmies.map(a => a.armyId).join(',')}]`);

        if (enemyArmies.length > 0) {
            // --- 发现敌军，开始战斗 ---
            console.log(`[行军到达] 军队 ${armyId} 在地区 ${targetRegionId} 遭遇敌军，准备调用 initiateCombat。`);

            // 通知战斗爆发
            const broadcastMessage = `警报！${army.name}(${army.armyId}) 抵达地区 ${targetRegionId} 并遭遇敌军 (${enemyArmies.map(a=>a.name).join(',')})，战斗爆发！`;
            if (targetRegion.guildId) {
                ctx.broadcast([`onebot:${targetRegion.guildId}`], broadcastMessage).catch(e => console.warn(`[广播失败] 无法向目标地区 ${targetRegionId} (${targetRegion.guildId}) 发送战斗消息:`, e));
            }

            // --- 调用战斗核心逻辑 ---
            // initiateCombat 应该负责更新 army 和 enemyArmies 的状态为 FIGHTING
            initiateCombat(ctx, army, enemyArmies, targetRegion); // 异步执行
            console.log(`[行军到达] 已调用 initiateCombat 处理军队 ${armyId} 与敌军的战斗。函数将异步执行。`);

        } else {
            // --- 无敌军，占领/移动成功 ---
            console.log(`[行军到达] 军队 ${armyId} 成功移动到地区 ${targetRegionId}，无敌军。准备更新军队状态和地区归属。`);
            const oldRegionId = army.regionId; // 记录旧地区ID

            // 更新军队位置和状态
            await ctx.database.set('army', { armyId: armyId }, {
                regionId: targetRegionId, // 更新位置
                status: ArmyStatus.GARRISONED, // 恢复驻扎
                targetRegionId: undefined,
                marchEndTime: undefined,
            });
            console.log(`[行军到达] 军队 ${armyId} 状态已成功更新为驻扎在 ${targetRegionId}。`);

            // 检查是否需要改变地区归属
            let occupationMessage = `军队 ${army.name}(${army.armyId}) 已成功移动并驻扎在地区 ${targetRegionId}。`;
            // 只有当进攻方有国家时，才可能改变地区归属
            if (armyOwnerCountry && targetRegion.owner !== armyOwnerCountry) {
                const oldOwner = targetRegion.owner || '无主地';
                await ctx.database.set('regiondata', { RegionId: targetRegionId }, { owner: armyOwnerCountry });
                occupationMessage = `军队 ${army.name}(${army.armyId}) 已代表 ${armyOwnerCountry} 占领地区 ${targetRegionId}！(原属：${oldOwner})`;
                console.log(`[地区易主] 地区 ${targetRegionId} 的控制权从 ${oldOwner} 变为 ${armyOwnerCountry}`);
            } else {
                console.log(`[行军到达] 地区 ${targetRegionId} 归属未改变 (当前归属: ${targetRegion.owner || '无主地'}, 军队国家: ${armyOwnerCountry || '无'})。`);
            }

            // 发送移动/占领成功消息到目标地区和原地区群聊
            const oldRegionGuildId = (await ctx.database.get('regiondata', { RegionId: oldRegionId }))?.[0]?.guildId;
            const targetGuildId = targetRegion.guildId;
            const broadcastChannels: string[] = [];
            if (targetGuildId) broadcastChannels.push(`onebot:${targetGuildId}`);
            if (oldRegionGuildId && oldRegionGuildId !== targetGuildId) broadcastChannels.push(`onebot:${oldRegionGuildId}`);

            if (broadcastChannels.length > 0) {
                console.log(`[行军到达] 准备向频道 ${broadcastChannels.join(', ')} 广播消息: ${occupationMessage}`);
                ctx.broadcast(broadcastChannels, occupationMessage).catch(e => console.warn("[广播失败] 广播行军成功/占领消息失败:", e))
            } else {
                console.warn("[广播失败] 无法确定广播频道，无法广播行军成功/占领消息。");
            }
        }
    } catch (error) {
        console.error(`[行军到达] 处理军队 ${armyId} 时发生错误:`, error);
    }
}