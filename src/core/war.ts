/**
 *  all wars are civil wars,because all men are brothers.——Francois Fenelon
 *  所有的战争都是内战，因为所有的人类都是同胞。——弗朗索瓦•费奈隆
 *  愿世界和平
 */

import { Context } from 'koishi';
import { Army, ArmyStatus, Region, TerrainType } from '../types';
import { INFANTRY_EQUIPMENT_STATS, INFANTRY_EQUIPMENT_TERRAIN_MODIFIERS, } from './equipmentStats';
import { TerrainStatModifiers } from '../types';

// 定义装备的基础属性接口
// --- 常量定义 ---
const ORGANIZATION_PER_GUN = INFANTRY_EQUIPMENT_STATS.organization; // 每把枪提供的组织度
const RETREAT_THRESHOLD_PERCENT = 0.20; // 组织度低于此百分比时触发溃退
const DIRECT_BREAKTHROUGH_THRESHOLD = 1.00; // 突破值 >= 防御力 * 此值 = 直接突破
const PARTIAL_BREAKTHROUGH_THRESHOLD = 0.50; // 突破值 >= 防御力 * 此值 = 部分突破
const DIRECT_BREAKTHROUGH_ORG_DAMAGE_PERCENT = 0.30; // 直接突破对敌方组织度伤害百分比
const PARTIAL_BREAKTHROUGH_ORG_DAMAGE_PERCENT = 0.15; // 部分突破对敌方组织度伤害百分比
const STALEMATE_HOURLY_ORG_DAMAGE_FACTOR = 0.2; // 胶着战每小时组织度伤害系数
const STALEMATE_HOURLY_EQUIPMENT_LOSS_PERCENT = 0.05; // 胶着战每小时装备损失百分比
const RETREAT_EQUIPMENT_LOSS_PERCENT = 0.30; // 溃退时强制损失装备百分比
const MEDICAL_EFFICIENCY = 1; // 医疗效率 (影响伤亡转换)，暂定为1
const COMBAT_TICK_INTERVAL_HOURS = 1; // 战斗模拟的时间间隔（小时）
const MAX_COMBAT_TICKS = 24 * 7; // 最大战斗持续时间（模拟小时数），防止无限战斗

// --- 辅助类型 ---
interface CombatArmy extends Army {
    initialOrganization: number; // 记录战斗开始时的组织度
    currentOrganization: number; // 当前组织度 (战斗中会变化)
    currentManpower: number; // 当前兵力 (战斗中会变化)
    currentEquipmentCount: number; // 当前装备数 (战斗中会变化)
    combatStats?: CalculatedCombatStats; // 缓存计算后的战斗属性
}

interface CalculatedCombatStats {
    attack: number;
    defense: number;
    breakthrough: number;
}

// --- 核心战斗函数 ---

/**
 * 初始化并处理一场战斗。
 * @param ctx Koishi Context
 * @param attackerArmy 进攻方军队数据
 * @param defenderArmies 防守方军队数据数组
 * @param region 战斗发生的地区
 */
