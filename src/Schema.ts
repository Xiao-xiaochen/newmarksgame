import { Context ,Schema } from "koishi";
//配置项声明
export interface Config{
    mapSeed:string;
};
export const Config:Schema<Config>=Schema.intersect([

  Schema.object({
    mapSeed:Schema.string().description('世界地图种子').default('EarthLike2023')
    }).description('世界地图设置')

])

