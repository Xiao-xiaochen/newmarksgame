import { PowerPlantConfig } from "../types";

export const POWER_PLANTS: Record<string, PowerPlantConfig> = {
  '火力发电厂': {
    name: '火力发电厂',
    steelCost: 300,
    laborCost: 2000,
    powerOutput: 500,
    coalCost:375,
  },
  '水电站': {
    name: '水电站',
    steelCost: 1000,
    laborCost: 3000,
    powerOutput: 1000,
    terrainCheck:'river > 0',
  },
  '核电站': {
    name: '核电站',
    steelCost: 1500,
    laborCost: 5000,
    powerOutput: 2000,
  },
  '燃料油发电厂': {
    name: '燃料油发电厂',
    steelCost: 500,
    laborCost: 4000,
    powerOutput: 800,
    UraniumCost:100

  },
}