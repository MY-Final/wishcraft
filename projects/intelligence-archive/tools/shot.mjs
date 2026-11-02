import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const EXECUTABLE =
  process.env.CHROME_PATH ||
  'C:\\Users\\EDY\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe';

const url = process.argv[2] || 'http://127.0.0.1:5178/';
const outDir = resolve(process.argv[3] || 'docs/screens');
const width = Number(process.argv[4] || 1440);
const height = Number(process.argv[5] || 900);
const label = process.argv[6] || 'shot';
const scroll = Number(process.argv[7] || 0);
const wait = Number(process.argv[8] || 900);

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('pageerror', (error) => errors.push(`PAGEERROR: ${error.message}`));

await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(wait);
if (scroll) {
  await page.evaluate((y) => window.scrollTo(0, y), scroll);
  await page.waitForTimeout(1100);
}
const file = resolve(outDir, `${label}.png`);
await page.screenshot({ path: file, fullPage: false });
console.log(JSON.stringify({ file, errors, title: await page.title() }, null, 2));
await browser.close();