export async function initiateCombat(ctx: Context, attackerArmy: Army, defenderArmies: Army[], region: Region): Promise<void> {
    console.log(`[战斗开始] 地区 ${region.RegionId}: ${attackerArmy.name}(${attackerArmy.armyId}) vs ${defenderArmies.map(d => `${d.name}(${d.armyId})`).join(', ')}`);

    const terrain = region.Terrain || TerrainType.PLAIN;

    // --- 初始化战斗单位 ---
    const attacker: CombatArmy = initializeCombatArmy(attackerArmy);
    const defenders: CombatArmy[] = defenderArmies.map(initializeCombatArmy);

    // --- 更新军队状态为战斗中 (防御方也需要更新) ---
    const updatePromises: Promise<any>[] = [
        ctx.database.set('army', { armyId: attacker.armyId }, { status: ArmyStatus.FIGHTING }),
        ...defenders.map(def => ctx.database.set('army', { armyId: def.armyId }, { status: ArmyStatus.FIGHTING }))
    ];
    await Promise.all(updatePromises);

    // --- 战斗模拟循环 (按小时tick) ---
    let combatTicks = 0;
    let battleEnded = false;
    let attackerWon: boolean | null = null; // null表示未结束

    // 在循环外声明并初始化 combinedDefenderStats
    let combinedDefenderStats: { defense: number; totalOrganization: number; totalManpower: number; totalEquipment: number } = {
        defense: 0,
        totalOrganization: 0,
        totalManpower: 0,
        totalEquipment: 0,
    };

    while (!battleEnded && combatTicks < MAX_COMBAT_TICKS) {
        combatTicks++;
        console.log(`[战斗 Tick ${combatTicks}] 地区 ${region.RegionId}`);

        // --- 1. 计算双方当前战斗属性 ---
        attacker.combatStats = calculateArmyCombatStats(attacker, terrain);
        // 防守方合并计算属性 (简单合并，未来可优化为多方混战逻辑)
        // 更新在循环外声明的 combinedDefenderStats
        combinedDefenderStats = calculateCombinedDefenderStats(defenders, terrain);

        // --- 2. 进攻方回合 ---
        if (attacker.currentOrganization > 0 && combinedDefenderStats.totalOrganization > 0) {
            console.log(`  进攻方 ${attacker.armyId} 行动: Org=${attacker.currentOrganization.toFixed(0)}, Atk=${attacker.combatStats.attack.toFixed(0)}, Brk=${attacker.combatStats.breakthrough.toFixed(0)}`);
            console.log(`  防守方 (合并) 行动: Org=${combinedDefenderStats.totalOrganization.toFixed(0)}, Def=${combinedDefenderStats.defense.toFixed(0)}`);
            processCombatRound(attacker, defenders, combinedDefenderStats, terrain, 'attacker');
        }

        // --- 3. 防守方回合 (每个防守单位独立对进攻方造成伤害) ---
        if (attacker.currentOrganization > 0 && combinedDefenderStats.totalOrganization > 0) {
            for (const defender of defenders) {
                if (defender.currentOrganization > 0) {
                    defender.combatStats = calculateArmyCombatStats(defender, terrain); // 计算单个防御者属性
                    console.log(`  防守方 ${defender.armyId} 行动: Org=${defender.currentOrganization.toFixed(0)}, Atk=${defender.combatStats.attack.toFixed(0)}, Brk=${defender.combatStats.breakthrough.toFixed(0)}`);
                    // 防守方攻击进攻方
                    processCombatRound(defender, [attacker], { // 目标只有进攻方
                        defense: attacker.combatStats?.defense ?? 0,
                        totalOrganization: attacker.currentOrganization,
                        totalManpower: attacker.currentManpower,
                        totalEquipment: attacker.currentEquipmentCount,
                    }, terrain, 'defender');
                }
            }
        }

        // --- 4. 检查溃退和战斗结束条件 ---
        const attackerRetreated = checkAndHandleRetreat(attacker);
        const defendersRetreated = defenders.map(checkAndHandleRetreat);
        const allDefendersRetreated = defenders.every(d => d.currentOrganization <= 0 || defendersRetreated[defenders.indexOf(d)]);

        if (attackerRetreated || attacker.currentOrganization <= 0) {
            battleEnded = true;
            attackerWon = false;
            console.log(`[战斗结束] 进攻方 ${attacker.armyId} 溃退或被消灭。`);
        } else if (allDefendersRetreated || combinedDefenderStats.totalOrganization <= 0) {
            battleEnded = true;
            attackerWon = true;
            console.log(`[战斗结束] 所有防守方溃退或被消灭。`);
        }

        // --- 可以在这里添加短暂的暂停，避免CPU占用过高 (如果需要实时感) ---
        // await new Promise(resolve => setTimeout(resolve, 100)); // 暂停100ms
    }

    if (!battleEnded && combatTicks >= MAX_COMBAT_TICKS) {
        console.log(`[战斗超时] 地区 ${region.RegionId} 的战斗达到最大持续时间，强制结束。`);
        // 可以根据当前组织度或其他规则判定胜负，或视为平局
        attackerWon = (attacker.currentOrganization >= combinedDefenderStats.totalOrganization); // 简单判定
        battleEnded = true;
    }

    // --- 5. 战斗结算 (传递 combatTicks) ---
    await finalizeCombat(ctx, attacker, defenders, region, attackerWon, combatTicks);
}

// --- 辅助函数 ---

/** 初始化用于战斗计算的军队对象 */
function initializeCombatArmy(army: Army): CombatArmy {
    const equipmentCount = army.equipment?.['InfantryEquipment'] || 0;
    const initialOrg = equipmentCount * ORGANIZATION_PER_GUN;
    return {
        ...army, // 复制基础属性
        initialOrganization: initialOrg,
        currentOrganization: initialOrg,
        currentManpower: army.manpower || 0,
        currentEquipmentCount: equipmentCount,
    };
}

