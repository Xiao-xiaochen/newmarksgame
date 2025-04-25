import { Context } from 'koishi';
import { TerrainType } from '../../types';
import * as path from 'path';
import * as fs from 'fs';

export class TerrainRenderer {
  // 地形对应的颜色
  private terrainColors: Record<TerrainType, string> = {
    [TerrainType.OCEAN]: '#1E90FF',    // 深蓝色
    [TerrainType.PLAIN]: '#90EE90',    // 浅绿色
    [TerrainType.FOREST]: '#228B22',   // 森林绿
    [TerrainType.HILLS]: '#CD853F',    // 棕色
    [TerrainType.MOUNTAIN]: '#808080', // 灰色
  };

  // 地形对应的名称
  private terrainNames: Record<TerrainType, string> = {
    [TerrainType.OCEAN]: '海洋',
    [TerrainType.PLAIN]: '平原',
    [TerrainType.FOREST]: '森林',
    [TerrainType.HILLS]: '丘陵',
    [TerrainType.MOUNTAIN]: '山地',
  };

  // 生成HTML模板
  public generateMapHtml(map: TerrainType[][]): string {
    const mapSize = map.length;
    
    // 创建HTML内容
    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>世界地图</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f0f0f0;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background-color: white;
      padding: 20px;
      border-radius: 5px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }
    h1 {
      text-align: center;
      color: #333;
    }
    .map-container {
      position: relative;
      overflow: auto;
      margin-top: 20px;
    }
    .map-grid {
      display: grid;
      grid-template-columns: repeat(${mapSize + 1}, 12px);
      grid-template-rows: repeat(${mapSize + 1}, 12px);
      gap: 1px;
    }
    .map-cell {
      width: 12px;
      height: 12px;
      border: 1px solid rgba(0, 0, 0, 0.1);
    }
    .map-label {
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 10px;
      color: #333;
      background-color: #f0f0f0;
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      margin-top: 20px;
      gap: 15px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      margin-right: 15px;
    }
    .legend-color {
      width: 20px;
      height: 20px;
      margin-right: 5px;
      border: 1px solid #333;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>世界地图 (80×80)</h1>
    
    <div class="map-container">
      <div class="map-grid">
        <!-- 左上角空白格 -->
        <div class="map-cell map-label"></div>
        
        <!-- 顶部坐标标签 (X轴) -->
`;

    // 添加顶部坐标标签 (X轴)
    for (let x = 0; x < mapSize; x++) {
      if (x % 5 === 0) { // 每5格显示一个标签
        html += `        <div class="map-cell map-label">${x.toString().padStart(2, '0')}</div>\n`;
      } else {
        html += `        <div class="map-cell map-label"></div>\n`;
      }
    }

    // 添加地图内容和左侧坐标标签 (Y轴)
    for (let y = 0; y < mapSize; y++) {
      // 左侧坐标标签 (Y轴)
      if (y % 5 === 0) { // 每5格显示一个标签
        html += `        <div class="map-cell map-label">${y.toString().padStart(2, '0')}</div>\n`;
      } else {
        html += `        <div class="map-cell map-label"></div>\n`;
      }
      
      // 地图单元格
      for (let x = 0; x < mapSize; x++) {
        const terrain = map[y][x];
        const color = this.terrainColors[terrain];
        html += `        <div class="map-cell" style="background-color: ${color};" title="坐标: ${x.toString().padStart(2, '0')}${y.toString().padStart(2, '0')}, 地形: ${this.terrainNames[terrain]}"></div>\n`;
      }
    }

    // 添加图例
    html += `      </div>
    </div>
    
    <div class="legend">
`;

    // 为每种地形添加图例
    Object.entries(this.terrainColors).forEach(([terrain, color]) => {
      html += `      <div class="legend-item">
        <div class="legend-color" style="background-color: ${color};"></div>
        <span>${this.terrainNames[terrain as TerrainType]}</span>
      </div>\n`;
    });

    // 完成HTML
    html += `    </div>
  </div>
</body>
</html>`;

    return html;
  }

  // 保存HTML到文件
  public saveHtmlToFile(html: string, filePath: string): void {
    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // 写入文件
    fs.writeFileSync(filePath, html, 'utf8');
  }
}