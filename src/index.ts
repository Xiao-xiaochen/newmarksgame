import { Schema, Context } from "koishi";
import { Regioninfo } from "./commandR/Regioninfo";
import { CheckIn } from "./commandP/CheckIn";
import { Playerinfo } from "./commandP/Playerinfo";
import { Buildcountry } from "./commandP/Buildcountry";
import { Terraininfo } from "./commandR/Terraininfo";

export const inject = {
  required: ['database'] 
}

export function apply(ctx: Context) {
    Regioninfo(ctx)
    Terraininfo(ctx)
    CheckIn(ctx)
    Playerinfo(ctx)
    Buildcountry(ctx)
}

  

