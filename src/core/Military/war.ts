import { Context } from 'koishi'; // 添加 Context 导入

import { Army, Region, TerrainType, BattleReport, BattlePhase, ArmyStatus, userdata, CombatParticipant } from '../../types';
import { INFANTRY_EQUIPMENT_STATS, INFANTRY_EQUIPMENT_TERRAIN_MODIFIERS } from '../equipmentStats';

const MAX_COMBAT_WIDTH = 80; // 默认战场宽度
const REINFORCE_CHANCE = 0.5; // 增援几率
const BASE_ORGANIZATION_DAMAGE = 5; // 基础组织度伤害
const BASE_MANPOWER_LOSS_FACTOR = 0.01; // 基础人力损失系数
const ROUT_THRESHOLD = 0.2; // 溃退组织度阈值 (20%)

// 计算军队的装备基础属性总和 (仅考虑步兵装备作为示例)
function calculateArmyBaseStats(army: Army): { attack: number; defense: number; breakthrough: number; organization: number } {
    let totalAttack = 0;
    let totalDefense = 0;
    let totalBreakthrough = 0;
    let totalOrganization = 0;

    const infantryEquipmentCount = army.equipment?.InfantryEquipment || 0;

    if (infantryEquipmentCount > 0) {
        totalAttack += INFANTRY_EQUIPMENT_STATS.attack * infantryEquipmentCount;
        totalDefense += INFANTRY_EQUIPMENT_STATS.defense * infantryEquipmentCount;
        totalBreakthrough += INFANTRY_EQUIPMENT_STATS.breakthrough * infantryEquipmentCount;
        // 组织度由装备提供，并与兵力按比例相关，这里简化为直接叠加，后续可调整
        // 假设每单位步兵装备提供固定组织度，总组织度上限受兵力影响或有其他计算方式
        // 此处暂时将装备提供的组织度作为基础，后续战斗中再根据兵力调整
        totalOrganization += INFANTRY_EQUIPMENT_STATS.organization * infantryEquipmentCount;
    }

    // 简单的人力基础攻防，可根据需要调整或移除
    totalAttack += army.manpower * 0.1; // 每人0.1攻击
    totalDefense += army.manpower * 0.1; // 每人0.1防御

    // 军队的初始组织度也应基于兵力和装备，这里暂时设定一个基于兵力的值，并加上装备提供的
    // 假设基础组织度为兵力的一半，加上装备提供的组织度
    // 注意：Army 接口中已有 organization 字段，此处计算的值应赋给该字段或用于战斗开始时的初始化
    const calculatedOrganization = army.manpower * 0.5 + totalOrganization;
    // army.organization = calculatedOrganization; // 更新军队对象中的组织度

    return {
        attack: totalAttack,
        defense: totalDefense,
        breakthrough: totalBreakthrough,
        organization: calculatedOrganization // 返回计算后的组织度
    };
}

// 获取地形修正 (仅考虑步兵装备)
function getTerrainModifiers(terrain: TerrainType): { attack: number; defense: number; breakthrough: number; } {
    const modifiers = INFANTRY_EQUIPMENT_TERRAIN_MODIFIERS[terrain] || {};
    return {
        attack: modifiers.attack || 0,
        defense: modifiers.defense || 0,
        breakthrough: modifiers.breakthrough || 0,
    };
}

// 初始化战斗参与者
function initializeParticipant(army: Army, terrain: TerrainType, isAttacker: boolean): CombatParticipant {
    const baseStats = calculateArmyBaseStats(army);
    const terrainModifiers = getTerrainModifiers(terrain);

    // 确保军队对象中的 organization 属性得到初始化或更新
    // 如果 army.organization 在传入时已经是计算好的，则直接使用
    // 否则，使用 calculateArmyBaseStats 返回的 organization
    const initialOrganization = army.organization !== undefined ? army.organization : baseStats.organization;

    return {
        army,
        currentManpower: army.manpower,
        currentOrganization: initialOrganization, // 使用 army 自身或计算得到的组织度
        totalAttack: baseStats.attack * (1 + terrainModifiers.attack),
        totalDefense: baseStats.defense * (1 + terrainModifiers.defense),
        totalBreakthrough: baseStats.breakthrough * (1 + terrainModifiers.breakthrough),
        terrainModifiers,
        isAttacker,
    };
}

