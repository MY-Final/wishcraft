import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'docs', 'screens');
fs.mkdirSync(out, { recursive: true });

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`[console] ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`[pageerror] ${error.message}`));

const wait = (ms) => page.waitForTimeout(ms);

await page.goto('http://127.0.0.1:5181/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', { timeout: 30000 });
await wait(1400);
await page.screenshot({ path: path.join(out, '00-landing.png') });
console.log('landing ready', await page.evaluate(() => window.__INFERENCE__?.getDebugInfo()));

await page.locator('.start-button').click();
await wait(1900);
await page.locator('.transport-button--play').click();
await wait(600);
await page.screenshot({ path: path.join(out, '01-request.png') });

const stages = [
  { i: 0, p: 0.55, name: '01-request' },
  { i: 1, p: 0.52, name: '02-network' },
  { i: 2, p: 0.55, name: '03-tokenizer' },
  { i: 3, p: 0.58, name: '04-embedding' },
  { i: 4, p: 0.43, name: '05-attention' },
  { i: 4, p: 0.8, name: '05-mlp' },
  { i: 5, p: 0.62, name: '06-prefill' },
  { i: 6, p: 0.48, name: '07-decode' },
  { i: 7, p: 0.5, name: '08-stream' },
  { i: 8, p: 0.38, name: '09-arrival' },
  { i: 8, p: 0.9, name: '10-finale-overview' },
];

const durations = [10, 13, 12, 10, 19, 12, 20, 11, 13];
const total = durations.reduce((a, b) => a + b, 0);
const starts = [];
let acc = 0;
for (const duration of durations) {
  starts.push(acc);
  acc += duration;
}

for (const stage of stages) {
  const progress = (starts[stage.i] + durations[stage.i] * stage.p) / total;
  await page.evaluate((value) => window.__INFERENCE__.clock.seekProgress(value), progress);
  await wait(1800);
  const debug = await page.evaluate(() => ({
    debug: window.__INFERENCE__.getDebugInfo(),
    snapshot: window.__INFERENCE__.getSnapshot(),
    stageText: document.querySelector('.chapter-panel__title')?.textContent,
  }));
  console.log(stage.name, JSON.stringify(debug));
  await page.screenshot({ path: path.join(out, `${stage.name}.png`) });
}

// Interaction smoke: open a node, deep dive, notes, and temperature.
await page.evaluate(() => window.__INFERENCE__.clock.seekProgress(0.52));
await wait(1500);
await page.screenshot({ path: path.join(out, '11-current.png') });
const infoCount = await page.locator('.dialog').count();
const errorsText = errors.length ? errors.join('\n') : 'none';
fs.writeFileSync(path.join(out, 'console-errors.txt'), errorsText);
console.log('dialogs', infoCount, 'errors', errorsText);
await browser.close();
