import { Region } from '../types'; // 确认 types.ts 的相对路径

// 定义建筑属性结构
export interface BuildingDefinition {
  name: string; // 显示名称
  key: keyof Region; // 对应 Region 数据中的字段名 (用于计数)
  description: string;
  buildCost: { // 建造消耗
    steel?: number;
    concrete?: number; // 混凝土
    machinery?: number; // 机械
    constructionPoints: number; // 所需总建造点数
    Asphalt?: number; // 新增：消耗 15 沥青
  };
  operation?: { // 运行消耗/产出 (每小时)
    fixLabor?: number; // 需要的固定劳动力 (Fixlabor)
    // 资源消耗 (负数)
    coal?: number;
    ironOre?: number;
    crudeOil?: number; // 原油 (对应 Region.warehouse.oil)
    stone?: number; // 混凝土厂消耗石料
    steel?: number; // 机械厂消耗钢铁
    // ... 其他资源消耗 ...
    produces?: { // 主要产出 (正数)
      goods?: number;
      steel?: number;
      food?: number;
      fuel?: number;   // 燃料 (对应 Region.warehouse.fuel)
      Mazout?: number; // 重油 (对应 Region.warehouse.Mazout)
      constructionCapacity?: number; // 建筑部门产出
      stone?: number; // 矿场产出石料
      concrete?: number; // 混凝土厂产出
      machinery?: number; // 新增：机械厂产出
      // ... 其他产出 ...
    };
  };
  infrastructureCost: number; // 每个建筑消耗的基础设施点数 (消耗 base)
}