// 执行一轮战斗
function executeCombatRound(ctx: Context, region: Region, attacker: CombatParticipant, defender: CombatParticipant, battleReport: BattleReport, phase: BattlePhase) {
    const roundReport = {
        phase,
        attackerStats: { manpower: attacker.currentManpower, organization: attacker.currentOrganization },
        defenderStats: { manpower: defender.currentManpower, organization: defender.currentOrganization },
        attackerLosses: { manpower: 0, organization: 0 },
        defenderLosses: { manpower: 0, organization: 0 },
        log: [] as string[],
    };

    // 1. 组织度伤害计算
    // 攻击方对防御方造成组织度伤害
    let orgDamageToDefender = (attacker.totalAttack / (defender.totalDefense + 1)) * BASE_ORGANIZATION_DAMAGE;
    orgDamageToDefender = Math.max(0, orgDamageToDefender); // 确保不为负
    defender.currentOrganization -= orgDamageToDefender;
    roundReport.defenderLosses.organization = orgDamageToDefender;
    roundReport.log.push(`攻击方对防御方造成 ${orgDamageToDefender.toFixed(2)} 组织度伤害.`);

    // 防御方对攻击方造成组织度伤害 (反击)
    let orgDamageToAttacker = (defender.totalAttack / (attacker.totalDefense + 1)) * BASE_ORGANIZATION_DAMAGE * 0.5; // 反击伤害较低
    orgDamageToAttacker = Math.max(0, orgDamageToAttacker);
    attacker.currentOrganization -= orgDamageToAttacker;
    roundReport.attackerLosses.organization = orgDamageToAttacker;
    roundReport.log.push(`防御方对攻击方造成 ${orgDamageToAttacker.toFixed(2)} 组织度伤害.`);

    // 确保组织度不低于0
    attacker.currentOrganization = Math.max(0, attacker.currentOrganization);
    defender.currentOrganization = Math.max(0, defender.currentOrganization);

    // 2. 突破判定与兵力伤害
    // 攻击方尝试突破
    if (attacker.totalBreakthrough > defender.totalDefense) {
        roundReport.log.push('攻击方成功突破！');
        // 突破成功，对防御方造成较高兵力伤害
        const manpowerLossDefender = defender.currentManpower * BASE_MANPOWER_LOSS_FACTOR * 2; // 突破成功伤害加倍
        defender.currentManpower -= manpowerLossDefender;
        roundReport.defenderLosses.manpower = manpowerLossDefender;
        roundReport.log.push(`防御方损失兵力 ${manpowerLossDefender.toFixed(0)}.`);

        // 防御方在被突破时也对攻击方造成少量兵力伤害
        const manpowerLossAttackerBreakthrough = attacker.currentManpower * BASE_MANPOWER_LOSS_FACTOR * 0.25;
        attacker.currentManpower -= manpowerLossAttackerBreakthrough;
        roundReport.attackerLosses.manpower += manpowerLossAttackerBreakthrough;
        roundReport.log.push(`攻击方在突破时损失兵力 ${manpowerLossAttackerBreakthrough.toFixed(0)}.`);
    } else {
        roundReport.log.push('攻击方未能突破。');
        // 未突破，双方都受到常规兵力伤害
        const manpowerLossDefender = defender.currentManpower * BASE_MANPOWER_LOSS_FACTOR;
        defender.currentManpower -= manpowerLossDefender;
        roundReport.defenderLosses.manpower = manpowerLossDefender;
        roundReport.log.push(`防御方损失兵力 ${manpowerLossDefender.toFixed(0)}.`);

        const manpowerLossAttacker = attacker.currentManpower * BASE_MANPOWER_LOSS_FACTOR;
        attacker.currentManpower -= manpowerLossAttacker;
        roundReport.attackerLosses.manpower += manpowerLossAttacker;
        roundReport.log.push(`攻击方损失兵力 ${manpowerLossAttacker.toFixed(0)}.`);
    }

    // 确保兵力不低于0
    attacker.currentManpower = Math.max(0, attacker.currentManpower);
    defender.currentManpower = Math.max(0, defender.currentManpower);

    battleReport.rounds.push(roundReport);
}

