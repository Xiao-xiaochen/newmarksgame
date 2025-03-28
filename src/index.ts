import { Schema, Context } from "koishi";
import Database from "@koishijs/plugin-database-sqlite";
import { Regioninfo } from "./commandR/Regioninfo";
const inject = [Database]

export function apply(ctx: Context) {
    Regioninfo(ctx)
}
