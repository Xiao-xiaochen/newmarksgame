//这是所变量的类型定义文件
// types.ts

export interface Player {
    userId: string;                        //用户ID
    username: string;                      //用户名
    regionId?: string;                     //玩家的地区ID，就是玩家的QQ号
    countryId?: string;                    //国家ID
    population: number;                    //玩家人口
    infrastructure: number;                //基础设施
    constructiondepartment: number;        //建设部
    lightFactories: number;                //轻工厂
    farms: number;                         //农场
    food: number;                          //粮食
    goods: number;                         //商品

  }
  
  export interface Region {
    regionId: string;                       //地区ID，就是群的群号
    controllingCountryId?: string;          //控制国家ID
    leaderUserId: string;                   //地区领导者，默认为注册地区的人
    population: number;                     //人口
    infrastructure: number;                 //基础设施
    warehouseCapacity: number;              //仓库容量
    primaryIndustryCount: number;           //主产业数量
    secondaryIndustryCount: number;         //次级产业数量
    garrison: number;                       //驻军
    terrainFeatures: TerrainFeatures;       //地形特质
    resourceReserves: ResourceReserves;     //资源储备
  }

  export interface TerrainFeatures {        //地形特质
    mountainous: number;                    //山地
    hilly: number;                          //丘陵
    plains: number;                         //平原
    rivers: number;                         //河流
    forestCoverage: number;                 //森林覆盖率
  }

  export interface ResourceReserves {       //资源储备
    rareEarth: number;                      //稀土
    rareMetal: number;                      //稀有金属
    ironOre: number;                        //铁矿
    coal: number;                           //煤炭
    crudeOil: number;                       //原油
  }