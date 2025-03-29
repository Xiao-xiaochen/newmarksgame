import { Schema, Context } from "koishi";
import { Database }  from "koishi";
import { Regioninfo } from "./commandR/Regioninfo";
import { CheckIn } from "./commandP/CheckIn";
import { Playerinfo } from "./commandP/Playerinfo";
import { Buildcountry } from "./commandP/Buildcountry";

const inject = [ Database ]

export function apply(ctx: Context) {
    Regioninfo(ctx)
    CheckIn(ctx)
    Playerinfo(ctx)
    Buildcountry(ctx)
}
