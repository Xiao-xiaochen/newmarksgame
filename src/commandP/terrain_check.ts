import { Context, Session } from 'koishi';
import { TerrainFeatures } from '../types';

async function fetchTerrainData(session: Session, ctx: Context): Promise<TerrainFeatures> {
  if (!session.user) {
    throw new Error('用户未登录，无法获取地形数据');
  }

  const regionData = await ctx.database.get('regiondata', {
    guildId: session.guildId || '',
  });

  if (!regionData || regionData.length === 0) {
    throw new Error(`未找到对应的地域数据，guildId: ${session.guildId}`);
  }

  const region = regionData[0]; // 假设始终有一个匹配的区域

  // 从 resources.terrain 中提取地形特征
  return region.resources.terrain || {
    mountain: 0,
    hill: 0,
    plain: 0,
    river: 0,
    forest: 0,
  };
}
// 校验地形条件
export async function checkTerrain(session: Session, ctx: Context, condition: string): Promise<boolean> {
  const terrain = await fetchTerrainData(session, ctx);

  // 解析条件字符串（支持运算符：> < >= <= ==）
  const match = condition.match(/(\w+)\s*(>=|<=|>|<|==)\s*([\d.]+%?)/);
  if (!match) {
    throw new Error('条件格式错误');
  }

  const [_, feature, operator, value] = match;
  const threshold = value.includes('%')
    ? parseFloat(value.replace('%', '')) / 100 // 百分比转为小数
    : parseFloat(value);

  // 获取地形特征值
  const terrainValue = terrain[feature as keyof TerrainFeatures];

  // 比较运算
  switch (operator) {
    case '>': return terrainValue > threshold;
    case '<': return terrainValue < threshold;
    case '>=': return terrainValue >= threshold;
    case '<=': return terrainValue <= threshold;
    case '==': return terrainValue === threshold;
    default: throw new Error('不支持的运算符');
  }
}
