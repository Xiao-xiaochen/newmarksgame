//src\index.ts

import { Schema, Context } from "koishi";
import { Regioninfo } from "./commandR/Regioninfo";
import { CheckIn } from "./commandP/CheckIn";
import { Playerinfo } from "./commandP/Playerinfo";
import { Buildcountry } from "./commandP/Buildcountry";
import { Terraininfo } from "./commandR/Terraininfo";
import { Laborinfo } from "./commandR/Laborinfo";
import { RegionPopulation } from "./commandR/RegionPopulation";
import { RegionFactory } from "./commandR/RegionFactory";
import { RegionResourceinfo } from "./commandR/RegionResourceinfo";
import { Power_Factory_Info } from "./commandR/Power_Factory_Info";
import { Region_Metallurgy_Info } from "./commandR/RegionMetallurgyInfo";
import { intelligence_department_status } from "./commandr/intelligence_department_status";
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
    RegionFactory(ctx)
    Power_Factory_Info(ctx)
    Region_Metallurgy_Info(ctx)
    intelligence_department_status(ctx)
}



