import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath:
    'C:\\Users\\EDY\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
const results = {};

await page.goto('http://127.0.0.1:5178/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1600);

// year rail after deep chapter link
await page.evaluate(() => {
  window.location.hash = '#/chapter/7';
});
await page.waitForTimeout(1800);
results.chapterJump = await page.evaluate(() => ({
  year: document.querySelector('.year-rail__year')?.textContent?.trim(),
  chapter: document.querySelector('.year-rail__chapter')?.textContent?.trim(),
  scrollY: Math.round(window.scrollY),
  ch07Top: Math.round(document.querySelector('[data-chapter="7"]').getBoundingClientRect().top + window.scrollY),
}));

// archive search + detail + close
await page.evaluate(() => {
  window.location.hash = '#/archive';
});
await page.waitForTimeout(1400);
const search = page.locator('input.arch-search__input').first();
await search.fill('DeepSeek');
await page.waitForTimeout(500);
results.searchCount = await page.locator('.arch-table tbody tr').count();
await page.keyboard.press('Enter');
await page.waitForTimeout(800);
results.dialogOpen = await page.evaluate(() => ({
  dialog: !!document.querySelector('[role="dialog"]'),
  hash: window.location.hash,
  title: document.querySelector('[role="dialog"] h2, [role="dialog"] h3')?.textContent?.trim(),
}));
await page.keyboard.press('Escape');
await page.waitForTimeout(600);
results.dialogClosed = await page.evaluate(() => ({
  dialog: !!document.querySelector('[role="dialog"]'),
  hash: window.location.hash,
}));

// back to narrative restores scroll
const before = await page.evaluate(() => window.scrollY);
await page.evaluate(() => {
  window.location.hash = '#/';
});
await page.waitForTimeout(1500);
results.returnToNarrative = {
  archiveScroll: Math.round(before),
  narrativeScroll: Math.round(await page.evaluate(() => window.scrollY)),
};

// year rail click
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(600);
const ticks = page.locator('.year-rail__tick');
await ticks.nth(2).click();
await page.waitForTimeout(1800);
results.yearRail = await page.evaluate(() => ({
  year: document.querySelector('.year-rail__year')?.textContent?.trim(),
  chapter: document.querySelector('.year-rail__chapter')?.textContent?.trim(),
  scrollY: Math.round(window.scrollY),
}));

results.errors = errors;
console.log(JSON.stringify(results, null, 2));
await browser.close();
