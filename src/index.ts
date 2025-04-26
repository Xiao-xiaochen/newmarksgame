//src\index.ts

import { Schema, Context } from "koishi";

import { Database } from "./models";
import { setupDailyReset } from "./core/CheckIn";
import { WorldMapReset } from './core/Map/Command/WorldMapReset';

import { GeneralBuild } from "./commandR/Build/GeneralBuild"

//RegionInfo

import { ResourceInfo } from "./commandR/RegionInfo/ResourceInfo";

import { Regioninfo } from "./commandR/RegionInfo/Regioninfo";
import { CheckIn } from "./commandP/CheckIn/TotalCheckIn";
import { Playerinfo } from "./commandP/Playerinfo";
import { Buildcountry } from "./commandC/Buildcountry";
import { BindRegion } from './commandR/BindRegion';

import { Laborinfo } from "./commandR/RegionInfo/Laborinfo";
import { RegionPopulation } from "./commandR/RegionInfo/RegionPopulation";
import { DepartmentStatus } from "./commandP/SPY/DepartmentStatus";

import { PFarmCheckIn } from "./commandP/CheckIn/FarmCheckIn";
import { RFarmCheckIn } from "./commandR/CheckIn/FarmCheckIn";

import { ProduceTank } from "./commandR/produce/Tank";
import { ProduceInfantryEquipment } from "./commandR/produce/InfantryEquipment";
import { ProduceArtillery } from "./commandR/produce/Artillery";
import { ProduceArmoredCar } from "./commandR/produce/ArmoredCar";
import { ProduceAntiTankGun } from "./commandR/produce/AntiTankGun"
import { ProduceLightFighter } from './commandR/produce/LightFighter'
import { ProduceHeavyFighter } from './commandR/produce/HeavyFighter'
import { ProduceTacticalBomber } from './commandR/produce/TacticalBomber'
import { ProduceStrategicBomber } from './commandR/produce/StrategicBomber'
import { ProduceTransportAircraft } from './commandR/produce/TransportAircraft'
import { ProduceAWACS } from './commandR/produce/AWACS'

import { PPopulation } from "./commandP/Population";
import { TerrainInfo } from './commandR/RegionInfo/TerrainInfo';
import { InitializeRegions } from './core/Map/Command/InitializeRegions';
import { WorldMapInfo } from './core/Map/Command/WorldMap';
import { WorldMapImport } from './core/Map/Command/WorldMapImport';


export const inject = {
  required: ['database', 'puppeteer']
}

export function apply(ctx: Context) {
    
    WorldMapReset(ctx)
    WorldMapImport(ctx)
    // 注册初始化地区命令
    InitializeRegions(ctx);
    WorldMapInfo(ctx)
    
    BindRegion(ctx)
    Regioninfo(ctx)
    CheckIn(ctx)
    Playerinfo(ctx)
    Buildcountry(ctx)
    Laborinfo(ctx)
    RegionPopulation(ctx)

    //regioninfo
    ResourceInfo(ctx)

    PPopulation(ctx)


    //SPY
    DepartmentStatus(ctx)

    //produce
    ProduceTank(ctx)
    ProduceInfantryEquipment(ctx)
    ProduceArtillery(ctx)
    ProduceArmoredCar(ctx)
    ProduceAntiTankGun(ctx)
    ProduceLightFighter(ctx)
    ProduceHeavyFighter(ctx)
    ProduceTacticalBomber(ctx)
    ProduceStrategicBomber(ctx)
    ProduceTransportAircraft(ctx)
    ProduceAWACS(ctx)

    //build
    GeneralBuild(ctx)

    //CheckIn(ctx)
    CheckIn(ctx)
    PFarmCheckIn(ctx)
    RFarmCheckIn(ctx)

    //核心服务
    Database(ctx)
    setupDailyReset(ctx)
  
    // 注册地区特质查询命令
    TerrainInfo(ctx);

}



