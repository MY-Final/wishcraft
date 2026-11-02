import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath:
    'C:\\Users\\EDY\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:5178/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const scroll = Number(process.argv[2] || 19700);
await page.evaluate((y) => window.scrollTo(0, y), scroll);
await page.waitForTimeout(1400);
const result = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('*')) {
    const style = getComputedStyle(el);
    const size = parseFloat(style.fontSize);
    if (!(size > 40)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
    if (rect.left < 0 || rect.right > window.innerWidth) continue;
    out.push({
      tag: el.tagName,
      cls: el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className,
      size,
      opacity: style.opacity,
      text: (el.textContent || '').trim().slice(0, 30),
      rect: [Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height)],
    });
  }
  return out.sort((a, b) => b.size - a.size).slice(0, 40);
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
