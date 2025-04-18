//src\index.ts

import { Schema, Context } from "koishi";
import { Regioninfo } from "./commandR/Regioninfo";
import { CheckIn } from "./commandP/CheckIn/TotalCheckIn";
import { Playerinfo } from "./commandP/Playerinfo";
import { Buildcountry } from "./commandP/Buildcountry";
import { Terraininfo } from "./commandR/Terraininfo";
import { Laborinfo } from "./commandR/Laborinfo";
import { RegionPopulation } from "./commandR/RegionPopulation";
import { RegionFactory } from "./commandR/FactoryInfo/RegionFactory";
import { RegionResourceinfo } from "./commandR/RegionResourceinfo";
import { PowerFactoryInfo } from "./commandR/FactoryInfo/PowerFactoryInfo";
import { MetallurgyInfo } from "./commandR/FactoryInfo/MetallurgyInfo";
import { DepartmentStatus } from "./commandP/SPY/DepartmentStatus";
import { PFarmCheckIn } from "./commandP/CheckIn/FarmCheckIn";
import { RFarmCheckIn } from "./commandR/CheckIn/FarmCheckIn";
import { ProduceTank } from "./commandR/produce/Tank";
import {ProduceInfantryEquipment} from "./commandR/produce/InfantryEquipment";
import {ProduceArtillery} from "./commandR/produce/Artillery";
import {ProduceArmoredCar} from "./commandR/produce/ArmoredCar";
import {ProduceAntiTankGun} from "./commandR/produce/AntiTankGun"
import { initializeDatabase } from "./models";

export const inject = {
  required: ['database']
}

export function apply(ctx: Context) {
    Regioninfo(ctx)
    Terraininfo(ctx)
    CheckIn(ctx)
    Playerinfo(ctx)
    Buildcountry(ctx)
    Laborinfo(ctx)
    RegionPopulation(ctx)
    RegionResourceinfo(ctx)

    //FactoryInfo
    RegionFactory(ctx)
    PowerFactoryInfo(ctx)
    MetallurgyInfo(ctx)

    //SPY
    DepartmentStatus(ctx)

    //produce
    ProduceTank(ctx)
    ProduceInfantryEquipment(ctx)
    ProduceArtillery(ctx)
    ProduceArmoredCar(ctx)
    ProduceAntiTankGun(ctx)

  //CheckIn(ctx)
    CheckIn(ctx)
    PFarmCheckIn(ctx)
    RFarmCheckIn(ctx)

    initializeDatabase(ctx)
}