/** 计算单个军队在特定地形下的战斗属性 */
function calculateArmyCombatStats(army: CombatArmy, terrain: TerrainType): CalculatedCombatStats {
    const equipmentCount = army.currentEquipmentCount;
    const baseStats = INFANTRY_EQUIPMENT_STATS;
    const modifiers = INFANTRY_EQUIPMENT_TERRAIN_MODIFIERS[terrain] || {};

    const calculateStat = (base: number, modifierKey: keyof TerrainStatModifiers): number => {
        const modifier = modifiers[modifierKey] ?? 0;
        return Math.max(0, equipmentCount * base * (1 + modifier)); // 确保不为负
    };

    return {
        attack: calculateStat(baseStats.attack, 'attack'),
        defense: calculateStat(baseStats.defense, 'defense'),
        breakthrough: calculateStat(baseStats.breakthrough, 'breakthrough'),
    };
}

/** 计算合并后的防守方属性 */
function calculateCombinedDefenderStats(defenders: CombatArmy[], terrain: TerrainType): { defense: number; totalOrganization: number; totalManpower: number; totalEquipment: number } {
    let totalDefense = 0;
    let totalOrganization = 0;
    let totalManpower = 0;
    let totalEquipment = 0;

    for (const defender of defenders) {
        if (defender.currentOrganization > 0) {
            defender.combatStats = calculateArmyCombatStats(defender, terrain); // 确保计算过
            totalDefense += defender.combatStats.defense;
            totalOrganization += defender.currentOrganization;
            totalManpower += defender.currentManpower;
            totalEquipment += defender.currentEquipmentCount;
        }
    }
    return { defense: totalDefense, totalOrganization, totalManpower, totalEquipment };
}

/** 处理一个战斗回合（一方攻击另一方） */
function processCombatRound(
    attacker: CombatArmy,
    targets: CombatArmy[], // 可能有多个目标，伤害按组织度比例分配
    targetCombinedStats: { defense: number; totalOrganization: number; totalManpower: number; totalEquipment: number },
    terrain: TerrainType,
    attackerRole: 'attacker' | 'defender' // 区分进攻方/防守方回合，未来可用于不同规则
) {
    if (!attacker.combatStats || attacker.currentOrganization <= 0 || targetCombinedStats.totalOrganization <= 0) {
        return; // 攻击方无力或目标已空
    }

    const attackerStats = attacker.combatStats;
    const targetDefense = targetCombinedStats.defense;
    const breakthroughRatio = targetDefense > 0 ? attackerStats.breakthrough / targetDefense : Infinity; // 突破值与防御力的比率

    let totalOrgDamageDealt = 0;
    let totalCasualtiesInflicted = 0;
    let totalEquipmentDestroyed = 0;

    // --- 突破判定 ---
    if (breakthroughRatio >= DIRECT_BREAKTHROUGH_THRESHOLD) {
        // 直接突破
        totalOrgDamageDealt = targetCombinedStats.totalOrganization * DIRECT_BREAKTHROUGH_ORG_DAMAGE_PERCENT;
        totalCasualtiesInflicted = totalOrgDamageDealt / ORGANIZATION_PER_GUN; // 按组织度损失反推伤亡
        totalEquipmentDestroyed = totalCasualtiesInflicted * 1.5; // 枪械损毁=伤亡×1.5
        console.log(`    -> ${attacker.armyId} 直接突破! 对目标造成 ${totalOrgDamageDealt.toFixed(0)} 组织度伤害`);

    } else if (breakthroughRatio >= PARTIAL_BREAKTHROUGH_THRESHOLD) {
        // 部分突破
        totalOrgDamageDealt = targetCombinedStats.totalOrganization * PARTIAL_BREAKTHROUGH_ORG_DAMAGE_PERCENT;
        // 枪械损毁率提升至70% (如何应用？理解为伤亡导致的枪械损失概率提升？还是额外损失？)
        // 简化：按组织度损失计算基础伤亡，然后计算装备损失
        const baseCasualties = totalOrgDamageDealt / ORGANIZATION_PER_GUN;
        totalCasualtiesInflicted = baseCasualties; // 暂定伤亡不变
        totalEquipmentDestroyed = baseCasualties * 1.7; // 假设损毁率提升体现在系数上
        console.log(`    -> ${attacker.armyId} 部分突破! 对目标造成 ${totalOrgDamageDealt.toFixed(0)} 组织度伤害`);

    } else {
        // 胶着战 (按小时计算)
        const baseDamage = attackerStats.attack * Math.max(0, (1 - targetDefense / 3000)); // 基础伤害，防御力上限3000？
        const hourlyOrgLoss = baseDamage * STALEMATE_HOURLY_ORG_DAMAGE_FACTOR * COMBAT_TICK_INTERVAL_HOURS; // * 地形系数? 规则未明确，暂不加
        totalOrgDamageDealt = hourlyOrgLoss;
        totalCasualtiesInflicted = Math.max(0, hourlyOrgLoss / (ORGANIZATION_PER_GUN * MEDICAL_EFFICIENCY));
        // 每小时枪械损耗 = 目标总人数 * 5%
        totalEquipmentDestroyed = targetCombinedStats.totalManpower * STALEMATE_HOURLY_EQUIPMENT_LOSS_PERCENT * COMBAT_TICK_INTERVAL_HOURS;
        console.log(`    -> ${attacker.armyId} 胶着战! 对目标造成 ${totalOrgDamageDealt.toFixed(0)} 组织度伤害`);
    }

    // --- 将伤害和损失分配给目标单位 (按当前组织度比例) ---
    distributeDamageAndLosses(targets, totalOrgDamageDealt, totalCasualtiesInflicted, totalEquipmentDestroyed);
}

