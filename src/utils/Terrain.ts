// utils/terrain.ts

import { TerrainFeatures, ResourceReserves } from '../types';
import { Random } from './Random';
import { Context } from 'koishi';


export const Terrain = {
  generateTerrainFeatures(ctx: Context): TerrainFeatures {
    const mountainousBaseMin = ctx.config.mountainousBaseMin ?? 0;
    const mountainousBaseMode = ctx.config.mountainousBaseMode ?? 15;
    const mountainousBaseMax = ctx.config.mountainousBaseMax ?? 30;
    const hillyBaseMin = ctx.config.hillyBaseMin ?? 0;
    const hillyBaseMode = ctx.config.hillyBaseMode ?? 10;
    const hillyBaseMax = ctx.config.hillyBaseMax ?? 20;
    const riversBaseMin = ctx.config.riversBaseMin ?? 0;
    const riversBaseMode = ctx.config.riversBaseMode ?? 5;
    const riversBaseMax = ctx.config.riversBaseMax ?? 10;

    // 地形占比基准表
    const mountainousBase = { min: mountainousBaseMin, mode: mountainousBaseMode, max: mountainousBaseMax };
    const hillyBase = { min: hillyBaseMin, mode: hillyBaseMode, max: hillyBaseMax };
    const riversBase = { min: riversBaseMin, mode: riversBaseMode, max: riversBaseMax }; // 河流占比基准

    let mountainous = Math.floor(Random.triangular(mountainousBase.min, mountainousBase.mode, mountainousBase.max));
    let hilly = Math.floor(Random.triangular(hillyBase.min, hillyBase.mode, hillyBase.max));
    let rivers = Math.random() < 0.2 ? Math.floor(Random.triangular(riversBase.min, riversBase.mode, riversBase.max)) : 0; // 20% 概率有河流

    // 保证山地、丘陵和河流占比之和不超过 100
    let remaining = 100 - mountainous - hilly - rivers;

    // 如果剩余占比小于 0，则进行调整
    if (remaining < 0) {
      const excess = -remaining;
      // 优先减少丘陵占比
      if (hilly > excess) {
        hilly -= excess;
      } else {
        mountainous -= (excess - hilly);
        hilly = 0;
      }
      remaining = 100 - mountainous - hilly - rivers;
    }

    const plains = remaining;

    const forestCoverage = Math.floor(Math.random() * 60); // 森林覆盖率 0-60%

    return {
      mountain: Math.max(0, mountainous), // 确保不为负数
      hill: Math.max(0, hilly),
      plain: Math.max(0, plains),
      river: Math.max(0, rivers),
      forest: forestCoverage
    };
  }
}