// 内部战斗结算函数
async function resolveSingleCombatEncounter(ctx: Context, attackingArmy: Army, defendingArmy: Army, region: Region): Promise<BattleReport> {
    const battleReport: BattleReport = {
        attacker: { armyId: attackingArmy.armyId, name: attackingArmy.name, initialManpower: attackingArmy.manpower, initialOrganization: attackingArmy.organization || calculateArmyBaseStats(attackingArmy).organization },
        defender: { armyId: defendingArmy.armyId, name: defendingArmy.name, initialManpower: defendingArmy.manpower, initialOrganization: defendingArmy.organization || calculateArmyBaseStats(defendingArmy).organization },
        regionId: region.RegionId,
        terrain: region.Terrain,
        startTime: Date.now(),
        rounds: [],
        result: {
            winner: null,
            reason: '',
            finalAttackerManpower: 0,
            finalAttackerOrganization: 0,
            finalDefenderManpower: 0,
            finalDefenderOrganization: 0,
        }
    };

    const attacker = initializeParticipant(attackingArmy, region.Terrain, true);
    const defender = initializeParticipant(defendingArmy, region.Terrain, false);

    // 更新战斗报告中的初始组织度，确保与 participant 一致
    battleReport.attacker.initialOrganization = attacker.currentOrganization;
    battleReport.defender.initialOrganization = defender.currentOrganization;

    let roundCount = 0;
    // const maxRounds = 20; // 最大回合数，防止无限循环 - 移除最大回合数限制

    // 战斗循环：直到一方兵力耗尽或组织度过低溃退
    while (attacker.currentManpower > 0 && defender.currentManpower > 0 && attacker.currentOrganization > attacker.army.manpower * ROUT_THRESHOLD && defender.currentOrganization > defender.army.manpower * ROUT_THRESHOLD) {
        roundCount++;
        let phase: BattlePhase = BattlePhase.MAIN_COMBAT;
        if (roundCount <= 3) phase = BattlePhase.INITIAL_ENGAGEMENT;
        else if (roundCount > 10) phase = BattlePhase.PROTRACTED_COMBAT; // 示例：超过10回合进入持久战

        executeCombatRound(ctx, region, attacker, defender, battleReport, phase); // Corrected: Passed ctx and region

        // 简单增援逻辑 (此处未实现具体增援单位加入战斗，仅为示例点)
        if (Math.random() < REINFORCE_CHANCE) {
            // battleReport.rounds[battleReport.rounds.length - 1].log.push('一方或双方获得了增援！(未实现)');
        }
    }

    // 战斗结束判定
    battleReport.endTime = Date.now();
    battleReport.result.finalAttackerManpower = Math.round(attacker.currentManpower);
    battleReport.result.finalAttackerOrganization = attacker.currentOrganization;
    battleReport.result.finalDefenderManpower = Math.round(defender.currentManpower);
    battleReport.result.finalDefenderOrganization = defender.currentOrganization;

    // 溃退条件调整：组织度低于最大组织度（假设为初始兵力）的 ROUT_THRESHOLD，或者兵力耗尽
    // 注意：attacker.army.manpower 是初始兵力，如果战斗中兵力会变，可能需要用初始值
    const attackerInitialManpower = battleReport.attacker.initialManpower; // 使用战报中的初始兵力
    const defenderInitialManpower = battleReport.defender.initialManpower;

    if (attacker.currentOrganization <= attackerInitialManpower * ROUT_THRESHOLD || attacker.currentManpower <= 0) {
        battleReport.result.winner = defendingArmy.armyId;
        battleReport.result.reason = attacker.currentManpower <= 0 ? '攻击方兵力耗尽' : '攻击方组织度过低溃退';
        defendingArmy.status = ArmyStatus.DEFENDING; // 防守方胜利后恢复驻扎/防御状态
        attackingArmy.status = ArmyStatus.RETREATING; // 攻击方溃退
    } else if (defender.currentOrganization <= defenderInitialManpower * ROUT_THRESHOLD || defender.currentManpower <= 0) {
        battleReport.result.winner = attackingArmy.armyId;
        battleReport.result.reason = defender.currentManpower <= 0 ? '防御方兵力耗尽' : '防御方组织度过低溃退';
        attackingArmy.status = ArmyStatus.OCCUPYING; // 攻击方胜利后可能进入占领状态
        defendingArmy.status = ArmyStatus.RETREATING; // 防御方溃退
    } else {
        // 理论上不应该到达这里，因为循环条件会保证一方溃退或兵力耗尽
        // 如果循环因为其他原因（例如未来的新条件）结束，可以设定一个默认结果
        battleReport.result.winner = null;
        battleReport.result.reason = '战斗结束，无明确胜负（非溃退或兵力耗尽）'; // 调整原因描述
        attackingArmy.status = ArmyStatus.IDLE; // 或其他合适状态
        defendingArmy.status = ArmyStatus.IDLE;
    }

    // 更新军队对象的实际兵力和组织度
    attackingArmy.manpower = Math.round(attacker.currentManpower);
    attackingArmy.organization = attacker.currentOrganization;
    defendingArmy.manpower = Math.round(defender.currentManpower);
    defendingArmy.organization = defender.currentOrganization;

    return battleReport;
}

