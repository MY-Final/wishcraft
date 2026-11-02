#!/usr/bin/env node
/**
 * GARGANTUA — site cover generator.
 *
 * Renders the finished raytraced frame through the documented screenshot
 * contract and writes the portfolio cover:
 *
 *   site/assets/covers/gargantua.jpg   1600 × 1000, JPEG q≈82–88
 *
 * The image is the canvas only — no HUD, no browser chrome — captured at
 * `?shot=1&quality=high&view=edge&debug=0&ui=0&dpr=1&time=7`, which freezes the
 * simulation clock and the camera on the authored edge-on preset so the cover
 * is reproducible.
 *
 * The pixel render is a PNG data URL (lossless); JPEG encoding happens inside
 * the same headless Chrome via canvases, so no image library is required.
 *
 * Usage:
 *   node tools/cover.mjs
 *   node tools/cover.mjs --quality 86 --time 7
 *   node tools/cover.mjs --base http://127.0.0.1:5192/ --out site/assets/covers/gargantua.jpg
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

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const REPO_ROOT = path.resolve(PROJECT_ROOT, '..', '..');
const SCREENS_DIR = path.join(PROJECT_ROOT, 'docs', 'screens');
const CHROME_PATH =
  process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

function parseArgs(argv) {
  const options = {
    width: 1600,
    height: 1000,
    quality: 86,
    time: 7,
    out: path.join(REPO_ROOT, 'site', 'assets', 'covers', 'gargantua.jpg'),
    base: null,
    timeout: 600000,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => argv[++index];
    if (arg === '--width') options.width = Number(next());
    else if (arg === '--height') options.height = Number(next());
    else if (arg === '--quality') options.quality = Number(next());
    else if (arg === '--time') options.time = Number(next());
    else if (arg === '--out') options.out = path.resolve(next());
    else if (arg === '--base') options.base = next();
    else if (arg === '--timeout') options.timeout = Number(next());
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
    'Usage: node tools/cover.mjs [--width 1600] [--height 1000] [--quality 86] [--time 7] [--out site/assets/covers/gargantua.jpg] [--base http://127.0.0.1:5192/]',
  );
  process.exit(options.invalid ? 2 : 0);
}
if (!Number.isFinite(options.width) || !Number.isFinite(options.height) || !Number.isFinite(options.quality)) {
  console.error('[cover] invalid numeric argument');
  process.exit(2);
}

// A private static server keeps the cover independent of the dev server on :5192.
let server = null;
let baseUrl = options.base;
if (!baseUrl) {
  const { startStaticServer } = await import('./serve.mjs');
  server = await startStaticServer({ root: PROJECT_ROOT, port: 0 });
  baseUrl = server.url;
}
const base = baseUrl.replace(/\?.*$/, '').replace(/\/?$/, '/');
const shotUrl =
  `${base}?shot=1&quality=high&view=edge&debug=0&ui=0&dpr=1&time=${encodeURIComponent(options.time)}`;

const browser = await chromium.launch({
  executablePath: CHROME_PATH,
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

const startedAt = Date.now();
const errors = [];
let exitCode = 0;

try {
  fs.mkdirSync(path.dirname(options.out), { recursive: true });
  fs.mkdirSync(SCREENS_DIR, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: options.width, height: options.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`[pageerror] ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`[console] ${message.text()}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`[http ${response.status()}] ${response.url()}`);
  });

  await page.goto(shotUrl, { waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', undefined, {
    timeout: options.timeout,
    polling: 100,
  });
  // Let the shot frame settle (the app renders `frames` deterministic frames).
  await page.waitForTimeout(600);

  const png = await page.evaluate(() => {
    const api = window.__GARGANTUA__;
    if (!api || typeof api.screenshot !== 'function') throw new Error('__GARGANTUA__.screenshot missing');
    return api.screenshot();
  });
  if (typeof png !== 'string' || !png.startsWith('data:image/png;base64,')) {
    throw new Error('screenshot() did not return a PNG data URL');
  }
  const pngBuffer = Buffer.from(png.slice('data:image/png;base64,'.length), 'base64');
  const pngWidth = pngBuffer.readUInt32BE(16);
  const pngHeight = pngBuffer.readUInt32BE(20);
  if (pngWidth !== options.width || pngHeight !== options.height) {
    throw new Error(`unexpected render size ${pngWidth}×${pngHeight} (expected ${options.width}×${options.height})`);
  }
  fs.writeFileSync(path.join(SCREENS_DIR, 'cover-source.png'), pngBuffer);

  // Encode JPEG inside the browser (no native image dependency).
  const encodeContext = await browser.newContext({ viewport: { width: 200, height: 120 } });
  const encodePage = await encodeContext.newPage();
  let encoded = null;
  let usedQuality = options.quality;
  for (const quality of [options.quality, 84, 82, 88, 80, 78, 90, 92]) {
    encoded = await encodePage.evaluate(
      async ({ src, quality: q, width, height }) => {
        const loadImage = (source) =>
          new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('PNG decode failed'));
            image.src = source;
          });
        const image = await loadImage(src);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height);
        const jpeg = canvas.toDataURL('image/jpeg', q);
        const base64 = jpeg.slice('data:image/jpeg;base64,'.length);
        return { jpeg, base64, bytes: Math.round((base64.length * 3) / 4) };
      },
      { src: png, quality, width: options.width, height: options.height },
    );
    usedQuality = quality;
    if (encoded.bytes >= 100 * 1024 && encoded.bytes <= 400 * 1024) break;
  }
  const jpegBuffer = Buffer.from(encoded.base64, 'base64');
  if (jpegBuffer[0] !== 0xff || jpegBuffer[1] !== 0xd8) throw new Error('JPEG encoder produced invalid data');
  fs.writeFileSync(options.out, jpegBuffer);
  await encodeContext.close();

  // Independent verification: decode the written JPEG and sample its pixels.
  const verifyContext = await browser.newContext({ viewport: { width: 400, height: 260 } });
  const verifyPage = await verifyContext.newPage();
  const stats = await verifyPage.evaluate(async (src) => {
    const loadImage = (source) =>
      new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('JPEG decode failed'));
        image.src = source;
      });
    const image = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const width = canvas.width;
    const height = canvas.height;
    let nonBlack = 0;
    let bright = 0;
    let max = 0;
    let sum = 0;
    let cornerSum = 0;
    let cornerCount = 0;
    let centerSum = 0;
    let centerCount = 0;
    let centerDark = 0;
    let centerBoxCount = 0;
    const corner = Math.max(8, Math.round(Math.min(width, height) * 0.06));
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4;
        const luma = 0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2];
        if (luma > 8) nonBlack += 1;
        if (luma > 40) bright += 1;
        if (luma > max) max = luma;
        sum += luma;
        if ((x < corner || x >= width - corner) && (y < corner || y >= height - corner)) {
          cornerSum += luma;
          cornerCount += 1;
        }
        const dx = (x - width / 2) / (width / 2);
        const dy = (y - height / 2) / (height / 2);
        if (dx * dx + dy * dy < 0.03) {
          centerSum += luma;
          centerCount += 1;
        }
        if (Math.abs(dx) < 0.4 && Math.abs(dy) < 0.4) {
          centerBoxCount += 1;
          if (luma < 8) centerDark += 1;
        }
      }
    }
    const total = width * height;
    return {
      width,
      height,
      nonBlackFraction: Number((nonBlack / total).toFixed(4)),
      brightFraction: Number((bright / total).toFixed(4)),
      meanLuma: Number((sum / total).toFixed(2)),
      maxLuma: Number(max.toFixed(1)),
      cornerMeanLuma: Number((cornerSum / Math.max(1, cornerCount)).toFixed(2)),
      centerMeanLuma: Number((centerSum / Math.max(1, centerCount)).toFixed(2)),
      centralDarkFraction: Number((centerDark / Math.max(1, centerBoxCount)).toFixed(4)),
    };
  }, `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`);
  await verifyContext.close();

  const fileSize = jpegBuffer.length;
  const sizeOk = fileSize >= 100 * 1024 && fileSize <= 400 * 1024;
  const dimensionsOk = stats.width === options.width && stats.height === options.height;
  const sceneOk = stats.nonBlackFraction > 0.02 && stats.maxLuma > 120 && stats.cornerMeanLuma < 40;
  const shadowOk = stats.centralDarkFraction > 0.05 && stats.cornerMeanLuma < 15;
  if (!sizeOk) console.warn(`[cover] WARNING: ${(fileSize / 1024).toFixed(1)} KB is outside the 100–400 KB target`);
  if (!sceneOk) console.warn('[cover] WARNING: cover pixel stats look unlike a luminous scene on black');
  if (!shadowOk) console.warn('[cover] WARNING: central shadow/background does not read as deep black');

  console.log(
    JSON.stringify(
      {
        ok: errors.length === 0 && dimensionsOk,
        url: shotUrl,
        out: path.relative(REPO_ROOT, options.out).replaceAll('\\', '/'),
        bytes: fileSize,
        kb: Number((fileSize / 1024).toFixed(1)),
        quality: usedQuality,
        dimensions: `${stats.width}×${stats.height}`,
        sizeOk,
        sceneOk,
        shadowOk,
        stats,
        errors,
        ms: Date.now() - startedAt,
      },
      null,
      2,
    ),
  );
  if (errors.length) exitCode = 1;
} catch (error) {
  console.error('[cover] failed:', error);
  errors.push(String(error?.stack ?? error));
  exitCode = 1;
} finally {
  await browser.close().catch(() => {});
  if (server) await server.close().catch(() => {});
}

process.exit(exitCode);
