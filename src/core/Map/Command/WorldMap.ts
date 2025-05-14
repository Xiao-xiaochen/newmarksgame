import { Context, segment } from 'koishi';
// TerrainRenderer 不再需要，可以注释或删除
// import { TerrainRenderer } from '../TerrainRenderer';
import * as path from 'path';
import * as fs from 'fs';
import puppeteer from 'koishi-plugin-puppeteer';
import { Page } from 'puppeteer-core';
// WorldMap 仍然需要，用于检查初始化状态等，但不再需要 getMapData
import { WorldMap } from '../MapCore';

export function WorldMapInfo(ctx: Context) {
  // 获取世界地图单例
  const worldMap = WorldMap.getInstance(ctx);
  // renderer 不再需要，可以注释或删除
  // const renderer = new TerrainRenderer();

  // 注册一个命令来查看世界地图
  ctx.command('查看世界地图')
    .action(async ({ session }) => {
      let page: Page | null = null;
      try {
        const username = session?.author?.name || '未知用户';

        // 不再需要获取动态地图数据
        // const map = worldMap.getMapData();

        if (!ctx.puppeteer) {
          return '错误：未找到 puppeteer 服务，请确保已安装并启用 koishi-plugin-puppeteer 插件。';
        }

        // --- 修改开始 ---
        // 直接读取静态 HTML 文件内容
        const staticMapPath = path.resolve(__dirname, '..', 'Map.html'); // 修正路径指向 Map.html
        let html: string;
        try {
          html = fs.readFileSync(staticMapPath, 'utf8');
        } catch (readError) {
          console.error(`读取静态地图文件失败: ${staticMapPath}`, readError);
          return `查看世界地图时出错：无法读取地图文件。请检查文件是否存在于 ${staticMapPath}`;
        }
        // --- 修改结束 ---

        // 后续处理逻辑保持不变，但使用读取到的 html 内容
        const htmlFileName = `worldmap_static_${Date.now()}.html`; // 可以改个名字区分
        const mapsDir = path.resolve(ctx.baseDir, 'maps'); // 临时文件存放目录
        const htmlFilePath = path.join(mapsDir, htmlFileName);

        if (!fs.existsSync(mapsDir)) {
          fs.mkdirSync(mapsDir, { recursive: true });
        }

        fs.writeFileSync(htmlFilePath, html, 'utf8'); // 将读取的静态 HTML 写入临时文件

        // 使用 puppeteer.page() 获取页面并截图
        try {
          page = await ctx.puppeteer.page();
          // 使用 file:// 协议加载本地临时 HTML 文件
          await page.goto(`file://${htmlFilePath}`, { waitUntil: 'networkidle0' });

          const imageBuffer = await page.screenshot({
             type: 'png',
             fullPage: true,
          });

          // 清理临时 HTML 文件
          try {
            fs.unlinkSync(htmlFilePath);
          } catch (cleanupError) {
            console.warn(`清理临时地图文件失败: ${htmlFilePath}`, cleanupError);
          }


          if (!Buffer.isBuffer(imageBuffer)) {
             console.error('Puppeteer page.screenshot did not return a Buffer.');
             // 注意：这里不再暴露临时文件路径给用户
             return `查看世界地图时出错：无法获取图片 Buffer 数据。`;
          }

          return [
            `===[世界地图]===`,
            segment.image(imageBuffer, 'image/png')
          ];
        } catch (puppeteerError) {
           console.error('Puppeteer page 操作错误:', puppeteerError);
           // 注意：这里不再暴露临时文件路径给用户
           return `查看世界地图图片时出错: ${puppeteerError.message}。`;
        } finally {
          if (page) {
            await page.close();
          }
          // 确保即使截图失败也尝试清理临时文件
          if (fs.existsSync(htmlFilePath)) {
            try {
              fs.unlinkSync(htmlFilePath);
            } catch (cleanupError) {
              console.warn(`截图失败后清理临时地图文件失败: ${htmlFilePath}`, cleanupError);
            }
          }
        }
      } catch (error) {
        console.error('查看世界地图命令出错:', error);
        return `查看世界地图时出错: ${error.message}`;
      }
    });
    
  // 在应用启动时检查地图状态
  ctx.on('ready', () => {
    console.log('检查世界地图状态...');
    if (worldMap.isInitialized()) {
      console.log('世界地图已初始化，可以使用');
    } else {
      console.log('世界地图尚未初始化，等待管理员执行初始化命令');
    }
  });
}