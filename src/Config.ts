import { Context ,Schema } from "koishi";
//配置项声明
export interface Config{
//军队设置
    MaxArmiesPerRegion:number;//每个地区最大军队
    InitialArmyManPower:number;//地区初始兵力
    InitialArmyFood:number;//地区初始食物
    BaseMarchTimeMinutes:number;//基础行军时间(分钟)
//国家设置
    BuildCountryCooldown:number;//建国冷却时间(小时)
    RenameCooldown:number;//改名冷却时间(小时)
    DismissCountryTimeout:number;//解散国家超时时间(秒)
    InvateCountryTimeout:number;//邀请国家超时时间(秒)
//玩家设置
    StationTimeout:number;//驻扎确认超时时间(秒)
    StationCooldown:number;//驻扎冷却(小时)
//地区设置

//世界地图设置
    mapSeed:string;
};

export const Config:Schema<Config>=Schema.intersect([
  Schema.object({
    MaxArmiesPerRegion:Schema.number().description('每个地区最大军队').default(9),
    InitialArmyManPower:Schema.number().description('地区初始兵力').default(0),
    InitialArmyFood:Schema.number().description('地区初始食物').default(0),
    BaseMarchTimeMinutes:Schema.number().description('基础行军时间\(分钟\)').default(30),

  }).description('军队设置'),
  Schema.object({
    BuildCountryCooldown:Schema.number().description('建国冷却时间\(小时\)').default(24),
    RenameCooldown:Schema.number().description('改名冷却时间\(小时\)').default(72),
    DismissCountryTimeout:Schema.number().description('解散国家超时时间\(秒\)').default(60),
    InvateCountryTimeout:Schema.number().description('邀请国家超时时间\(秒\)').default(120),
  }).description('国家设置'),
  Schema.object({
    StationTimeout:Schema.number().description('驻扎确认超时时间\(秒\)').default(30),
    StationCooldown:Schema.number().description('驻扎冷却\(小时\)').default(36),
  }).description('玩家设置'),
  //Schema.object({
  // }).description('地区设置'),
  Schema.object({
    mapSeed:Schema.string().description('世界地图种子').default('EarthLike2023')
    }).description('世界地图设置'),
  Schema.object({
    MAX_COMBAT_WIDTH: Schema.number().description('默认战场宽度').default(80),
    REINFORCE_CHANCE: Schema.number().description('增援几率').default(0.5),
    BASE_ORGANIZATION_DAMAGE: Schema.number().description('基础组织度伤害').default(5),
    BASE_MANPOWER_LOSS_FACTOR: Schema.number().description('基础人力损失系数').default(0.01),
    ROUT_THRESHOLD: Schema.number().description('溃退组织度阈值 (20%)').default(0.2),
    FOOD_CONSUMPTION_PER_10K_CAPITA: Schema.number().description('每万人每天消耗粮食').default(1),
    GOODS_CONSUMPTION_PER_10K_CAPITA: Schema.number().description('每万人每天消耗消费品').default(0.5),
    // BASE_MINE_OUTPUT_RATES_PER_MINE: Schema.any().description('基础矿物产出率').default({ coal: 2000, ironOre: 2000, rareMetal: 2000, rareEarth: 2000, aluminum: 2000, rubber: 15 }), // 暂时用any，后续考虑更具体的Schema
    FARM_OUTPUT_PER_FARM: Schema.number().description('每农场基础产出').default(3),
    LIGHT_INDUSTRY_OUTPUT_PER_INDUSTRY: Schema.number().description('每轻工业基础产出').default(1),
  }).description('核心数值设置')

])


