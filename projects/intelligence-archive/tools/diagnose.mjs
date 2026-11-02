import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath:
    'C:\\Users\\EDY\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const failed = [];
page.on('response', (response) => {
  if (response.status() >= 400) failed.push({ status: response.status(), url: response.url() });
});
page.on('pageerror', (error) => failed.push({ status: 'PAGEERROR', url: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error') failed.push({ status: 'CONSOLE', url: message.text() });
});
await page.goto('http://127.0.0.1:5178/', { waitUntil: 'networkidle', timeout: 30000 }).catch((error) => {
  console.log('goto error', error.message);
});
await page.waitForTimeout(1500);
console.log(JSON.stringify(failed.slice(0, 25), null, 2));
await browser.close();
