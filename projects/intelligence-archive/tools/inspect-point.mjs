import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath:
    'C:\\Users\\EDY\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:5178/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.evaluate(() => window.scrollTo(0, 19700));
await page.waitForTimeout(1400);
const info = await page.evaluate(() => {
  const points = [
    [100, 680],
    [400, 700],
    [900, 720],
    [1200, 600],
  ];
  return points.map(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return { at: [x, y], none: true };
    const chain = [];
    let node = el;
    for (let i = 0; i < 6 && node; i += 1) {
      const style = getComputedStyle(node);
      chain.push({
        tag: node.tagName,
        cls: node.className && node.className.baseVal !== undefined ? node.className.baseVal : node.className,
        text: (node.textContent || '').trim().slice(0, 20),
        fontSize: style.fontSize,
        transform: style.transform,
        opacity: style.opacity,
      });
      node = node.parentElement;
    }
    return { at: [x, y], chain };
  });
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
