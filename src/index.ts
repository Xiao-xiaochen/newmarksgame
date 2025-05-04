// src\index.ts

import { Context } from "koishi";

// --- 核心服务与配置 ---
import { Database } from "./models";
import { setupDailyReset } from "./core/DayCheckIn"; // 注意：原为 CheckIn.ts，这里假设是 DayCheckIn.ts
import { UserReset } from './core/UserReset';
import { CountryReset } from './core/CountryReset'; // <--- 导入新命令
import { ManualCheckIn } from './commandP/ManualCheckIn'; // <--- 导入手动重置指令
import { HelpCommand } from './utils/help'; // <--- 导入帮助指令
import { handleArmyArrival } from './core/ArmyActions'; // <--- 导入军队到达处理函数

// --- 地图相关 ---
import { InitializeRegions } from './core/Map/Command/InitializeRegions';
import { WorldMapImport } from './core/Map/Command/WorldMapImport';
import { WorldMapInfo } from './core/Map/Command/WorldMap';
import { WorldMapReset } from './core/Map/Command/WorldMapReset';
import { BindRegion } from './commandR/BindRegion';
import { TerrainInfo } from './commandR/RegionInfo/TerrainInfo';

// --- 玩家相关 ---
import { Playerinfo } from "./commandP/Info/Playerinfo";
import { CheckIn } from "./commandP/CheckIn/TotalCheckIn"; // 总签到
import { PPopulation } from "./commandP/Population"; // 玩家人口相关？（命名可能需调整）
import { DepartmentStatus } from "./commandP/SPY/DepartmentStatus"; // 间谍部门状态
import { MyMilitaryWarehouse } from './commandP/Info/Militarywarehouse'; // 玩家军事仓库
import { MyWarehouse } from './commandP/Info/Mywarehouse'; // 玩家仓库
import { Stationed } from './commandP/Stationed'; // 玩家驻扎


// --- 地区相关 ---
import { Regioninfo } from "./commandR/RegionInfo/Regioninfo";
import { ResourceInfo } from "./commandR/RegionInfo/ResourceInfo";
import { Laborinfo } from "./commandR/RegionInfo/Laborinfo";
import { RegionPopulation } from "./commandR/RegionInfo/RegionPopulation"; // 地区人口
import { RFarmCheckIn } from "./commandR/CheckIn/FarmCheckIn"; // 地区农业签到
import { GeneralBuild } from "./commandR/GeneralBuild"; // 通用建造
import { RegionProduce } from './commandR/Produce'; // 地区生产
import { RegionWarehouse } from './commandR/RegionInfo/Regionwarehouse'; // 地区仓库
import { RegionMilitaryWarehouse } from './commandR/RegionInfo/RegionMilitaryWarehouse'; // 地区军事仓库
import { DisbindRegion } from './commandR/DisbindRegion'; // <--- 导入解除绑定指令
import { MineCommand } from './commandR/Mine'; // <--- 导入采矿指令
import { LaborCommand } from './commandR/Labor'; // <--- 导入劳动力指令
import { RefineOilCommand } from './commandR/RefineOil'; // <--- 导入精炼油指令
import { SteelmakingCommand } from './commandR/Steelmaking'; // <--- 导入钢铁制造指令
import { HourCheckIn } from './core/HourCheckIn'; // <--- 导入地区小时签到指令
import { SIInfo } from './commandR/RegionInfo/SIInfo'; // <--- 导入SI信息指令
import { RMineCheckIn } from './commandR/CheckIn/MineCheckIn'; // <--- 导入地区资源签到指令
import { TraditionalSteelmakingCommand } from './commandR/TraditionalSteelmaking'; // <--- 导入传统钢铁制造指令
import { BuildPowerInfo } from './commandR/RegionInfo/BuildPowerInfo'; // <--- 导入地区建造力指令
import { DislaborCommand } from './commandR/Dislabor'; // <--- 导入取消分配劳动力指令
import { FormArmy } from './commandA/FormArmy'; // <--- 导入组建军队指令
import { AllocateManpowerToArmy } from './commandA/AllocateManpowerToArmy'; // <--- 分配劳动力到军队指令
import { ArmArmy } from './commandA/ArmArmy'; // <--- 组建军队指令
import { DistributeGuns } from './commandA/DistributeGuns'; // <--- 分配武器指令
import { MarchArmy } from './commandA/MarchArmy'; // <--- 行军指令
import { ViewArmy } from './commandA/ViewArmy'; // <--- 查看军队指令