/** 将总伤害和损失按比例分配给多个目标单位 */
function distributeDamageAndLosses(targets: CombatArmy[], totalOrgDamage: number, totalCasualties: number, totalEquipmentLoss: number) {
    const currentTotalOrg = targets.reduce((sum, t) => sum + t.currentOrganization, 0);
    if (currentTotalOrg <= 0) return;

    for (const target of targets) {
        if (target.currentOrganization <= 0) continue;

        const proportion = target.currentOrganization / currentTotalOrg;
        const orgDamage = totalOrgDamage * proportion;
        const casualties = totalCasualties * proportion;
        const equipmentLoss = totalEquipmentLoss * proportion;

        target.currentOrganization = Math.max(0, target.currentOrganization - orgDamage);
        target.currentManpower = Math.max(0, target.currentManpower - casualties);
        target.currentEquipmentCount = Math.max(0, target.currentEquipmentCount - equipmentLoss);

        // 确保装备数不超过人数
        target.currentEquipmentCount = Math.min(target.currentEquipmentCount, target.currentManpower);
        // 确保组织度不超过装备数提供的上限
        target.currentOrganization = Math.min(target.currentOrganization, target.currentEquipmentCount * ORGANIZATION_PER_GUN);

        console.log(`      - 目标 ${target.armyId}: Org -${orgDamage.toFixed(0)} -> ${target.currentOrganization.toFixed(0)}, MP -${casualties.toFixed(0)} -> ${target.currentManpower.toFixed(0)}, Eq -${equipmentLoss.toFixed(1)} -> ${target.currentEquipmentCount.toFixed(1)}`);
    }
}


/** 检查并处理军队溃退 */
function checkAndHandleRetreat(army: CombatArmy): boolean {
    const retreatThreshold = army.initialOrganization * RETREAT_THRESHOLD_PERCENT;
    if (army.currentOrganization > 0 && army.currentOrganization <= retreatThreshold) {
        console.log(`    !! ${army.armyId} 组织度 (${army.currentOrganization.toFixed(0)}) 低于阈值 (${retreatThreshold.toFixed(0)})，触发溃退!`);
        // 溃退惩罚
        const retreatEquipmentLoss = army.currentEquipmentCount * RETREAT_EQUIPMENT_LOSS_PERCENT;
        const retreatCasualties = Math.max(0, (retreatThreshold - army.currentOrganization) / ORGANIZATION_PER_GUN); // 追加伤亡

        army.currentEquipmentCount = Math.max(0, army.currentEquipmentCount - retreatEquipmentLoss);
        army.currentManpower = Math.max(0, army.currentManpower - retreatCasualties);
        army.currentOrganization = 0; // 溃退后组织度清零

        console.log(`      - 溃退惩罚: MP -${retreatCasualties.toFixed(0)} -> ${army.currentManpower.toFixed(0)}, Eq -${retreatEquipmentLoss.toFixed(1)} -> ${army.currentEquipmentCount.toFixed(1)}`);
        return true; // 已溃退
    }
    return false; // 未溃退
}

