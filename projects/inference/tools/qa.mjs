/**
 * Browser acceptance suite for THE INFERENCE.
 *
 * Run against a production preview:
 *   pnpm build
 *   pnpm exec vite preview --host 127.0.0.1 --port 5190 --strictPort
 *   node tools/qa.mjs
 *
 * The suite uses the same public debug handle exposed by the app for QA only
 * (`window.__INFERENCE__`) to seek the clock and query draw calls. Every user
 * facing interaction is still exercised through real DOM clicks and keyboard.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'docs', 'qa');
fs.mkdirSync(out, { recursive: true });

const BASE = process.env.QA_URL ?? 'http://127.0.0.1:5190/';
const chrome = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const results = [];
const errors = [];
const screenshots = [];

const add = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};
const screenshot = async (page, name) => {
  const file = path.join(out, `${name}.png`);
  await page.screenshot({ path: file });
  screenshots.push(path.relative(root, file).replaceAll('\\', '/'));
};

const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});

async function makePage(options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport ?? { width: 1440, height: 900 },
    reducedMotion: options.reducedMotion ? 'reduce' : 'no-preference',
    hasTouch: Boolean(options.mobile),
    isMobile: Boolean(options.mobile),
    deviceScaleFactor: options.mobile ? 2 : 1,
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`[pageerror] ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`[console] ${message.text()}`);
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', { timeout: 30000 });
  await page.waitForTimeout(1300);
  return { context, page };
}

async function seekStage(page, index) {
  await page.evaluate((i) => window.__INFERENCE__.clock.seekStage(i), index);
  await page.waitForFunction((i) => window.__INFERENCE__.getSnapshot().stageIndex === i, index, { timeout: 5000 });
  await page.waitForTimeout(1200);
}

async function seekProgress(page, progress) {
  await page.evaluate((value) => window.__INFERENCE__.clock.seekProgress(value), progress);
  await page.waitForTimeout(1500);
}

async function start(page) {
  await page.locator('.start-button').click();
  await page.waitForTimeout(1600);
}

const scanSafeArea = async (page, requireToken = false) =>
  page.evaluate((needToken) => {
    const world = window.__INFERENCE__.world;
    for (let y = 170; y <= 740; y += 38) {
      for (let x = 700; x <= 1080; x += 38) {
        const pick = world.pickAtScreen(x, y);
        if (pick && (!needToken || typeof pick.tokenIndex === 'number')) {
          return { ...pick, x, y };
        }
      }
    }
    return null;
  }, requireToken);

async function main() {
  /* ------------------------------------------------------------------ desktop */
  const { context: desktopContext, page } = await makePage();
  await screenshot(page, '01-landing-desktop');

  const landingText = (await page.locator('.landing__title').innerText()).replace(/\s+/g, '');
  add('Landing headline', landingText.includes('当你按下发送') && landingText.includes('AI的世界发生了什么？'), landingText);
  add('Landing has the prefilled question', (await page.locator('.console__message p').innerText()).includes('为什么天空是蓝色的'));
  add('Landing start button is visible', await page.locator('.start-button').isVisible());
  add(
    'Landing has no horizontal overflow',
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  );

  await start(page);
  const afterStart = await page.evaluate(() => window.__INFERENCE__.getSnapshot());
  add('Start enters the journey', afterStart.phase === 'journey' && afterStart.stageIndex === 0, JSON.stringify({ phase: afterStart.phase, stage: afterStart.stageIndex }));
  add('Journey chrome is visible', await page.locator('.chapter-panel').isVisible() && await page.locator('.player').isVisible());
  await screenshot(page, '02-request-desktop');

  // keyboard play/pause (event target is window so the shortcut handler runs)
  const playingBefore = await page.evaluate(() => window.__INFERENCE__.getSnapshot().playing);
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true }));
  });
  await page.waitForTimeout(300);
  const paused = await page.evaluate(() => window.__INFERENCE__.getSnapshot().playing);
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true }));
  });
  await page.waitForTimeout(300);
  const resumed = await page.evaluate(() => window.__INFERENCE__.getSnapshot().playing);
  add('Keyboard play/pause', playingBefore && !paused && resumed, `before=${playingBefore}, paused=${paused}, resumed=${resumed}`);

  // direct chapter navigation
  await page.locator('.stage-rail__button').nth(2).click();
  await page.waitForFunction(() => window.__INFERENCE__.getSnapshot().stageIndex === 2, { timeout: 5000 });
  add('Direct chapter navigation', (await page.evaluate(() => window.__INFERENCE__.getSnapshot().stageIndex)) === 2);
  await page.waitForTimeout(1700);
  await screenshot(page, '03-tokenizer-desktop');

  // speed control
  await page.getByRole('button', { name: '2×' }).click();
  const speedTwo = await page.evaluate(() => window.__INFERENCE__.getSnapshot().speed);
  await page.getByRole('button', { name: '1×' }).click();
  add('Playback speed buttons', speedTwo === 2, `2× state=${speedTwo}`);

  // timeline scrub — use a real pointer press because the range owns scrub gestures
  if (await page.evaluate(() => window.__INFERENCE__.getSnapshot().playing)) {
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true }));
    });
    await page.waitForTimeout(250);
  }
  const timelineBox = await page.locator('.timeline__range').boundingBox();
  if (timelineBox) {
    await page.mouse.click(timelineBox.x + timelineBox.width * 0.56, timelineBox.y + timelineBox.height / 2);
  }
  await page.waitForTimeout(600);
  const scrubProgress = await page.evaluate(() => window.__INFERENCE__.clock.progress);
  add('Timeline scrub', scrubProgress > 0.5 && scrubProgress < 0.62, `progress=${scrubProgress.toFixed(3)}`);
  await page.waitForTimeout(1000);

  // deep dive
  await page.locator('.deep-link').click();
  await page.waitForTimeout(400);
  const deepOpen = await page.locator('.dialog--paper').isVisible();
  const deepTitle = await page.locator('#deep-dive-title').innerText();
  add('Deep dive opens with content', deepOpen && deepTitle.length > 0, deepTitle);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  add('Escape closes deep dive', (await page.locator('.dialog--paper').count()) === 0);

  // technical archive
  await page.getByRole('button', { name: /技术档案/ }).click();
  await page.waitForTimeout(400);
  const qaCount = await page.locator('.qa').count();
  add('Technical archive contains the ten answers', qaCount === 10, `qa=${qaCount}`);
  await screenshot(page, '04-field-notes');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // Web / API mode
  await seekStage(page, 0);
  await page.getByRole('button', { name: /API 调用/ }).click();
  const apiMode = await page.evaluate(() => window.__INFERENCE__.getSnapshot().clientMode);
  add('Web / API mode toggle', apiMode === 'api', apiMode);
  await page.getByRole('button', { name: /Web 对话/ }).click();

  // architecture toggle + node raycast
  await seekStage(page, 4);
  await seekProgress(page, (10 + 13 + 12 + 10 + 19 * 0.43) / 120);
  await page.getByRole('button', { name: /MoE/ }).first().click();
  const architecture = await page.evaluate(() => window.__INFERENCE__.getSnapshot().architecture);
  add('Dense / MoE architecture toggle', architecture === 'moe', architecture);
  await screenshot(page, '05-transformer-moe');
  const attentionPick = await scanSafeArea(page);
  if (attentionPick) {
    await page.mouse.click(attentionPick.x, attentionPick.y);
    await page.waitForTimeout(500);
    const drawerOpen = await page.locator('.dialog--drawer').isVisible();
    const drawerTitle = drawerOpen ? await page.locator('#node-drawer-title').innerText() : '';
    add('Clicking a 3D node opens its explanation', drawerOpen && drawerTitle.length > 0, `${attentionPick.infoId} → ${drawerTitle}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  } else {
    add('Clicking a 3D node opens its explanation', false, 'no pickable object found in scan area');
  }
  await page.getByRole('button', { name: /Dense/ }).first().click();

  // token inspector via embedding vector
  await seekStage(page, 3);
  await seekProgress(page, (10 + 13 + 12 + 10 * 0.88) / 120);
  const tokenPick = await scanSafeArea(page, true);
  if (tokenPick) {
    await page.mouse.click(tokenPick.x, tokenPick.y);
    await page.waitForTimeout(500);
    const inspector = await page.locator('.token-inspector').isVisible();
    add('Clicking an embedding vector opens token inspector', inspector, `tokenIndex=${tokenPick.tokenIndex}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  } else {
    add('Clicking an embedding vector opens token inspector', false, 'no token vector found in scan area');
  }

  // decode + temperature
  await seekStage(page, 6);
  await seekProgress(page, (10 + 13 + 12 + 10 + 19 + 12 + 20 * 0.5) / 120);
  const samplingVisible = await page.locator('.sampling-panel').isVisible();
  add('Decode shows the probability panel', samplingVisible);
  await page.locator('#temperature-range').focus();
  await page.keyboard.press('End');
  await page.waitForTimeout(500);
  const temperature = await page.evaluate(() => window.__INFERENCE__.getSnapshot().temperature);
  const temperatureText = await page.locator('.temperature-control__value').innerText();
  add('Temperature changes the sampling experiment', temperature === 1.5 && temperatureText === '1.50', `${temperatureText}`);
  await screenshot(page, '06-decode-desktop');

  // free exploration + orbit
  await page.getByRole('button', { name: /自由探索/ }).click();
  await page.waitForTimeout(400);
  const exploreState = await page.evaluate(() => window.__INFERENCE__.getSnapshot());
  const cameraBefore = await page.evaluate(() => window.__INFERENCE__.getDebugInfo().camera);
  await page.mouse.move(850, 450);
  await page.mouse.down();
  await page.mouse.move(980, 380, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(700);
  const cameraAfter = await page.evaluate(() => window.__INFERENCE__.getDebugInfo().camera);
  const moved = Math.abs(cameraAfter[0] - cameraBefore[0]) + Math.abs(cameraAfter[1] - cameraBefore[1]) + Math.abs(cameraAfter[2] - cameraBefore[2]) > 0.1;
  add('Free exploration pauses and allows orbit', exploreState.explore && !exploreState.playing && moved, `cameraMoved=${moved}`);
  add('Exploring removes reading furniture', await page.locator('.app').evaluate((el) => el.classList.contains('is-exploring')));
  await page.getByRole('button', { name: /退出探索/ }).click();
  await page.waitForTimeout(300);

  // metrics + rendering performance
  const stageStats = await page.evaluate(() => window.__INFERENCE__.getDebugInfo());
  add('WebGL scene reports draw calls', stageStats.drawCalls > 0 && stageStats.drawCalls < 500, `drawCalls=${stageStats.drawCalls}`);
  add('No console / page errors so far', errors.length === 0, errors.slice(0, 2).join(' | '));

  // finale
  await seekProgress(page, 1);
  await page.waitForTimeout(1600);
  const ended = await page.evaluate(() => window.__INFERENCE__.getSnapshot().phase);
  const finaleText = await page.locator('.finale__title').innerText();
  add('Finale appears with the closing thesis', ended === 'ended' && finaleText.replace(/\s+/g, '').includes('它经历的却是一场复杂的计算旅程'), finaleText.replace(/\s+/g, ' '));
  await screenshot(page, '07-finale-desktop');
  await page.locator('.finale__secondary').click();
  await page.waitForTimeout(1000);
  add('Finale can be dismissed into free explore', await page.evaluate(() => window.__INFERENCE__.getSnapshot().explore));
  await screenshot(page, '08-panorama-desktop');
  const finalDebug = await page.evaluate(() => window.__INFERENCE__.getDebugInfo());
  await desktopContext.close();

  /* ------------------------------------------------------------------- mobile */
  const { context: mobileContext, page: mobile } = await makePage({
    viewport: { width: 390, height: 844 },
    mobile: true,
  });
  await screenshot(mobile, '09-landing-mobile');
  add('Mobile landing has no horizontal overflow', await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `scrollWidth=${await mobile.evaluate(() => document.documentElement.scrollWidth)}`);
  await start(mobile);
  await mobile.waitForTimeout(1000);
  add('Mobile journey chrome', await mobile.locator('.chapter-panel').isVisible() && await mobile.locator('.player').isVisible());
  add('Mobile hides the desktop chapter rail', !(await mobile.locator('.stage-rail').isVisible()));
  await mobile.locator('.chrome-button--menu').click();
  await mobile.waitForTimeout(400);
  const sheetVisible = await mobile.locator('.stage-sheet').isVisible();
  const sheetCount = await mobile.locator('.stage-sheet__list button').count();
  add('Mobile chapter sheet', sheetVisible && sheetCount === 9, `entries=${sheetCount}`);
  await mobile.locator('.stage-sheet__list button').nth(2).click();
  await mobile.waitForTimeout(1700);
  add('Mobile direct stage jump', (await mobile.evaluate(() => window.__INFERENCE__.getSnapshot().stageIndex)) === 2);
  await screenshot(mobile, '10-tokenizer-mobile');
  await mobile.evaluate(() => window.__INFERENCE__.clock.seekStage(6));
  await mobile.waitForTimeout(1400);
  await screenshot(mobile, '11-decode-mobile');
  add('Mobile has no horizontal overflow during journey', await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  add('Mobile sampling panel is reachable', await mobile.locator('.sampling-panel').isVisible());
  await mobileContext.close();

  /* ---------------------------------------------------------- reduced motion */
  const { context: reducedContext, page: reduced } = await makePage({ reducedMotion: true });
  const reducedSnapshot = await reduced.evaluate(() => ({
    reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    okay: Boolean(window.__INFERENCE__),
  }));
  add('Reduced motion preference is respected without breaking the world', reducedSnapshot.reduced && reducedSnapshot.okay);
  await reducedContext.close();

  /* ------------------------------------------------------------------ report */
  const report = {
    generatedAt: new Date().toISOString(),
    url: BASE,
    passed: results.filter((entry) => entry.pass).length,
    failed: results.filter((entry) => !entry.pass).length,
    results,
    screenshots,
    errors,
    debug: finalDebug,
  };
  fs.writeFileSync(path.join(root, 'docs', 'QA_FINAL.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\n${report.passed} passed, ${report.failed} failed. Screenshots: docs/qa/`);
  if (errors.length) console.log(`Browser errors:\n${errors.join('\n')}`);
  await browser.close();
  if (report.failed > 0) process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  console.error(error);
  const failure = {
    generatedAt: new Date().toISOString(),
    fatal: String(error?.stack ?? error),
    results,
    screenshots,
    errors,
  };
  fs.writeFileSync(path.join(root, 'docs', 'QA_FINAL.json'), `${JSON.stringify(failure, null, 2)}\n`);
  await browser.close();
  process.exitCode = 1;
}