// 建筑配置对象
export const BUILDINGS: Record<string, BuildingDefinition> = {
  // --- 建筑部门 ---
  constructionDepartment: {
    name: '建筑部门',
    key: 'Department', // 对应 Region.Department
    description: '提供建造力，加速地区建设。',
    buildCost: {
      steel: 50,
      concrete: 100,
      machinery: 10,
      constructionPoints: 1000, // 示例值
    },
    operation: {
      fixLabor: 10000, // 示例：每个部门需要 5000 固定劳动力
      produces: {
        constructionCapacity: 100, // 示例：每小时提供 100 建造力
      },
    },
    infrastructureCost: 1, // 示例：消耗 1 点基础设施
  },
  // --- 轻工厂 ---
  lightIndustry: {
    name: '轻工厂',
    key: 'lightIndustry', // 对应 Region.lightIndustry (需要添加到 types.ts 和 models.ts)
    description: '生产生活消费品。',
    buildCost: {
      steel: 30,
      concrete: 80,
      machinery: 20,
      constructionPoints: 600,
    },
    operation: {
      fixLabor: 10000,
      // 可能消耗其他资源，如电力（未来）或煤炭
      produces: {
        goods: 50, // 示例：每小时产出 50 消费品 (对应 Region.warehouse.goods)
      },
    },
    infrastructureCost: 1,
  },
  // --- 炼钢厂 ---
  steelMill: {
    name: '炼钢厂',
    key: 'steelmill', // 对应 Region.steelmill
    description: '将铁矿石和煤炭转化为钢铁。',
    buildCost: {
      steel: 100,
      concrete: 150,
      machinery: 30,
      constructionPoints: 2000,
    },
    operation: {
      fixLabor: 20000,
      coal: -10, // 消耗 10 煤炭 (对应 Region.warehouse.coal)
      ironOre: -15, // 消耗 15 铁矿石 (对应 Region.warehouse.ironOre)
      // TODO: 实现可选燃料逻辑 (例如 Mazout 减少 coal 消耗并提高产量)
      produces: {
        steel: 10, // 产出 10 钢铁 (对应 Region.warehouse.steel)
      },
    },
    infrastructureCost: 2, // 炼钢厂消耗更多基建
  },
  // --- 农场 ---
  farms: {
      name: '农场',
      key: 'farms', // 对应 Region.farms
      description: '生产粮食。',
      buildCost: {
          steel: 10,
          concrete: 50,
          constructionPoints: 200,
      },
      operation: {
          fixLabor: 10000, // 农业需要大量劳动力
          produces: {
              food: 100, // 示例产量 (对应 Region.warehouse.food)
          },
      },
      infrastructureCost: 1,
  },
  // --- 炼油厂 ---
  refinery: {
      name: '炼油厂',
      key: 'refinery', // 对应 Region.refinery (需要添加到 types.ts 和 models.ts)
      description: '将原油提炼成燃料和重油。',
      buildCost: {
          steel: 80,
          concrete: 120,
          machinery: 25,
          constructionPoints: 2000,
      },
      operation: {
          fixLabor: 10000,
          crudeOil: -20, // 消耗 20 原油 (对应 Region.warehouse.oil)
          produces: {
              fuel: 15, // 产出 15 燃料 (对应 Region.warehouse.fuel)
              Mazout: 5, // 产出 5 重油 (对应 Region.warehouse.Mazout)
          },
      },
      infrastructureCost: 2,
  },
  // --- 矿场 (统一类型) ---
  Mine: {
      name: '矿场',
      key: 'Mine', // 对应 Region.Mine
      description: '开采基础矿产资源（煤炭、铁矿石等），并产出石料作为副产品。具体主产出受地区资源影响。',
      buildCost: {
          constructionPoints: 400,
      },
      operation: {
          fixLabor: 20000,
          // 主产出 (coal, ironOre) 应在小时更新逻辑中根据地区资源 (Region.resources) 决定
          produces: {
              stone: 5, // 新增：每小时固定产出 5 石料 (示例值)
          }
      },
      infrastructureCost: 1,
  },
  // --- 油井 ---
  oilwell: {
      name: '油井',
      key: 'oilwell', // 对应 Region.oilwell
      description: '开采原油。具体产出可能受地区资源影响。',
      buildCost: {
          steel: 70,
          concrete: 90,
          machinery: 20,
          constructionPoints: 600,
      },
      operation: {
          fixLabor: 8500,   
          // 产出应在小时更新逻辑中根据地区资源 (Region.resources.oil) 决定
          // produces: { crudeOil: Z } // 动态计算
      },
      infrastructureCost: 1,
  },
   // --- 基础设施 ---
   base: {
       name: '基础设施',
       key: 'base', // 对应 Region.base
       description: '提高地区承载能力和效率。通过消耗资源直接建造。',
       buildCost: {
           steel: 20,
           concrete: 40,
           Asphalt: 15, // 新增：消耗 15 沥青
           machinery: 2, // 修改：大幅减少机械消耗至 2
           constructionPoints: 200, // 建造基建也需要建造点数
       },
       // 基础设施本身没有 operation 或 infrastructureCost，它是被消耗的
       infrastructureCost: 0, // 不消耗自身
   },
   // --- 发电厂 (占位) ---
   powerPlant: {
       name: '发电厂',
       key: 'powerPlant', // 对应 Region.powerPlant (需要添加到 types.ts 和 models.ts)
       description: '未来用于提供电力。',
       buildCost: {
           steel: 60,
           concrete: 100,
           machinery: 15,
           constructionPoints: 1500,
       },
       operation: {
           fixLabor: 2000,
           // coal: -10, // 暂时不实现消耗
           // produces: { power: 50 } // 暂时不实现产出
       },
       infrastructureCost: 2,
   },
   // --- 军工厂 (仅定义建造消耗和基建消耗) ---
   mfactory: {
       name: '军工厂',
       key: 'mfactory', // 对应 Region.mfactory
       description: '用于生产军事单位。生产消耗在生产命令中处理。',
       buildCost: {
           steel: 120,
           concrete: 100,
           machinery: 40,
           constructionPoints: 2000,
       },
       // 军工厂的运行消耗 (labor, resources) 在执行生产命令时计算，不通过小时更新
       // operation: { fixLabor: ... } // 可能需要少量维护劳动力?
       infrastructureCost: 2,
   },
   // --- 新增：机械厂 ---
   machineryPlant: {
       name: '机械厂',
       key: 'machineryPlant', // 对应 Region.machineryPlant
       description: '消耗钢铁等资源生产机械。',
       buildCost: {
           steel: 150,
           concrete: 100, // 假设已有
           machinery: 50,  // 建造自身也需要机械 (需要初始资源)
           constructionPoints: 2000,
       },
       operation: {
           fixLabor: 20000,
           steel: -20, // 消耗 20 钢铁
           // aluminum: -5, // 可选：如果需要铝
           // fuel: -5, // 可选：消耗燃料
           produces: {
               machinery: 5, // 产出 5 机械
           },
       },
       infrastructureCost: 2, // 机械厂是重要工业，消耗较多基建
   },
};

// 辅助函数，根据 key 获取建筑定义
export function getBuildingDefinition(typeKey: string): BuildingDefinition | undefined {
  // 因为 key 是 Region 的键名，可能与 BUILDINGS 的键名不完全一致 (例如 'Department' vs 'constructionDepartment')
  // 需要找到 key 属性匹配 typeKey 的那个定义
  return Object.values(BUILDINGS).find(def => def.key === typeKey);
}

// 辅助函数，根据用户输入的名称获取建筑定义 (用于建造命令)
export function getBuildingDefinitionByName(name: string): BuildingDefinition | undefined {
    return Object.values(BUILDINGS).find(def => def.name === name);
}