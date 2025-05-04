import { TerrainType, TerrainStatModifiers } from '../types';

// 定义装备的基础属性接口
export interface EquipmentBaseStats {
    attack: number;
    defense: number;
    breakthrough: number;
    organization: number; // 每件装备提供的组织度
}


// 步兵装备的具体数值
export const INFANTRY_EQUIPMENT_STATS: EquipmentBaseStats = {
    attack: 10,
    defense: 12,
    breakthrough: 8,
    organization: 30, // 每件提供30组织度
};

// 步兵装备在不同地形下的修正
export const INFANTRY_EQUIPMENT_TERRAIN_MODIFIERS: Record<TerrainType, TerrainStatModifiers> = {
    [TerrainType.MOUNTAIN]: {
        attack: -0.30, // -30%
        defense: 0.20,  // +20%
        breakthrough: 0.10, // +10%
        marchSpeed: -0.50 // -50% 行军速度
    },
    [TerrainType.HILLS]: {
        attack: -0.15, // -15%
        defense: -0.10, // -10%
        breakthrough: 0.00, // +0%
        marchSpeed: -0.25 // -25% 行军速度
    },
    [TerrainType.FOREST]: {
        attack: -0.05, // -5%
        defense: 0.05,  // +5%
        breakthrough: 0.00, // +0%
        marchSpeed: -0.10 // -10% 行军速度
    },
    [TerrainType.PLAIN]: {
        attack: 0.10,  // +10%
        defense: -0.05, // -5%
        breakthrough: 0.00, // +0%
        marchSpeed: 0.00 // 0% 行军速度 (基准)
    },
    [TerrainType.OCEAN]: { // 水域通常不进行陆战，设为极大负面影响或不允许
        attack: -1.00,
        defense: -1.00,
        breakthrough: -1.00,
        marchSpeed: -1.00 // -100% 行军速度 (无法通行)
    },
};

// --- 未来可以添加其他装备类型 ---
// export const TANK_STATS: EquipmentBaseStats = { ... };
// export const TANK_TERRAIN_MODIFIERS: Record<TerrainType, TerrainStatModifiers> = { ... };