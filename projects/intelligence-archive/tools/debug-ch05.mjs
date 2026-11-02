import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath:
    'C:\\Users\\EDY\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:5178/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.evaluate(() => window.scrollTo(0, 15900));
await page.waitForTimeout(2200);
await page.evaluate(() => {
  const backdrop = document.querySelector('.three-backdrop');
  if (backdrop) backdrop.setAttribute('style', 'display:none');
});
await page.waitForTimeout(800);
await page.screenshot({ path: 'docs/screens/debug-ch05-noglobal.png' });
const info = await page.evaluate(() => {
  const canvases = Array.from(document.querySelectorAll('canvas')).map((canvas) => {
    const rect = canvas.getBoundingClientRect();
    return { w: Math.round(rect.width), h: Math.round(rect.height), x: Math.round(rect.x) };
  });
  return { canvases, stage: !!document.querySelector('.constellation-stage') };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
