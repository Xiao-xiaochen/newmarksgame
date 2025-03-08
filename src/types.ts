//这是所变量的类型定义文件
// types.ts

export interface Player {
    userId: string;                        //用户ID
    username: string;                      //用户名
    regionId: string;                      //玩家的地区ID，就是玩家的QQ号
    countryId: string;                      //国家ID
    population: number;                    //玩家人口
    infrastructure: number;                //基础设施
    constructiondepartment: number;        //建设部
    lightFactories: number;                //轻工厂
    farms: number;                         //农场
    food: number;                          //粮食
    goods: number;                         //商品
  }

export interface ResourceReserves {       //资源储备
    rareEarth: number;                      //稀土
    rareMetal: number;                      //稀有金属
    ironOre: number;                        //铁矿
    coal: number;                           //煤炭
    crudeOil: number;                       //原油
    aluminum: number;                       //铝
    oil: number;                          //石油
  }

export interface TerrainFeatures {        //地形特质
    mountain: number;                    //山地
    hill: number;                          //丘陵
    plain: number;                         //平原
    river: number;                         //河流
    forest: number;                 //森林覆盖率
}

  export interface MilitaryBase {
    garrison: number;                       //驻军
    highway: number;                        //公路
    militaryWarehouse: number;              //军事仓库
    fortress: number;                       //要塞
    radar: number;                          //雷达
    airDefense: number;                     //防空阵地
  }

  export interface MilitaryWarehouseInfo {
    infantryEquipment: number;              //步兵装备
    tank: number;                           //坦克
  }
  
  export interface Region {
    regionId: string;
    groupId: string;
    ownerId: string;
    name: string;
    population: number;
    infrastructure: number;
    farmland: number;
    factory: number;
    resource: ResourceReserves;
    terrain: TerrainFeatures;
    labor: number;
    leaderUserId: string;                //地区领导者，默认为注册地区的人
    warehouseCapacity: number;           //仓库容量
    primaryIndustryCount: number;        //主产业数量
    secondaryIndustryCount: number;      //次级产业数量
    garrison: number;                    //驻军
  }
