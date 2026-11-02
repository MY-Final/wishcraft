import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath:
    'C:\\Users\\EDY\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe',
  args: ['--disable-webgl', '--disable-3d-apis'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
await page.goto('http://127.0.0.1:5178/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const probe = await page.evaluate(() => {
  const canvas = document.createElement('canvas');
  let gl2 = null;
  let gl1 = null;
  let err = null;
  try {
    gl2 = canvas.getContext('webgl2') ? 'ok' : null;
    gl1 = canvas.getContext('webgl') ? 'ok' : null;
  } catch (e) {
    err = e.message;
  }
  return {
    gl2,
    gl1,
    err,
    canvasCount: document.querySelectorAll('canvas').length,
    threeBackdrop: document.querySelectorAll('.three-backdrop').length,
    bodyText: document.body.innerText.slice(0, 30),
  };
});
console.log(JSON.stringify({ probe, errors }, null, 2));
await browser.close();
