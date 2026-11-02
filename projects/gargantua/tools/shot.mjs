#!/usr/bin/env node
/**
 * GARGANTUA — single-shot screenshot / smoke harness.
 *
 * A thin wrapper around the public `window.__GARGANTUA__` automation contract,
 * used for quick visual checks while tuning the scene and as a low-level probe
 * for the QA suite. The full acceptance suite lives in `tools/qa.mjs`.
 *
 * Usage:
 *   node tools/shot.mjs --out docs/screens/probe.png
 *   node tools/shot.mjs --width 960 --height 600 --quality high --time 7 \
 *     --url "http://127.0.0.1:5192/?" --out docs/screens/probe.png
 *   node tools/shot.mjs --shot --quality standard --view edge --debug 0 --ui 0 --dpr 1
 *
 * Exit code is non-zero if the page reports an error, a page/console error is
 * collected, or the ready signal never arrives.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require(
  require.resolve('playwright-core', {
    paths: [path.resolve(import.meta.dirname, '../../../projects/inference')],
  }),
);

const projectRoot = path.resolve(import.meta.dirname, '..');
const screensDir = path.join(projectRoot, 'docs', 'screens');

function parseArgs(argv) {
  const options = {
    base: process.env.GARGANTUA_URL ?? 'http://127.0.0.1:5192/',
    url: null,
    out: path.join(screensDir, 'shot.png'),
    width: 960,
    height: 600,
    dpr: 1,
    shot: false,
    quality: 'standard',
    view: 'edge',
    debug: 0,
    time: 7,
    ui: 0,
    timeout: 240000,
    settle: 400,
    json: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => argv[++index];
    if (arg === '--base') options.base = next();
    else if (arg === '--url') options.url = next();
    else if (arg === '--out') options.out = path.resolve(next());
    else if (arg === '--width') options.width = Number(next());
    else if (arg === '--height') options.height = Number(next());
    else if (arg === '--dpr') options.dpr = Number(next());
    else if (arg === '--quality') options.quality = next();
    else if (arg === '--view') options.view = next();
    else if (arg === '--debug') options.debug = Number(next());
    else if (arg === '--time') options.time = Number(next());
    else if (arg === '--ui') options.ui = Number(next());
    else if (arg === '--timeout') options.timeout = Number(next());
    else if (arg === '--settle') options.settle = Number(next());
    else if (arg === '--shot') options.shot = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else {
      console.error(`[shot] unknown argument: ${arg}`);
      options.invalid = true;
    }
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));
if (options.help || options.invalid) {
  console.log('Usage: node tools/shot.mjs [--out file.png] [--width 960] [--height 600] [--quality standard] ...');
  process.exit(options.invalid ? 2 : 0);
}

let url = options.url;
if (!url) {
  const query = new URLSearchParams();
  if (options.shot) query.set('shot', '1');
  query.set('quality', options.quality);
  query.set('view', options.view);
  query.set('debug', String(options.debug));
  query.set('dpr', String(options.dpr));
  query.set('time', String(options.time));
  if (options.shot && !options.ui) query.set('ui', '0');
  url = `${options.base.replace(/\?.*$/, '')}?${query.toString()}`;
}

fs.mkdirSync(path.dirname(options.out), { recursive: true });

const chrome =
  process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const context = await browser.newContext({
  viewport: { width: options.width, height: options.height },
  deviceScaleFactor: options.dpr,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(`[pageerror] ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`[console] ${message.text()}`);
});
page.on('response', (response) => {
  if (response.status() >= 400) errors.push(`[http ${response.status()}] ${response.url()}`);
});

const started = Date.now();
let readyMs = null;
try {
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', undefined, {
    timeout: options.timeout,
  });
  readyMs = Date.now() - started;
} catch (error) {
  errors.push(`[ready] ${error.message}`);
}
if (options.settle > 0) await page.waitForTimeout(options.settle);

const diagnostics = await page.evaluate(() => {
  const api = window.__GARGANTUA__;
  const canvas = document.querySelector('#gl');
  const gl = canvas?.getContext('webgl2');
  let pixels = null;
  if (api?.screenshot) {
    try {
      const data = api.screenshot();
      const width = canvas?.width ?? 0;
      const height = canvas?.height ?? 0;
      const scratch = document.createElement('canvas');
      scratch.width = Math.max(1, Math.round(width / 4));
      scratch.height = Math.max(1, Math.round(height / 4));
      const ctx = scratch.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(canvas, 0, 0, scratch.width, scratch.height);
      const image = ctx.getImageData(0, 0, scratch.width, scratch.height).data;
      let nonBlack = 0;
      let bright = 0;
      let max = 0;
      let sum = 0;
      for (let i = 0; i < image.length; i += 4) {
        const luma = 0.2126 * image[i] + 0.7152 * image[i + 1] + 0.0722 * image[i + 2];
        if (luma > 6) nonBlack += 1;
        if (luma > 40) bright += 1;
        if (luma > max) max = luma;
        sum += luma;
      }
      const total = image.length / 4;
      pixels = {
        samples: total,
        nonBlackFraction: Number((nonBlack / total).toFixed(4)),
        brightFraction: Number((bright / total).toFixed(4)),
        meanLuma: Number((sum / total).toFixed(2)),
        maxLuma: Number(max.toFixed(1)),
        dataUrlLength: data.length,
        isPng: data.startsWith('data:image/png;base64,'),
      };
    } catch (error) {
      pixels = { error: String(error?.message ?? error) };
    }
  }
  return {
    ready: document.documentElement.dataset.ready,
    dataset: { ...document.documentElement.dataset },
    webgl2: Boolean(gl),
    canvas: canvas ? { width: canvas.width, height: canvas.height } : null,
    version: api?.version,
    state: api?.getState?.(),
    stats: api?.getStats?.(),
    shader: api?.getShaderDiagnostics?.(),
    pixels,
  };
});

await page.screenshot({ path: options.out });
if (diagnostics.pixels?.dataUrlLength) {
  const data = await page.evaluate(() => window.__GARGANTUA__?.screenshot?.() ?? null);
  if (data?.startsWith('data:image/png;base64,')) {
    fs.writeFileSync(
      options.out.replace(/\.png$/i, '') + '-canvas.png',
      Buffer.from(data.split(',')[1], 'base64'),
    );
  }
}
const result = {
  url,
  out: path.relative(projectRoot, options.out).replaceAll('\\', '/'),
  readyMs,
  totalMs: Date.now() - started,
  errors,
  diagnostics,
};
console.log(JSON.stringify(result, null, 2));

// Keep the process honest: exit 1 when anything failed.
await browser.close();
process.exit(errors.length === 0 && diagnostics.ready === 'true' ? 0 : 1);
