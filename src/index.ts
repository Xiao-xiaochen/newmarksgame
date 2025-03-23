import { Schema, Context } from "koishi";
import Database from "@koishijs/plugin-database-sqlite";
import { defineCommands } from "./commandR/Regioninfo";
const inject = [Database]

export function apply(ctx: Context) {
    defineCommands(ctx)
}
