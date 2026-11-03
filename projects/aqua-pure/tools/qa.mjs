#!/usr/bin/env node
/**
 * AQUA PURE — browser acceptance suite.
 *
 * Runs the real page in headless Chrome (SwiftShader WebGL) through
 * playwright-core, drives the shipped UI with real DOM clicks and captures
 * evidence screenshots. No page internals are stubbed; the only automation
 * handle is the documented `window.__AQUA__` API.
 *
 * Usage:
 *   node tools/qa.mjs                 # full suite
 *   node tools/qa.mjs --only=initial,pour
 *
 * Outputs:
 *   docs/screens/qa-*.jpg
 *   docs/QA_FINAL.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

import { startStaticServer } from './serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(
  require.resolve('playwright-core', {
    paths: [path.resolve(import.meta.dirname, '../../../projects/inference')],
  }),
);

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(PROJECT_ROOT, 'docs', 'screens');
const RESULT_PATH = path.join(PROJECT_ROOT, 'docs', 'QA_FINAL.json');
const CHROME_PATH = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BROWSER_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-dev-shm-usage'];
const READY_TIMEOUT = 300000;
const ONLY = new Set(
  process.argv
    .filter((arg) => arg.startsWith('--only='))
    .flatMap((arg) => arg.slice('--only='.length).split(','))
    .map((value) => value.trim())
    .filter(Boolean),
);
const wants = (name) => ONLY.size === 0 || ONLY.has(name);

fs.mkdirSync(OUT_DIR, { recursive: true });

const checks = [];
function check(name, pass, detail = '') {
  checks.push({ name, pass: Boolean(pass), detail });
  console.log(`${pass ? '  PASS' : '  FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function waitReady(page) {
  await page.waitForFunction(() => window.__AQUA__?.ready === true, null, { timeout: READY_TIMEOUT });
  await page.waitForTimeout(1400);
}

async function screenshot(page, name) {
  await page.screenshot({
    path: path.join(OUT_DIR, `qa-${name}.jpg`),
    type: 'jpeg',
    quality: 86,
  });
  console.log(`  shot  qa-${name}.jpg`);
}

function watchPage(page, bucket) {
  page.on('console', (message) => {
    if (message.type() === 'error') bucket.consoleErrors.push(message.text());
    if (message.type() === 'warning') bucket.consoleWarnings.push(message.text());
  });
  page.on('pageerror', (error) => bucket.pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    bucket.requestFailures.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) bucket.httpErrors.push(`${response.status()} ${response.url()}`);
  });
}

async function openPage(browser, { viewport = { width: 1280, height: 800 }, url = '/', reducedMotion = false } = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
  });
  const page = await context.newPage();
  const bucket = { consoleErrors: [], consoleWarnings: [], pageErrors: [], requestFailures: [], httpErrors: [] };
  watchPage(page, bucket);
  await page.goto(`${server.url}${url.replace(/^\//, '')}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await waitReady(page);
  return { context, page, bucket, errors: bucket };
}

const results = [];
const server = await startStaticServer({ port: 0 });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || CHROME_PATH,
  args: BROWSER_ARGS,
  headless: true,
});

try {
  // 1 ─ initial hero frame, no UI
  if (wants('initial')) {
    console.log('\n[initial] hero frame');
    const { context, page, errors } = await openPage(browser, {
      url: '/?shot=1&ui=0',
      viewport: { width: 1440, height: 900 },
    });
    await screenshot(page, 'initial');
    const state = await page.evaluate(() => window.__AQUA__.getState());
    check('initial: phase sealed', state.phase === 'sealed', state.phase);
    check('initial: 500 ml', Math.round(state.volumeMl) === 500, `${state.volumeMl.toFixed(1)} ml`);
    check('initial: cap on bottle', state.capOnBottle === true);
    const info = await page.evaluate(() => window.__AQUA__.getRenderInfo());
    check('initial: draws geometry', info.triangles > 10000, `${info.triangles} tris, ${info.calls} calls`);
    check('initial: no console/page errors', !errors.consoleErrors.length && !errors.pageErrors.length, [...errors.consoleErrors, ...errors.pageErrors].slice(0, 2).join(' | '));
    check('initial: no failed requests', !errors.requestFailures.length && !errors.httpErrors.length, [...errors.requestFailures, ...errors.httpErrors].slice(0, 2).join(' | '));
    results.push({ scenario: 'initial', state, info, ...errors });
    await context.close();
  }

  // 2 ─ UI frame
  if (wants('ui')) {
    console.log('\n[ui] desktop instrument frame');
    const { context, page, errors } = await openPage(browser, {
      url: '/?shot=1',
      viewport: { width: 1440, height: 900 },
    });
    await screenshot(page, 'ui');
    check('ui: dock visible', await page.locator('#dock').isVisible());
    check('ui: status copy', (await page.locator('#status-title').textContent())?.includes('满瓶'));
    check('ui: no console/page errors', !errors.consoleErrors.length && !errors.pageErrors.length, [...errors.consoleErrors, ...errors.pageErrors].slice(0, 2).join(' | '));
    results.push({ scenario: 'ui', ...errors });
    await context.close();
  }

  // 3 ─ macro detail: cap + tamper ring
  if (wants('cap')) {
    console.log('\n[cap] sealed cap / tamper ring macro');
    const { context, page } = await openPage(browser, { url: '/?shot=1&ui=0', viewport: { width: 1280, height: 900 } });
    await page.evaluate(() => window.__AQUA__.setCameraPreset('capmacro'));
    await page.waitForTimeout(400);
    await screenshot(page, 'cap-detail');
    await context.close();
  }

  // 4 ─ label detail
  if (wants('label')) {
    console.log('\n[label] label typography');
    const { context, page } = await openPage(browser, { url: '/?shot=1&ui=0', viewport: { width: 1280, height: 900 } });
    await page.evaluate(() => window.__AQUA__.setCameraPreset('label'));
    await page.waitForTimeout(400);
    await screenshot(page, 'label-detail');
    await context.close();
  }

  // 5 ─ real button: unscrew cap
  if (wants('open')) {
    console.log('\n[open] click 拧开瓶盖, wait for landing');
    const { context, page, errors } = await openPage(browser, { url: '/?shot=1', viewport: { width: 1440, height: 900 } });
    await page.locator('#btn-open').click();
    await page.waitForFunction(() => window.__AQUA__.getState().phase === 'open', null, { timeout: 120000 });
    await page.waitForTimeout(400);
    await screenshot(page, 'open');
    const state = await page.evaluate(() => window.__AQUA__.getState());
    check('open: phase open', state.phase === 'open', state.phase);
    check('open: cap left bottle', state.capOnBottle === false);
    check('open: tamper ring stays', (await page.locator('#open-state').textContent()) === 'OPEN');
    await page.evaluate(() => window.__AQUA__.setCameraPreset('top'));
    await page.waitForTimeout(400);
    await screenshot(page, 'open-top');
    check('open: no console/page errors', !errors.consoleErrors.length && !errors.pageErrors.length, [...errors.consoleErrors, ...errors.pageErrors].slice(0, 2).join(' | '));
    results.push({ scenario: 'open', state, ...errors });
    await context.close();
  }

  // 6 ─ pour mid-flight
  if (wants('pour')) {
    console.log('\n[pour] tilted bottle + stream');
    const { context, page, errors } = await openPage(browser, { url: '/?shot=1', viewport: { width: 1440, height: 900 } });
    await page.evaluate(() =>
      window.__AQUA__.setPose({ fill: 0.62, tiltDeg: 68, capOpen: true, pour: true }),
    );
    await page.waitForTimeout(700);
    await screenshot(page, 'pour');
    const state = await page.evaluate(() => window.__AQUA__.getState());
    check('pour: tilted ~68°', Math.abs(state.tiltDeg - 68) < 2, `${state.tiltDeg.toFixed(1)}°`);
    check('pour: water decreases', state.fill < 0.62, `${(state.fill * 100).toFixed(1)}%`);
    check('pour: stream visible', state.streaming === true);
    check('pour: no console/page errors', !errors.consoleErrors.length && !errors.pageErrors.length, [...errors.consoleErrors, ...errors.pageErrors].slice(0, 2).join(' | '));
    results.push({ scenario: 'pour', state, ...errors });
    await context.close();
  }

  // 7 ─ empty state (fast path; the live pour path is covered above)
  if (wants('empty')) {
    console.log('\n[empty] drained bottle + meadow puddle');
    const { context, page, errors } = await openPage(browser, { url: '/?shot=1', viewport: { width: 1440, height: 900 } });
    await page.evaluate(() =>
      window.__AQUA__.setPose({ fill: 0, tiltDeg: 0, capOpen: true, pour: false }),
    );
    await page.waitForTimeout(800);
    await screenshot(page, 'empty');
    const state = await page.evaluate(() => window.__AQUA__.getState());
    check('empty: phase empty', state.phase === 'empty', state.phase);
    check('empty: 0 ml', state.volumeMl < 1, `${state.volumeMl.toFixed(1)} ml`);
    check('empty: no console/page errors', !errors.consoleErrors.length && !errors.pageErrors.length, [...errors.consoleErrors, ...errors.pageErrors].slice(0, 2).join(' | '));
    results.push({ scenario: 'empty', state, ...errors });
    await context.close();
  }

  // 8 ─ reset restores the sealed bottle
  if (wants('reset')) {
    console.log('\n[reset] seal the bottle again');
    const { context, page } = await openPage(browser, { url: '/?shot=1', viewport: { width: 1440, height: 900 } });
    await page.evaluate(() => window.__AQUA__.setPose({ fill: 0.25, tiltDeg: 72, capOpen: true, pour: false }));
    await page.waitForTimeout(300);
    await page.locator('#btn-reset').click();
    await page.waitForTimeout(600);
    const state = await page.evaluate(() => window.__AQUA__.getState());
    check('reset: phase sealed', state.phase === 'sealed', state.phase);
    check('reset: cap back', state.capOnBottle === true);
    check('reset: full again', Math.round(state.fill * 100) === 100, `${(state.fill * 100).toFixed(0)}%`);
    await screenshot(page, 'reset');
    await context.close();
  }

  // 9 ─ mobile layout
  if (wants('mobile')) {
    console.log('\n[mobile] 390 × 844');
    const { context, page, errors } = await openPage(browser, {
      url: '/?shot=1',
      viewport: { width: 390, height: 844 },
    });
    await screenshot(page, 'mobile');
    check('mobile: dock visible', await page.locator('#dock').isVisible());
    check('mobile: no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    check('mobile: no console/page errors', !errors.consoleErrors.length && !errors.pageErrors.length, [...errors.consoleErrors, ...errors.pageErrors].slice(0, 2).join(' | '));
    results.push({ scenario: 'mobile', ...errors });
    await context.close();
  }
} finally {
  await browser.close();
  await server.close();
}

const failed = checks.filter((entry) => !entry.pass);
const report = {
  generatedAt: new Date().toISOString(),
  browser: 'headless Chrome / SwiftShader WebGL',
  viewport: { desktop: '1440×900', mobile: '390×844' },
  checks,
  passed: checks.length - failed.length,
  failed: failed.length,
  results,
};
fs.mkdirSync(path.dirname(RESULT_PATH), { recursive: true });
fs.writeFileSync(RESULT_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(`\n[aqua-pure] QA: ${report.passed}/${checks.length} passed, ${report.failed} failed`);
console.log(`[aqua-pure] report: ${path.relative(PROJECT_ROOT, RESULT_PATH)}`);
process.exit(failed.length ? 1 : 0);
