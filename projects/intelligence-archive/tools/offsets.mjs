import { chromium } from 'playwright-core';

const EXECUTABLE =
  process.env.CHROME_PATH ||
  'C:\\Users\\EDY\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe';
const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('pageerror', (error) => errors.push(`PAGEERROR: ${error.message}`));
await page.goto(process.argv[2] || 'http://127.0.0.1:5178/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const chapters = await page.evaluate(() =>
  Array.from(document.querySelectorAll('[data-scene]')).map((element) => {
    const rect = element.getBoundingClientRect();
    return {
      chapter: Number(element.dataset.chapter),
      top: Math.round(rect.top + window.scrollY),
      height: Math.round(rect.height),
      label: element.getAttribute('aria-label'),
    };
  }),
);
console.log(JSON.stringify({ chapters, total: await page.evaluate(() => document.documentElement.scrollHeight), errors }, null, 2));
await browser.close();
