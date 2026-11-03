#!/usr/bin/env node
/**
 * AQUA PURE — site cover generator.
 *
 * Captures the shipped scene in headless Chrome through the documented
 * `?shot=1&ui=0` screenshot contract and writes:
 *
 *   site/assets/covers/aqua-pure.jpg      1600 × 1000, JPEG
 *
 * Usage:
 *   node tools/cover.mjs
 *   node tools/cover.mjs --width 1600 --height 1000 --quality 88
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
const REPO_ROOT = path.resolve(PROJECT_ROOT, '..', '..');
const CHROME_PATH = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

function parseArgs(argv) {
  const options = {
    width: 1600,
    height: 1000,
    quality: 88,
    out: path.join(REPO_ROOT, 'site', 'assets', 'covers', 'aqua-pure.jpg'),
    preset: 'hero',
    pose: '',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => argv[++index];
    if (arg === '--width') options.width = Number(next());
    else if (arg === '--height') options.height = Number(next());
    else if (arg === '--quality') options.quality = Number(next());
    else if (arg === '--out') options.out = path.resolve(next());
    else if (arg === '--preset') options.preset = next();
    else if (arg === '--pose') options.pose = next();
    else if (arg === '--help' || arg === '-h') options.help = true;
    else {
      console.error(`[cover] unknown argument: ${arg}`);
      options.invalid = true;
    }
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));
if (options.help || options.invalid) {
  console.log(
    'Usage: node tools/cover.mjs [--width 1600] [--height 1000] [--quality 88] [--preset hero] [--pose open|pour|empty] [--out site/assets/covers/aqua-pure.jpg]',
  );
  process.exit(options.invalid ? 2 : 0);
}

const server = await startStaticServer({ port: 0 });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || CHROME_PATH,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  headless: true,
});

try {
  const page = await browser.newPage({
    viewport: { width: options.width, height: options.height },
    deviceScaleFactor: 1,
  });
  page.on('pageerror', (error) => console.warn('[cover] pageerror:', error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') console.warn('[cover] console error:', message.text());
  });
  const pose = options.pose ? `&pose=${encodeURIComponent(options.pose)}` : '';
  const url = `${server.url}?shot=1&ui=0${pose}`;
  console.log(`[cover] ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__AQUA__?.ready === true, null, { timeout: 300000 });
  await page.evaluate((preset) => window.__AQUA__.setCameraPreset(preset), options.preset);
  await page.waitForTimeout(900);
  fs.mkdirSync(path.dirname(options.out), { recursive: true });
  await page.screenshot({ path: options.out, type: 'jpeg', quality: options.quality });
  console.log(`[cover] saved ${path.relative(REPO_ROOT, options.out)}`);
} finally {
  await browser.close();
  await server.close();
}
