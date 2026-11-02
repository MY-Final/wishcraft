import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const { chromium } = require(
  require.resolve('playwright-core', {
    paths: [path.join(ROOT, 'projects', 'intelligence-archive')],
  }),
);

const BASE = 'http://127.0.0.1:5180/';
const SHOT_DIR = 'docs/site-preview';
mkdirSync(SHOT_DIR, { recursive: true });
const shot = (name) => `${SHOT_DIR}/${name}`;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

const report = { pages: [], errors: [], checks: {} };

async function pageFor(viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on('console', (message) => {
    if (message.type() === 'error') report.errors.push(`${page.url()} :: ${message.text()}`);
  });
  page.on('pageerror', (error) => report.errors.push(`${page.url()} :: PAGEERROR ${error.message}`));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      report.errors.push(`${page.url()} :: HTTP ${response.status()} ${response.url()}`);
    }
  });
  return page;
}

// desktop portfolio
{
  const page = await pageFor({ width: 1440, height: 900 });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  report.checks.rows = await page.locator('.work-row').count();
  report.checks.title = await page.title();
  report.checks.covers = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.preview img')).map((img) => ({
      loaded: img.classList.contains('is-loaded'),
      src: img.getAttribute('src'),
    })),
  );
  await page.screenshot({ path: shot('site-preview-desktop.png') });
  await page.locator('.work-row__link').nth(0).hover();
  await page.waitForTimeout(800);
  await page.screenshot({ path: shot('site-preview-hover.png') });
  await page.locator('.work-row__link').nth(0).click();
  await page.waitForTimeout(900);
  report.checks.detailVisible = await page.locator('#detail').isVisible();
  report.checks.detailTitle = await page.locator('#detail-title').textContent();
  await page.screenshot({ path: shot('site-preview-detail.png') });
  const entered = await Promise.all([
    page.waitForURL(/projects\/intelligence-archive\//, { timeout: 15000 }),
    page.locator('#detail-enter').click(),
  ]).catch((error) => error.message);
  await page.waitForTimeout(1800);
  report.checks.archiveTitle = await page.title();
  await page.screenshot({ path: shot('site-preview-entered.png') });
  await page.close();
}

// mobile portfolio + detail
{
  const page = await pageFor({ width: 390, height: 844 });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: shot('site-preview-mobile.png') });
  await page.locator('.work-row__link').nth(0).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: shot('site-preview-mobile-detail.png') });
  report.checks.mobileOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  await page.close();
}

// direct project previews
for (const id of ['intelligence-archive']) {
  const page = await pageFor({ width: 1280, height: 800 });
  const url = new URL(`projects/${id}/`, BASE).href;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch((error) => {
    report.errors.push(`${url} :: goto ${error.message}`);
  });
  await page.waitForTimeout(1800);
  report.pages.push({ id, url, title: await page.title() });
  await page.screenshot({ path: shot(`site-preview-project-${id}.png`) });
  await page.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