/**
 * 初始化并执行战斗流程。
 * @param ctx Koishi Context
 * @param attackingArmy 进攻方军队
 * @param defendingArmies 防御方军队列表 (可能有多支)
 * @param region 战斗发生的地区
 */
export async function initiateCombat(ctx: Context, attackingArmy: Army, defendingArmies: Army[], region: Region): Promise<void> {
    console.log(`[战斗开始] 军队 ${attackingArmy.armyId} 在地区 ${region.RegionId} 对战 ${defendingArmies.map(d => d.armyId).join(', ')}`);

    // 1. 设置参战军队状态为战斗中
    await ctx.database.set('army', { armyId: attackingArmy.armyId }, { status: ArmyStatus.FIGHTING });
    for (const defArmy of defendingArmies) {
        await ctx.database.set('army', { armyId: defArmy.armyId }, { status: ArmyStatus.FIGHTING });
    }
    console.log(`[战斗状态] 进攻方 ${attackingArmy.armyId} 及防御方 ${defendingArmies.map(d => d.armyId).join(', ')} 状态已设为 FIGHTING。`);

    // 2. 简化：目前只处理第一个防御方军队，未来可以扩展为多方混战或轮战
    // TODO: 实现更复杂的多个防御者参与战斗的逻辑 (例如，基于战场宽度选择参战者)
    if (defendingArmies.length === 0) {
        console.warn(`[战斗警告] 军队 ${attackingArmy.armyId} 在地区 ${region.RegionId} 没有防御方军队，战斗取消。`);
        await ctx.database.set('army', { armyId: attackingArmy.armyId }, { status: ArmyStatus.GARRISONED }); // 攻击方恢复驻扎
        return;
    }
    const mainDefender = defendingArmies[0]; // 选取主要防御者
    console.log(`[战斗核心] 主要交战双方: 攻击方 ${attackingArmy.armyId} vs 防御方 ${mainDefender.armyId}`);

    // 3. 执行战斗结算
    const battleReport = await resolveSingleCombatEncounter(ctx, attackingArmy, mainDefender, region); // Corrected: Passed ctx
    console.log(`[战斗结算] 军队 ${attackingArmy.armyId} 与 ${mainDefender.armyId} 的战斗已结算。胜者: ${battleReport.result.winner || '僵持'}, 原因: ${battleReport.result.reason}`);

    // 4. 根据战斗结果更新数据库
    // 更新进攻方
    await ctx.database.set('army', { armyId: attackingArmy.armyId }, {
        manpower: battleReport.result.finalAttackerManpower,
        organization: battleReport.result.finalAttackerOrganization,
        status: attackingArmy.status, // conductBattle 内部已经更新了 status
    });
    // 更新防御方
    await ctx.database.set('army', { armyId: mainDefender.armyId }, {
        manpower: battleReport.result.finalDefenderManpower,
        organization: battleReport.result.finalDefenderOrganization,
        status: mainDefender.status, // conductBattle 内部已经更新了 status
    });
    console.log(`[数据更新] 军队 ${attackingArmy.armyId} 和 ${mainDefender.armyId} 的兵力、组织度和状态已更新至数据库。`);

    // 5. 发送战报 (简化示例，实际应发送给相关玩家或频道)
    let reportMessage = `--- 战报：${region.RegionId} (${region.RegionId}) ---\n`;
    reportMessage += `进攻方: ${battleReport.attacker.name} (${battleReport.attacker.armyId}) | 初始兵力: ${battleReport.attacker.initialManpower}, 初始组织度: ${battleReport.attacker.initialOrganization?.toFixed(0)}\n`;
    reportMessage += `防御方: ${battleReport.defender.name} (${battleReport.defender.armyId}) | 初始兵力: ${battleReport.defender.initialManpower}, 初始组织度: ${battleReport.defender.initialOrganization?.toFixed(0)}\n`;
    reportMessage += `地形: ${region.Terrain}\n`;
    reportMessage += `战斗结果: ${battleReport.result.winner ? `胜者 - ${battleReport.result.winner === attackingArmy.armyId ? attackingArmy.name : mainDefender.name}` : '僵持'}\n`;
    reportMessage += `原因: ${battleReport.result.reason}\n`;
    reportMessage += `攻击方损失: 兵力 ${battleReport.attacker.initialManpower - battleReport.result.finalAttackerManpower}, 组织度 ${(battleReport.attacker.initialOrganization || 0) - (battleReport.result.finalAttackerOrganization || 0)}\n`;
    reportMessage += `防御方损失: 兵力 ${battleReport.defender.initialManpower - battleReport.result.finalDefenderManpower}, 组织度 ${(battleReport.defender.initialOrganization || 0) - (battleReport.result.finalDefenderOrganization || 0)}\n`;
    reportMessage += `攻击方剩余: 兵力 ${battleReport.result.finalAttackerManpower}, 组织度 ${battleReport.result.finalAttackerOrganization?.toFixed(0)}\n`;
    reportMessage += `防御方剩余: 兵力 ${battleReport.result.finalDefenderManpower}, 组织度 ${battleReport.result.finalDefenderOrganization?.toFixed(0)}\n`;

    // 5. 发送战报 (根据待办事项 12 格式化并发送)
    const reportPart1 = `=====[战报]=====
交战地区：${battleReport.regionId}
地区地形：${battleReport.terrain}
■进攻方：${battleReport.attacker.name}
■编号：${battleReport.attacker.armyId}
□兵力：${battleReport.attacker.initialManpower.toLocaleString()}
□组织度：${battleReport.attacker.initialOrganization?.toFixed(0)}
■防御方：${battleReport.defender.name}
■编号：${battleReport.defender.armyId}
□兵力：${battleReport.defender.initialManpower.toLocaleString()}
□组织度：${battleReport.defender.initialOrganization?.toFixed(0)}
■战斗结果：${battleReport.result.winner ? (battleReport.result.winner === attackingArmy.armyId ? '进攻方胜利' : '防御方胜利') : '僵持'}
■原因：${battleReport.result.reason}`;

    const reportPart2 = `=====[结果]=====
■攻击方损失:
□兵力：${(battleReport.attacker.initialManpower - battleReport.result.finalAttackerManpower).toLocaleString()}
□组织度：${((battleReport.attacker.initialOrganization || 0) - (battleReport.result.finalAttackerOrganization || 0)).toFixed(1)}
■防御方损失:
□兵力：${(battleReport.defender.initialManpower - battleReport.result.finalDefenderManpower).toLocaleString()},
□组织度：${((battleReport.defender.initialOrganization || 0) - (battleReport.result.finalDefenderOrganization || 0)).toFixed(1)}
■攻击方剩余:
□兵力：${battleReport.result.finalAttackerManpower.toLocaleString()}
□组织度：${battleReport.result.finalAttackerOrganization?.toFixed(0)}
■防御方剩余:
□兵力：${battleReport.result.finalDefenderManpower.toLocaleString()}
□组织度：${battleReport.result.finalDefenderOrganization?.toFixed(0)}`;

    console.log(`[战报生成]\n${reportPart1}\n${reportPart2}`);

    // 广播战报到地区频道 (如果存在)
    if (region.guildId) {
        try {
            await ctx.broadcast([`onebot:${region.guildId}`], reportPart1);
            await ctx.broadcast([`onebot:${region.guildId}`], reportPart2);
            console.log(`[战报广播] 战报已发送至频道 ${region.guildId}`);
        } catch (e) {
            console.warn(`[广播失败] 无法向地区 ${region.RegionId} (${region.guildId}) 发送战报:`, e);
        }
    }

    // TODO: 处理战斗后的军队状态 (例如，溃退军队的移动，占领逻辑等)
    // 例如，如果攻击方胜利且状态为 OCCUPYING，可能需要更新地区所有者
    if (battleReport.result.winner === attackingArmy.armyId && attackingArmy.status === ArmyStatus.OCCUPYING) {
        const attackerOwnerData = (await ctx.database.get('userdata', { userId: attackingArmy.commanderId }))?.[0];
        const attackerCountry = attackerOwnerData?.countryName;
        if (attackerCountry && region.owner !== attackerCountry) {
            const oldOwner = region.owner || '无主地';
            await ctx.database.set('regiondata', { RegionId: region.RegionId }, { owner: attackerCountry });
            const occupationMsg = `[地区易主] ${attackerCountry} 的军队 ${attackingArmy.name} 占领了地区 ${region.RegionId} (原属: ${oldOwner})!`;
            console.log(occupationMsg);
            if (region.guildId) ctx.broadcast([`onebot:${region.guildId}`], occupationMsg).catch(e => console.warn("占领消息广播失败", e));
        } else {
             // 攻击方胜利但无需改变归属 (例如攻击方无国家，或地区已属于攻击方国家)
            await ctx.database.set('army', { armyId: attackingArmy.armyId }, { status: ArmyStatus.GARRISONED }); // 直接驻扎
            console.log(`[战斗胜利] 攻击方 ${attackingArmy.armyId} 胜利，已在 ${region.RegionId} 转为驻扎。地区归属未变。`);
        }
    }

    // 处理攻击方溃退
    if (attackingArmy.status === ArmyStatus.RETREATING) {
        console.log(`[溃退处理] 攻击方 ${attackingArmy.armyId} 溃退，需实现返回逻辑。暂时恢复为驻扎。`);
        // 简化处理：暂时让溃退军队在原地恢复驻扎，后续应实现撤退到安全区域
        await ctx.database.set('army', { armyId: attackingArmy.armyId }, { status: ArmyStatus.GARRISONED, targetRegionId: undefined, marchEndTime: undefined });

        // 广播攻击方溃退消息和战报给指挥官和首都
        const commanderDataAttacker = (await ctx.database.get('userdata', { userId: attackingArmy.commanderId }))?.[0];
        if (commanderDataAttacker) {
            // TODO: 实现向指挥官发送消息的逻辑 (私聊或指定频道)
            // const retreatMsgAttacker = `[军队溃退] 您的军队 ${attackingArmy.name} (${attackingArmy.armyId}) 在 ${region.RegionId} 的战斗中溃退！`;
            // console.log(retreatMsgAttacker);
            // 发送 retreatMsgAttacker, reportPart1, reportPart2 给指挥官
        }

        if (commanderDataAttacker?.countryName) {
            const countryDataAttacker = (await ctx.database.get('country', { name: commanderDataAttacker.countryName }))?.[0];
            if (countryDataAttacker?.capitalRegionId) {
                const capitalRegionAttacker = (await ctx.database.get('regiondata', { RegionId: countryDataAttacker.capitalRegionId }))?.[0];
                if (capitalRegionAttacker?.guildId) {
                    const retreatMsgAttackerCapital = `[军队溃退] ${commanderDataAttacker.countryName} 的军队 ${attackingArmy.name} (${attackingArmy.armyId}) 在 ${region.RegionId} 的战斗中溃退！`;
                    ctx.broadcast([`onebot:${capitalRegionAttacker.guildId}`], retreatMsgAttackerCapital).catch(e => console.warn("攻击方溃退消息广播到首都失败", e));
                    ctx.broadcast([`onebot:${capitalRegionAttacker.guildId}`], reportPart1).catch(e => console.warn("攻击方战报Part1广播到首都失败", e));
                    ctx.broadcast([`onebot:${capitalRegionAttacker.guildId}`], reportPart2).catch(e => console.warn("攻击方战报Part2广播到首都失败", e));
                }
            }
        }
    }

    // 处理防御方溃退
    if (mainDefender.status === ArmyStatus.RETREATING) {
        console.log(`[溃退处理] 防御方 ${mainDefender.armyId} 溃退，需实现返回逻辑。暂时恢复为驻扎。`);
        await ctx.database.set('army', { armyId: mainDefender.armyId }, { status: ArmyStatus.GARRISONED, targetRegionId: undefined, marchEndTime: undefined });

        // 广播防御方溃退消息和战报给指挥官和首都
        const commanderDataDefender = (await ctx.database.get('userdata', { userId: mainDefender.commanderId }))?.[0];
        if (commanderDataDefender) {
             // TODO: 实现向指挥官发送消息的逻辑 (私聊或指定频道)
            // const retreatMsgDefender = `[军队溃退] 您的军队 ${mainDefender.name} (${mainDefender.armyId}) 在 ${region.RegionId} 的战斗中溃退！`;
            // console.log(retreatMsgDefender);
            // 发送 retreatMsgDefender, reportPart1, reportPart2 给指挥官
        }

        if (commanderDataDefender?.countryName) {
            const countryDataDefender = (await ctx.database.get('country', { name: commanderDataDefender.countryName }))?.[0];
            if (countryDataDefender?.capitalRegionId) {
                const capitalRegionDefender = (await ctx.database.get('regiondata', { RegionId: countryDataDefender.capitalRegionId }))?.[0];
                if (capitalRegionDefender?.guildId) {
                    const retreatMsgDefenderCapital = `[军队溃退] ${commanderDataDefender.countryName} 的军队 ${mainDefender.name} (${mainDefender.armyId}) 在 ${region.RegionId} 的战斗中溃退！`;
                     ctx.broadcast([`onebot:${capitalRegionDefender.guildId}`], retreatMsgDefenderCapital).catch(e => console.warn("防御方溃退消息广播到首都失败", e));
                    ctx.broadcast([`onebot:${capitalRegionDefender.guildId}`], reportPart1).catch(e => console.warn("防御方战报Part1广播到首都失败", e));
                    ctx.broadcast([`onebot:${capitalRegionDefender.guildId}`], reportPart2).catch(e => console.warn("防御方战报Part2广播到首都失败", e));
                }
            }
        }
    } else if (battleReport.result.winner === mainDefender.armyId && mainDefender.status === ArmyStatus.DEFENDING) {
        // 防御方胜利，恢复驻扎
        await ctx.database.set('army', { armyId: mainDefender.armyId }, { status: ArmyStatus.GARRISONED });
        console.log(`[战斗胜利] 防御方 ${mainDefender.armyId} 胜利，已在 ${region.RegionId} 转为驻扎。`);
    }

    // 对于僵持的情况，双方都恢复驻扎状态 (或根据游戏规则设定其他状态)
    if (attackingArmy.status === ArmyStatus.STALEMATE) {
        await ctx.database.set('army', { armyId: attackingArmy.armyId }, { status: ArmyStatus.GARRISONED });
    }
    if (mainDefender.status === ArmyStatus.STALEMATE) {
        await ctx.database.set('army', { armyId: mainDefender.armyId }, { status: ArmyStatus.GARRISONED });
    }

    console.log(`[战斗结束] 军队 ${attackingArmy.armyId} 与 ${defendingArmies.map(d => d.armyId).join(', ')} 在地区 ${region.RegionId} 的战斗流程处理完毕。`);
}

