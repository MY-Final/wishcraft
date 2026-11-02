import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EXECUTABLE =
  process.env.CHROME_PATH ||
  'C:\\Users\\EDY\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe';
const BASE = process.env.ARCHIVE_URL || 'http://127.0.0.1:5178/';
const OUT = resolve('docs/screens/audit');
mkdirSync(OUT, { recursive: true });

const report = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  issues: [],
  chapters: [],
  screenshots: [],
  performance: {},
  mobile: {},
  reducedMotion: {},
  noWebgl: {},
  archive: {},
};

function logIssue(kind, message, detail) {
  report.issues.push({ kind, message, detail });
}

async function openPage(browser, viewport, options = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    reducedMotion: options.reducedMotion || 'no-preference',
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(`PAGEERROR: ${error.message}`));
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  return { context, page, consoleErrors };
}

async function shot(page, name) {
  const path = resolve(OUT, `${name}.png`);
  await page.screenshot({ path });
  report.screenshots.push(path);
  return path;
}

async function chapterMetrics(page) {
  return page.evaluate(() => {
    const viewport = window.innerHeight;
    return Array.from(document.querySelectorAll('[data-scene]')).map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        chapter: Number(element.dataset.chapter),
        top: rect.top + window.scrollY,
        height: rect.height,
        yearStart: element.dataset.yearStart,
        yearEnd: element.dataset.yearEnd,
        label: element.getAttribute('aria-label'),
      };
    });
  });
}

async function measureFps(page, ms = 1500) {
  return page.evaluate(
    (duration) =>
      new Promise((resolveFps) => {
        let frames = 0;
        const start = performance.now();
        const tick = () => {
          frames += 1;
          if (performance.now() - start < duration) requestAnimationFrame(tick);
          else resolveFps(Math.round((frames * 1000) / (performance.now() - start)));
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );
}

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

// ---------- desktop narrative ----------
{
  const { context, page, consoleErrors } = await openPage(browser, { width: 1440, height: 900 });
  await page.waitForTimeout(1500);
  await shot(page, '00-hero');

  const chapters = await chapterMetrics(page);
  report.chapters = chapters;
  if (chapters.length < 9) logIssue('structure', `expected at least 9 scenes, found ${chapters.length}`);

  const viewport = 900;
  for (const chapter of chapters) {
    const top = chapter.top + Math.min(Math.max((chapter.height - viewport) * 0.35, 0), chapter.height - viewport);
    await page.evaluate((y) => window.scrollTo(0, y), top);
    await page.waitForTimeout(1100);
    await shot(page, `ch${String(chapter.chapter).padStart(2, '0')}`);
    if (chapter.chapter === 3 || chapter.chapter === 4 || chapter.chapter === 7) {
      const fps = await measureFps(page);
      report.performance[`chapter${chapter.chapter}`] = fps;
    }
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  report.performance.heroFps = await measureFps(page);

  if (consoleErrors.length) logIssue('console', 'narrative console errors', consoleErrors.slice(0, 12));
  await context.close();
}

// ---------- mobile narrative ----------
{
  const { context, page, consoleErrors } = await openPage(browser, { width: 390, height: 844 });
  await page.waitForTimeout(1800);
  await shot(page, 'mobile-hero');
  const chapters = await chapterMetrics(page);
  for (const chapter of chapters) {
    if (![0, 3, 5, 7, 8].includes(chapter.chapter)) continue;
    const top = chapter.top + Math.max((chapter.height - 844) * 0.3, 0);
    await page.evaluate((y) => window.scrollTo(0, y), top);
    await page.waitForTimeout(1000);
    await shot(page, `mobile-ch${String(chapter.chapter).padStart(2, '0')}`);
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  report.mobile = { overflowX: overflow, chapters: chapters.length };
  if (overflow > 2) logIssue('responsive', `horizontal overflow ${overflow}px on 390px viewport`);
  if (consoleErrors.length) logIssue('console', 'mobile console errors', consoleErrors.slice(0, 12));
  await context.close();
}

// ---------- archive ----------
{
  const { context, page, consoleErrors } = await openPage(browser, { width: 1440, height: 900 });
  await page.evaluate(() => {
    window.location.hash = '#/archive';
  });
  await page.waitForTimeout(1500);
  await shot(page, 'archive-desktop');
  const search = page.locator('input[type="search"], input[placeholder*="搜索"], input[placeholder*="SEARCH"]').first();
  if (await search.count()) {
    await search.fill('DeepSeek');
    await page.waitForTimeout(900);
    await shot(page, 'archive-search');
    const results = await page.locator('button, a, [role="option"], li').filter({ hasText: 'DeepSeek' }).count();
    report.archive.searchHits = results;
    await page.keyboard.press('Escape');
  } else {
    logIssue('archive', 'search input not found');
  }
  if (consoleErrors.length) logIssue('console', 'archive console errors', consoleErrors.slice(0, 12));
  await context.close();
}

// ---------- reduced motion ----------
{
  const { context, page, consoleErrors } = await openPage(
    browser,
    { width: 1440, height: 900 },
    { reducedMotion: 'reduce' },
  );
  await page.waitForTimeout(1500);
  await shot(page, 'reduced-motion-hero');
  const chapters = await chapterMetrics(page);
  for (const chapter of chapters) {
    if (chapter.chapter !== 3) continue;
    await page.evaluate((y) => window.scrollTo(0, y), chapter.top + 400);
    await page.waitForTimeout(900);
    await shot(page, 'reduced-motion-ch03');
  }
  report.reducedMotion = { errors: consoleErrors.slice(0, 6) };
  if (consoleErrors.length) logIssue('console', 'reduced-motion console errors', consoleErrors.slice(0, 8));
  await context.close();
}

// ---------- no WebGL fallback ----------
{
  const noGlBrowser = await chromium.launch({
    executablePath: EXECUTABLE,
    args: ['--disable-webgl', '--disable-3d-apis'],
  });
  const { context, page, consoleErrors } = await openPage(noGlBrowser, { width: 1440, height: 900 });
  await page.waitForTimeout(1800);
  await shot(page, 'no-webgl-hero');
  const chapters = await chapterMetrics(page);
  const ch03 = chapters.find((chapter) => chapter.chapter === 3);
  if (ch03) {
    await page.evaluate((y) => window.scrollTo(0, y), ch03.top + 500);
    await page.waitForTimeout(1000);
    await shot(page, 'no-webgl-ch03');
  }
  report.noWebgl = { errors: consoleErrors.slice(0, 8) };
  if (consoleErrors.length) logIssue('console', 'no-webgl console errors', consoleErrors.slice(0, 8));
  await context.close();
  await noGlBrowser.close();
}

await browser.close();

writeFileSync(resolve('docs/QA_AUTOMATED.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ issues: report.issues, chapters: report.chapters.length, screenshots: report.screenshots.length, performance: report.performance, mobile: report.mobile, archive: report.archive }, null, 2));