// --- 国家/势力相关 ---
import { Buildcountry } from "./commandC/Buildcountry";
import { Mycountry } from "./commandP/Mycountry";
import { Invite } from './commandC/Invite';
import { MemberList } from './commandC/MemberList';
import { RegionList } from './commandC/RegionList';
import { Hiscountry } from './commandP/Hiscountry'; // <--- 导入他的国家指令
import { ExitCountry } from './commandC/ExitCountry'; // <--- 退出国家指令、
import { Dismisscountry } from './commandC/Dismisscountry'; // <--- 解散国家指令
import { ChangenName} from './commandC/ChangenName'; // <--- 国家改名指令
import { ForceChangenName } from "./commandC/ForceChangenName";
 import { ManufactureCommand } from './commandR/Manufacture';

export const inject = {
  required: ['database', 'puppeteer', 'cron']
}

export function apply(ctx: Context) {

    // --- 核心服务 ---
    Database(ctx);
    setupDailyReset(ctx); // 每日重置
    UserReset(ctx);       // 用户数据重置
    CountryReset(ctx);    // 国家数据重置 <--- 添加注册
    ManualCheckIn(ctx);    // 手动重置
    HelpCommand(ctx);    // 帮助指令

    // --- 地图相关 ---
    ctx.plugin(InitializeRegions); // 初始化地区
    WorldMapImport(ctx);    // 导入地图
    WorldMapInfo(ctx);      // 查看世界地图
    WorldMapReset(ctx);     // 重置地图
    BindRegion(ctx);        // 绑定地区
    TerrainInfo(ctx);       // 查看地形
    DisbindRegion(ctx);      // 解除绑定

    // --- 玩家相关 ---
    Playerinfo(ctx);        // 玩家信息
    CheckIn(ctx);           // 玩家总签到
    PPopulation(ctx);       // 玩家人口?
    DepartmentStatus(ctx);  // 间谍部门状态
    MyMilitaryWarehouse(ctx); // 玩家军事仓库
    MyWarehouse(ctx);       // 玩家仓库
    Stationed(ctx);         // 玩家驻扎

    // --- 地区相关 ---
    Regioninfo(ctx);        // 地区信息
    ResourceInfo(ctx);      // 地区资源信息
    Laborinfo(ctx);         // 地区劳动力信息
    RegionPopulation(ctx);  // 地区人口信息
    RFarmCheckIn(ctx);      // 地区农业签到
    GeneralBuild(ctx);      // 地区通用建造
    RegionProduce(ctx);     // 地区生产
    RegionWarehouse(ctx);    // 地区仓库
    RegionMilitaryWarehouse(ctx); // 地区军事仓库
    MineCommand(ctx);        // 地区采矿
    LaborCommand(ctx);       // 地区劳动力
    RefineOilCommand(ctx);    // 精炼油
    SteelmakingCommand(ctx);    // 钢铁制造
    HourCheckIn(ctx);        // 地区小时签到
    SIInfo(ctx);             // 查看SI信息
    RMineCheckIn(ctx);        // 地区资源签到
    TraditionalSteelmakingCommand(ctx); // 传统钢铁制造指令
    BuildPowerInfo(ctx);        // 查看地区建造力
    DislaborCommand(ctx);      // 取消分配劳动力
    FormArmy(ctx);
    AllocateManpowerToArmy(ctx); // 分配劳动力到军队
    ArmArmy(ctx);
    DistributeGuns(ctx);
    MarchArmy(ctx);
    ViewArmy(ctx); // 查看军队

    // --- 国家/势力相关 ---
    Buildcountry(ctx);      // 建立国家
    Mycountry(ctx);         // 我的国家
    Invite(ctx);             // 邀请玩家加入国家
    MemberList(ctx);         // 成员列表
    RegionList(ctx);         // 地区列表
    Hiscountry(ctx);         // 他的国家 <--- 注册他的国家指令
    ExitCountry(ctx);         // 退出国家
    Dismisscountry(ctx);     // 解散国家
    ChangenName(ctx);         // 国家改名
    ForceChangenName(ctx);   // 强制国家改名
    // --- 移除或待整理的旧指令 (注释掉) ---
    // ProduceTank(ctx)
    // ProduceInfantryEquipment(ctx)
    ManufactureCommand(ctx);
}

//