// 示例：如何调用战斗 (需要完整的 Army 和 Region 对象)
/*

// 示例：如何调用战斗 (需要完整的 Army 和 Region 对象)
/*
const sampleAttackingArmy: Army = {
    armyId: 'attacker_1',
    name: '第一攻击集团军',
    commanderId: 'player1',
    regionId: 'region_A',
    manpower: 10000,
    equipment: { InfantryEquipment: 100 }, // 100件步兵装备
    foodSupply: 1000,
    organization: 5000, // 初始组织度，会被重新计算或使用
    status: ArmyStatus.MARCHING,
};

const sampleDefendingArmy: Army = {
    armyId: 'defender_1',
    name: '第一防御集团军',
    commanderId: 'player2',
    regionId: 'region_B',
    manpower: 8000,
    equipment: { InfantryEquipment: 80 },
    foodSupply: 800,
    organization: 4000,
    status: ArmyStatus.DEFENDING,
};

const sampleRegion: Region = {
    regionId: 'region_B',
    name: '中部平原',
    terrain: TerrainType.PLAIN,
    owner: 'player2',
    // ... 其他地区属性
    manpower: 100000,
    resources: { food: 100, wood: 100, stone: 100, iron: 50, oil: 20, gold:10, coal:10, steel:10, rareMetal:10, rubber:10, aluminum:10, uranium:10 },
    buildings: { farm: 5, mine: 2, factory: 1, port:0, airport:0, railway:0, fortress:0, cfactory:0, mfactory:0, shipyard:0, researchInstitute:0, nuclearPlant:0, rocketSilo:0, radarStation:0, barracks:0, militaryAcademy:0, supplyDepot:0, hospital:0, propagandaCenter:0, secretPoliceHQ:0, university:0, bank:0, stockExchange:0, tradeCenter:0, residentialArea:0, commercialDistrict:0, industrialZone:0, administrativeCenter:0, culturalCenter:0, entertainmentDistrict:0, sportsComplex:0, park:0, natureReserve:0, historicalSite:0, landmark:0, wonder:0, spaceElevator:0, dysonSphere:0, stellarEngine:0, wormholeGenerator:0, interdimensionalPortal:0, realityAnchor:0, godEmperorStatue:0, blackHoleGenerator:0, timeMachine:0, wishGranter:0, philosopherStone:0, holyGrail:0, fountainOfYouth:0, elDorado:0, shangriLa:0, atlantis:0, camelot:0, valhalla:0, olympus:0, gardenOfEden:0, heaven:0, hell:0, purgatory:0, limbo:0, void:0, abyss:0, chaos:0, order:0, dream:0, nightmare:0, illusion:0, reality:0, truth:0, lie:0, paradox:0, singularity:0, infinity:0, eternity:0, oblivion:0, nirvana:0, enlightenment:0, transcendence:0, apotheosis:0, deification:0, godhood:0 },
    developmentLevel: 5,
    infrastructureLevel: 3,
    stability: 0.8,
    supportRate: 0.7,
    population: 500000,
    maxPopulation: 1000000,
    growthRate: 0.01,
    unemploymentRate: 0.05,
    crimeRate: 0.02,
    educationLevel: 0.6,
    healthLevel: 0.7,
    culture: 'default',
    religion: 'none',
    pollutionLevel: 0.1,
    resourceConsumption: { food: 200 },
    resourceProduction: { food: 250 },
    taxRate: 0.1,
    revenue: 1000,
    expenses: 500,
    budget: 500,
    debt: 0,
    gdp: 1000000,
    gdpPerCapita: 2,
    inflationRate: 0.02,
    economicGrowthRate: 0.03,
    tradeBalance: 100,
    foreignInvestment: 50,
    nationalHappiness: 0.7,
    politicalFreedom: 0.6,
    civilLiberties: 0.5,
    corruptionIndex: 0.3,
    governmentEffectiveness: 0.6,
    ruleOfLaw: 0.7,
    militaryStrength: 1000,
    navalStrength: 100,
    airForceStrength: 200,
    spaceForceStrength: 0,
    technologicalLevel: 5,
    researchPoints: 100,
    espionagePoints: 50,
    diplomacyPoints: 30,
    influencePoints: 20,
    prestige: 50,
    warWeariness: 0.1,
    rebellionRisk: 0.05,
    autonomyLevel: 1,
    isCapital: false,
    isCoastal: false,
    hasPort: false,
    hasAirport: false,
    hasRailway: false,
    hasFortress: false,
    hasResources: ['food', 'wood', 'stone'],
    connectedRegions: ['region_A', 'region_C'],
    garrison: null,
    events: [],
    modifiers: [],
    constructions: [],
    lastUpdated: Date.now(),
    warehouse: { food: 10000, wood: 5000, stone: 5000, iron: 1000, oil: 500, gold:100, coal:100, steel:100, rareMetal:100, rubber:100, aluminum:100, uranium:100 },
    militarywarehouse: { InfantryEquipment: 1000, Tank: 100 },
    labor: 50000,
    cfactory: 10,
    mfactory: 5,
    shipyard: 1,
    researchInstitute: 2,
    nuclearPlant: 0,
    rocketSilo: 0,
    radarStation: 1,
    barracks: 5,
    militaryAcademy: 1,
    supplyDepot: 3,
    hospital: 2,
    propagandaCenter: 1,
    secretPoliceHQ: 1,
    university: 3,
    bank: 2,
    stockExchange: 1,
    tradeCenter: 2,
    residentialArea: 10,
    commercialDistrict: 5,
    industrialZone: 5,
    administrativeCenter: 1,
    culturalCenter: 1,
    entertainmentDistrict: 2,
    sportsComplex: 1,
    park: 3,
    natureReserve: 1,
    historicalSite: 1,
    landmark: 1,
    wonder: 0,
    spaceElevator: 0,
    dysonSphere: 0,
    stellarEngine: 0,
    wormholeGenerator: 0,
    interdimensionalPortal: 0,
    realityAnchor: 0,
    godEmperorStatue: 0,
    blackHoleGenerator: 0,
    timeMachine: 0,
    wishGranter: 0,
    philosopherStone: 0,
    holyGrail: 0,
    fountainOfYouth: 0,
    elDorado: 0,
    shangriLa: 0,
    atlantis: 0,
    camelot: 0,
    valhalla: 0,
    olympus: 0,
    gardenOfEden: 0,
    heaven: 0,
    hell: 0,
    purgatory: 0,
    limbo: 0,
    void: 0,
    abyss: 0,
    chaos: 0,
    order: 0,
    dream: 0,
    nightmare: 0,
    illusion: 0,
    reality: 0,
    truth: 0,
    lie: 0,
    paradox: 0,
    singularity: 0,
    infinity: 0,
    eternity: 0,
    oblivion: 0,
    nirvana: 0,
    enlightenment: 0,
    transcendence: 0,
    apotheosis: 0,
    deification: 0,
    godhood: 0,
};

const report = conductBattle(sampleAttackingArmy, sampleDefendingArmy, sampleRegion);
console.log('战斗报告:', JSON.stringify(report, null, 2));
console.log('攻击方最终状态:', sampleAttackingArmy);
console.log('防御方最终状态:', sampleDefendingArmy);
*/
