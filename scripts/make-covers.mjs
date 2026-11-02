/**
 * Generate portfolio cover images from the built projects.
 * Requires built outputs:
 *   projects/intelligence-archive/dist
 *   projects/人类文明/dist
 *   projects/unmanned-plant/dist
 * Usage: node scripts/make-covers.mjs
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'site', 'assets', 'covers');
const PORT = 5191;

const require = createRequire(import.meta.url);
const { chromium } = require(
  require.resolve('playwright-core', {
    paths: [path.join(ROOT, 'projects', 'intelligence-archive')],
  }),
);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

const server = http.createServer((request, response) => {
  const url = decodeURIComponent((request.url || '/').split('?')[0]);
  let target = path.join(ROOT, path.normalize(url));
  if (!target.startsWith(ROOT)) {
    response.writeHead(403).end();
    return;
  }
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    target = path.join(target, 'index.html');
  }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, {
    'content-type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream',
  });
  fs.createReadStream(target).pipe(response);
});

const shots = [
  {
    id: 'intelligence-archive',
    path: '/projects/intelligence-archive/dist/index.html',
    scroll: 900,
    wait: 3200,
  },
];

await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

for (const shot of shots) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const url = `http://127.0.0.1:${PORT}${encodeURI(shot.path)}`;
  console.log(`[cover] ${shot.id} <- ${url}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch((error) => {
    console.warn('  goto:', error.message);
  });
  await page.waitForTimeout(shot.wait);
  if (shot.scroll) {
    await page.evaluate((y) => window.scrollTo(0, y), shot.scroll);
    await page.waitForTimeout(1500);
  }
  await page.screenshot({
    path: path.join(OUT, `${shot.id}.jpg`),
    type: 'jpeg',
    quality: 84,
  });
  console.log(`  saved ${path.relative(ROOT, path.join(OUT, `${shot.id}.jpg`))}`);
  if (errors.length) console.warn('  pageerror:', errors.slice(0, 3));
  await page.close();
}

await browser.close();
server.close();
