export interface Player {
  id: string;
  userId: string;
  username: string;
  groupId: string;
  name: string;
  resource: {
    population: number;
    infrastructure: number;
    buildingDepartment: number;
    lightFactory: number;
    farmland: number;
    food: number;
  };
  regionId: string;
  countryId: string;
  population: number;
  infrastructure: number;
  constructiondepartment: number;
  lightFactories: number;
  farms: number;
  food: number;
  goods: number;
}
