//不会写，用下AI应该没问题吧

import { Context, segment } from 'koishi';
import { TerrainGenerator } from '../core/Map/TerrainGenerator';
import { TerrainRenderer } from '../core/Map/TerrainRenderer';
import puppeteer from 'koishi-plugin-puppeteer'

import * as path from 'path';
import * as fs from 'fs';
import { Page } from 'puppeteer-core'; // 导入 Page 类型以获得更好的类型提示

export function SetupTerrainGenerator(ctx: Context) {
  // 创建一个全局的地形生成器实例
  const generator = new TerrainGenerator('your-seed-here'); // 使用固定种子以确保一致性
  const renderer = new TerrainRenderer();
  
  // 注册一个命令来查看地区地形
  ctx.command('查看地形 <regionId:string>')
    .action(async (_, regionId) => {
      if (!regionId || !/^\d{4}$/.test(regionId)) {
        return '请提供有效的4位数地区编号，例如：0101';
      }
      
      try {
        return generator.generateTerrainDescription(regionId);
      } catch (error) {
        return `生成地形时出错: ${error.message}`;
      }
    });
  
  // 注册一个命令来生成并渲染世界地图
  ctx.command('生成世界地图 [seed:string]')
    .action(async ({ session }, seed) => {
      let page: Page | null = null; // 在 try 外部声明 page 变量，以便在 finally 中访问
      try {
        const username = session?.author?.name || '未知用户';

        const map = generator.generateFullMap(seed);

        if (!ctx.puppeteer) {
          return '错误：未找到 puppeteer 服务，请确保已安装并启用 koishi-plugin-puppeteer 插件。';
        }

        const html = renderer.generateMapHtml(map);

        const htmlFileName = `worldmap_${Date.now()}.html`;
        const mapsDir = path.resolve(ctx.baseDir, 'maps');
        const htmlFilePath = path.join(mapsDir, htmlFileName);

        if (!fs.existsSync(mapsDir)) {
          fs.mkdirSync(mapsDir, { recursive: true });
        }

        fs.writeFileSync(htmlFilePath, html, 'utf8');

        // 使用 puppeteer.page() 获取页面并截图
        try {
          page = await ctx.puppeteer.page(); // 获取一个新的页面实例
          await page.goto(`file://${htmlFilePath}`, { waitUntil: 'networkidle0' }); // 加载本地 HTML 文件，等待网络空闲

          // 在 Page 对象上调用 screenshot
          const imageBuffer = await page.screenshot({
             type: 'png', // 或者 'jpeg'
             fullPage: true, // 截取完整页面
             // 可以设置截图区域或视口大小
             // clip: { x: 0, y: 0, width: 1200, height: 1200 },
             // viewport: { width: 1200, height: 1200, deviceScaleFactor: 1.5 }
          });

          // 检查返回的是否是 Buffer
          if (!Buffer.isBuffer(imageBuffer)) {
             console.error('Puppeteer page.screenshot did not return a Buffer.');
             return `生成世界地图时出错：无法获取图片 Buffer 数据。HTML 文件保存在: ${htmlFilePath}`;
          }

          return [
            `${username} 同志！世界地图已生成完毕！`,
            // 传入 Buffer 和 MIME 类型 'image/png'
            segment.image(imageBuffer, 'image/png')
          ];
        } catch (puppeteerError) {
           console.error('Puppeteer page 操作错误:', puppeteerError);
           return `生成世界地图图片时出错: ${puppeteerError.message}。HTML 文件已保存在: ${htmlFilePath}`;
        } finally {
          // 确保页面被关闭，即使发生错误
          if (page) {
            await page.close();
          }
        }

      } catch (error) {
        console.error('生成世界地图命令出错:', error);
        return `生成世界地图时出错: ${error.message}`;
      }
    });
}