/** 战斗结束后更新数据库并发送报告 */
// --- 添加 combatDuration 参数 ---
async function finalizeCombat(ctx: Context, attacker: CombatArmy, defenders: CombatArmy[], region: Region, attackerWon: boolean | null, combatDuration: number) {
    console.log(`[战斗结算] 地区 ${region.RegionId}`);

    const finalUpdatePromises: Promise<any>[] = [];
    const finalAttackerStatus = attacker.currentOrganization <= 0 ? ArmyStatus.GARRISONED : (attackerWon === false ? ArmyStatus.GARRISONED : ArmyStatus.GARRISONED); // 胜利/失败/平局都恢复驻扎？或失败方解散？
    const finalDefenderStatus = ArmyStatus.GARRISONED; // 失败方恢复驻扎或解散？

    // 更新进攻方
    finalUpdatePromises.push(ctx.database.set('army', { armyId: attacker.armyId }, {
        status: finalAttackerStatus,
        manpower: Math.floor(attacker.currentManpower),
        organization: Math.floor(attacker.currentOrganization),
        equipment: { ...attacker.equipment, 'InfantryEquipment': Math.floor(attacker.currentEquipmentCount) },
        // 如果进攻方胜利，需要更新其 regionId
        ...(attackerWon === true && { regionId: region.RegionId })
    }));
    console.log(`  结算 ${attacker.armyId}: Status=${finalAttackerStatus}, MP=${Math.floor(attacker.currentManpower)}, Org=${Math.floor(attacker.currentOrganization)}, Eq=${Math.floor(attacker.currentEquipmentCount)}`);


    // 更新防守方
    for (const defender of defenders) {
        const status = defender.currentOrganization <= 0 ? ArmyStatus.GARRISONED : finalDefenderStatus; // 组织度为0也算驻扎？或解散？
        finalUpdatePromises.push(ctx.database.set('army', { armyId: defender.armyId }, {
            status: status,
            manpower: Math.floor(defender.currentManpower),
            organization: Math.floor(defender.currentOrganization),
            equipment: { ...defender.equipment, 'InfantryEquipment': Math.floor(defender.currentEquipmentCount) },
        }));
        console.log(`  结算 ${defender.armyId}: Status=${status}, MP=${Math.floor(defender.currentManpower)}, Org=${Math.floor(defender.currentOrganization)}, Eq=${Math.floor(defender.currentEquipmentCount)}`);
    }

    // 更新地区归属 (如果进攻方胜利且原主人不是进攻方国家)
    let occupationMessage = '';
    if (attackerWon === true) {
        const attackerCountry = (await ctx.database.get('userdata', { userId: attacker.commanderId }))?.[0]?.countryName;
        if (attackerCountry && region.owner !== attackerCountry) {
            const oldOwner = region.owner || '无主地';
            finalUpdatePromises.push(ctx.database.set('regiondata', { RegionId: region.RegionId }, { owner: attackerCountry }));
            occupationMessage = ` 进攻方 ${attacker.name}(${attacker.armyId}) 获胜并占领了地区 ${region.RegionId} (原属: ${oldOwner})！`;
            console.log(`[地区易主] 地区 ${region.RegionId} 的控制权从 ${oldOwner} 变为 ${attackerCountry}`);
        } else {
             occupationMessage = ` 进攻方 ${attacker.name}(${attacker.armyId}) 获胜！`;
        }
    } else if (attackerWon === false) {
        occupationMessage = ` 防守方成功击退了 ${attacker.name}(${attacker.armyId}) 的进攻！`;
    } else {
        occupationMessage = ` 地区 ${region.RegionId} 的战斗陷入僵持，暂时结束。`;
    }


    await Promise.all(finalUpdatePromises);
    console.log(`[战斗结算] 数据库更新完成。`);

    // 发送战报
    const reportChannel = `onebot:${region.guildId}`;
    if (region.guildId) {
        const defenderNames = defenders.map(d => `${d.name}(${d.armyId})`).join(', ');
        // --- 使用传入的 combatDuration 参数 ---
        const report = `**战报 - 地区 ${region.RegionId}**\n进攻方: ${attacker.name}(${attacker.armyId})\n防守方: ${defenderNames}\n结果: ${occupationMessage}\n战斗持续 ${combatDuration} 小时(模拟)。`;
        // 可以添加更详细的伤亡报告
        ctx.broadcast([reportChannel], report).catch(e => console.warn("广播战报失败", e));
    }
}