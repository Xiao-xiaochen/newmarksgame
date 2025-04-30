// src\index.ts

import { Context } from "koishi";

// --- 核心服务与配置 ---
import { Database } from "./models";
import { setupDailyReset } from "./core/DayCheckIn"; // 注意：原为 CheckIn.ts，这里假设是 DayCheckIn.ts
import { UserReset } from './core/UserReset';
import { CountryReset } from './core/CountryReset'; // <--- 导入新命令

// --- 地图相关 ---
import { InitializeRegions } from './core/Map/Command/InitializeRegions';
import { WorldMapImport } from './core/Map/Command/WorldMapImport';
import { WorldMapInfo } from './core/Map/Command/WorldMap';
import { WorldMapReset } from './core/Map/Command/WorldMapReset';
import { BindRegion } from './commandR/BindRegion';
import { TerrainInfo } from './commandR/RegionInfo/TerrainInfo';

// --- 玩家相关 ---
import { Playerinfo } from "./commandP/Playerinfo";
import { CheckIn } from "./commandP/CheckIn/TotalCheckIn"; // 总签到
import { PFarmCheckIn } from "./commandP/CheckIn/FarmCheckIn"; // 玩家农业签到
import { PPopulation } from "./commandP/Population"; // 玩家人口相关？（命名可能需调整）
import { DepartmentStatus } from "./commandP/SPY/DepartmentStatus"; // 间谍部门状态


// --- 地区相关 ---
import { Regioninfo } from "./commandR/RegionInfo/Regioninfo";
import { ResourceInfo } from "./commandR/RegionInfo/ResourceInfo";
import { Laborinfo } from "./commandR/RegionInfo/Laborinfo";
import { RegionPopulation } from "./commandR/RegionInfo/RegionPopulation"; // 地区人口
import { RFarmCheckIn } from "./commandR/CheckIn/FarmCheckIn"; // 地区农业签到
import { GeneralBuild } from "./commandR/GeneralBuild"; // 通用建造
import { RegionProduce } from './commandR/Produce'; // 地区生产

// --- 国家/势力相关 ---
import { Buildcountry } from "./commandC/Buildcountry";
import { Mycountry } from "./commandP/Mycountry";
import { Invite } from './commandC/Invite';
import { MemberList } from './commandC/MemberList';
import { RegionList } from './commandC/RegionList';
import { Hiscountry } from './commandP/Hiscountry'; // <--- 导入他的国家指令

export const inject = {
  required: ['database', 'puppeteer']
}

export function apply(ctx: Context) {

    // --- 核心服务 ---
    Database(ctx);
    setupDailyReset(ctx); // 每日重置
    UserReset(ctx);       // 用户数据重置
    CountryReset(ctx);    // 国家数据重置 <--- 添加注册

    // --- 地图相关 ---
    InitializeRegions(ctx); // 初始化地区
    WorldMapImport(ctx);    // 导入地图
    WorldMapInfo(ctx);      // 查看世界地图
    WorldMapReset(ctx);     // 重置地图
    BindRegion(ctx);        // 绑定地区
    TerrainInfo(ctx);       // 查看地形

    // --- 玩家相关 ---
    Playerinfo(ctx);        // 玩家信息
    CheckIn(ctx);           // 玩家总签到
    PFarmCheckIn(ctx);      // 玩家农业签到
    PPopulation(ctx);       // 玩家人口?
    DepartmentStatus(ctx);  // 间谍部门状态

    // --- 地区相关 ---
    Regioninfo(ctx);        // 地区信息
    ResourceInfo(ctx);      // 地区资源信息
    Laborinfo(ctx);         // 地区劳动力信息
    RegionPopulation(ctx);  // 地区人口信息
    RFarmCheckIn(ctx);      // 地区农业签到
    GeneralBuild(ctx);      // 地区通用建造
    RegionProduce(ctx);     // 地区生产

    // --- 国家/势力相关 ---
    Buildcountry(ctx);      // 建立国家
    Mycountry(ctx);         // 我的国家
    Invite(ctx);             // 邀请玩家加入国家
    MemberList(ctx);         // 成员列表
    RegionList(ctx);         // 地区列表
    Hiscountry(ctx);         // 他的国家 <--- 注册他的国家指令

    // --- 移除或待整理的旧指令 (注释掉) ---
    // ProduceTank(ctx)
    // ProduceInfantryEquipment(ctx)
}



