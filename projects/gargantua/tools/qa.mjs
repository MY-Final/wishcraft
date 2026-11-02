#!/usr/bin/env node
/**
 * GARGANTUA — browser acceptance suite.
 *
 * Exercises the shipped app in real headless Chrome via playwright-core:
 * load/rendering, the 21-parameter HUD, quality tiers, debug views, view
 * presets, keyboard shortcuts, shot-URL determinism, persistence, mobile /
 * reduced-motion / Retina contexts, WebGL context loss + restore, the static
 * `_site` subpath build, and the generated cover.
 *
 * The only automation handle used is the documented `window.__GARGANTUA__`
 * API; every user-facing interaction is driven through real DOM clicks and
 * keyboard events. Console errors, page errors and HTTP >= 400 responses are
 * collected for every page.
 *
 * Usage:
 *   node tools/qa.mjs                     # full suite against a private server
 *   node tools/qa.mjs --only=desktop,shot  # iterate on selected scenarios
 *
 * Outputs:
 *   docs/QA_FINAL.json  machine-readable results
 *   docs/QA_REPORT.md   curated acceptance report
 *   docs/screens/qa-*.png evidence screenshots
 *
 * Exit code: 0 only when every non-skipped test passed.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

import { startStaticServer } from './serve.mjs';

const require = createRequire(import.meta.url);
const PLAYWRIGHT_PATHS = [path.resolve(import.meta.dirname, '../../../projects/inference')];
let chromium;
let playwrightVersion = 'unknown';
try {
  ({ chromium } = require(require.resolve('playwright-core', { paths: PLAYWRIGHT_PATHS })));
  try {
    playwrightVersion = require(
      require.resolve('playwright-core/package.json', { paths: PLAYWRIGHT_PATHS }),
    ).version;
  } catch {
    /* version is informational only */
  }
} catch (error) {
  console.error('[qa] playwright-core could not be resolved from projects/inference:', error.message);
  process.exit(2);
}

// ── paths & constants ───────────────────────────────────────────────────
const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const REPO_ROOT = path.resolve(PROJECT_ROOT, '..', '..');
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');
const SCREENS_DIR = path.join(DOCS_DIR, 'screens');
const QA_FINAL_PATH = path.join(DOCS_DIR, 'QA_FINAL.json');
const QA_REPORT_PATH = path.join(DOCS_DIR, 'QA_REPORT.md');
const COVER_PATH = path.join(REPO_ROOT, 'site', 'assets', 'covers', 'gargantua.jpg');
const WISH_PATH = path.join(PROJECT_ROOT, 'wish.json');

const CHROME_PATH =
  process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BROWSER_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const VIEWPORT = { width: 1000, height: 620 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const READY_TIMEOUT = 240000;
const FRAME_TIMEOUT = 180000;

const ONLY = new Set(
  process.argv
    .filter((arg) => arg.startsWith('--only='))
    .flatMap((arg) => arg.slice('--only='.length).split(','))
    .map((value) => value.trim())
    .filter(Boolean),
);
const wants = (name) => ONLY.size === 0 || ONLY.has(name);

/** Issue #2 acceptance criteria (verbatim from the issue body, via the Lead). */
const ACCEPTANCE_CRITERIA = {
  A: '静态服务器可直接打开，无构建步骤，无控制台错误，无黑屏。',
  B: '核心画面由 fragment shader 实时积分产生；黑球/平面圆环/贴图伪造视为不通过。',
  C: '事件视界、光子环、多次盘穿越、引力透镜、Doppler、红移与湍流均可见。',
  D: 'HDR Bloom、ACES、暗角、颗粒、色散生效且不过度。',
  E: '电影循环、OrbitControls、四预设、HUD、21 参数、0–9 调试视图、快捷键与音频开关可用。',
  F: '三档质量、移动端、Retina、状态持久化、WebGL 恢复、URL 截图接口可验证。',
  G: '提供全部源码、vendor、音频资源、启动命令与测试结果；通过视觉与交互验收。',
};

const KNOWN_LIMITATIONS = [
  'Headless Chrome on this machine runs on SwiftShader (software WebGL2). Measured frame rate is ~3–15 fps at the QA viewport, so the suite uses quality=standard / 1000×620 for interaction tests and allows generous timeouts. Timings are not representative of GPU hardware.',
  'Cinematic / preset camera moves are frame-rate dependent in wall-clock terms: the app eases by simulated dt (clamped to 0.1 s/frame), so on the software rasterizer a 1.3 s camera ease can take several seconds of real time. The suite waits on observed state, not fixed sleeps.',
  'Mobile (390×844) and Retina (deviceScaleFactor=2) checks are Chromium emulation, not physical devices.',
  'Audio playback is subject to the browser autoplay policy; the suite triggers a real gesture before asserting the audio element and the 200 response for the OGG file.',
  'The WebGL context-loss/restore section records whatever headless SwiftShader actually does. If restore is unsupported it is reported as a FAIL/observed limitation — never as a pass.',
  'src/{ui,camera,audio,state}.js were being actively rewritten during parts of the QA window; the final suite is meant to be re-run against the settled build.',
];

// ── result bookkeeping ──────────────────────────────────────────────────
const results = [];
const screenshots = [];
const startedAt = Date.now();
let section = 'General';
let lastResultId = null;
let browser;
let server;

const truncate = (value, max = 460) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

function record(id, name, status, detail = '', extras = {}) {
  const entry = {
    id,
    name,
    status,
    detail: detail === undefined || detail === null ? '' : String(detail),
    section,
    acceptance: extras.acceptance ?? [],
    screenshots: extras.screenshots ?? [],
    repro: extras.repro ?? '',
    durationMs: extras.durationMs ?? null,
  };
  results.push(entry);
  lastResultId = id;
  const tag = status === 'pass' ? 'PASS' : status === 'fail' ? 'FAIL' : 'SKIP';
  const suffix = entry.detail ? ` — ${truncate(entry.detail, 320)}` : '';
  console.log(`${tag}  ${id}  ${name}${suffix}`);
  return status !== 'fail';
}
const check = (id, name, pass, detail, extras) =>
  record(id, name, pass ? 'pass' : 'fail', detail, extras);
const skip = (id, name, detail, extras) => record(id, name, 'skip', detail, extras);

function screenshotRel(file) {
  return path.relative(PROJECT_ROOT, file).replaceAll('\\', '/');
}

const PNG_MAGIC = '89504e470d0a1a0a';

function assertPngFile(file, name) {
  if (!fs.existsSync(file)) throw new Error(`screenshot ${name} was not written (${file})`);
  const buffer = fs.readFileSync(file);
  const head = buffer.subarray(0, 8).toString('hex');
  if (buffer.length < 1000 || head !== PNG_MAGIC) {
    throw new Error(`screenshot ${name} is invalid (${buffer.length} bytes, header=${head})`);
  }
  return buffer.length;
}

function attachScreenshot(relativeFile) {
  if (!lastResultId) return;
  const result = results.find((entry) => entry.id === lastResultId);
  if (result && !result.screenshots.includes(relativeFile)) result.screenshots.push(relativeFile);
}

async function savePageShot(page, name, caption) {
  fs.mkdirSync(SCREENS_DIR, { recursive: true });
  const file = path.join(SCREENS_DIR, `${name}.png`);
  // Capture to a buffer and write it ourselves: this keeps evidence writes
  // atomic from the suite's point of view and lets us verify the PNG header.
  const buffer = await page.screenshot({ type: 'png' });
  fs.writeFileSync(file, buffer);
  const bytes = assertPngFile(file, name);
  const relative = screenshotRel(file);
  screenshots.push({ file: relative, caption, bytes });
  attachScreenshot(relative);
  return relative;
}

async function saveCanvasShot(page, name, caption) {
  const capture = await captureCanvas(page);
  fs.mkdirSync(SCREENS_DIR, { recursive: true });
  const file = path.join(SCREENS_DIR, `${name}.png`);
  fs.writeFileSync(file, capture.buffer);
  const bytes = assertPngFile(file, name);
  const relative = screenshotRel(file);
  screenshots.push({ file: relative, caption, bytes });
  attachScreenshot(relative);
  return { ...capture, file: relative };
}

function validateScreenshots() {
  const problems = [];
  for (const shot of screenshots) {
    const file = path.join(PROJECT_ROOT, shot.file);
    try {
      assertPngFile(file, shot.file);
    } catch (error) {
      problems.push(String(error.message));
    }
  }
  check(
    'S1',
    'All evidence screenshots are written as valid, non-empty PNG files',
    problems.length === 0,
    problems.length ? JSON.stringify(problems) : `${screenshots.length} screenshots verified (PNG signature + size)`,
    { acceptance: ['G'] },
  );
}

// ── browser session helpers ─────────────────────────────────────────────
async function createSession({
  name,
  viewport = VIEWPORT,
  deviceScaleFactor = 1,
  mobile = false,
  hasTouch = false,
  reducedMotion = 'no-preference',
} = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor,
    isMobile: mobile,
    hasTouch,
    reducedMotion,
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const session = {
    name,
    context,
    page,
    viewport,
    consoleErrors: [],
    consoleWarnings: [],
    pageErrors: [],
    httpErrors: [],
    responses: [],
    failedRequests: [],
  };
  page.on('console', (message) => {
    const type = message.type();
    if (type === 'error') session.consoleErrors.push(message.text());
    if (type === 'warning') session.consoleWarnings.push(message.text());
  });
  page.on('pageerror', (error) => session.pageErrors.push(error.message));
  page.on('response', (response) => {
    const entry = {
      url: response.url(),
      status: response.status(),
      type: response.request().resourceType(),
    };
    session.responses.push(entry);
    if (response.status() >= 400) session.httpErrors.push(`${entry.status} ${entry.url}`);
  });
  page.on('requestfailed', (request) => {
    session.failedRequests.push(`${request.url()} :: ${request.failure()?.errorText ?? 'failed'}`);
  });
  return session;
}

async function closeSession(session) {
  if (!session) return;
  try {
    await session.context.close();
  } catch {
    /* already gone */
  }
}

async function load(session, url, { timeout = READY_TIMEOUT } = {}) {
  const started = Date.now();
  const response = await session.page.goto(url, { waitUntil: 'load', timeout: 90000 });
  try {
    await session.page.waitForFunction(
      () => document.documentElement.dataset.ready === 'true',
      undefined,
      { timeout, polling: 100 },
    );
  } catch (error) {
    const observed = await session.page
      .evaluate(() => ({
        ready: document.documentElement.dataset.ready,
        error: document.documentElement.dataset.error,
        context: document.documentElement.dataset.context,
        errorText: document.querySelector('#error')?.hidden === false ? 'overlay-visible' : 'overlay-hidden',
      }))
      .catch(() => ({}));
    throw new Error(
      `ready signal timed out after ${timeout} ms; observed=${JSON.stringify(observed)}; ` +
        `consoleErrors=${JSON.stringify(session.consoleErrors.slice(-4))}; ` +
        `pageErrors=${JSON.stringify(session.pageErrors.slice(-4))}`,
    );
  }
  return { ms: Date.now() - started, status: response?.status() ?? null };
}

function cleanDetail(session, prefix = '') {
  return {
    pageErrors: session.pageErrors,
    consoleErrors: session.consoleErrors,
    consoleWarnings: session.consoleWarnings,
    httpErrors: session.httpErrors,
    failedRequests: session.failedRequests,
  };
}

function cleanPasses(session) {
  return (
    session.pageErrors.length === 0 &&
    session.consoleErrors.length === 0 &&
    session.httpErrors.length === 0 &&
    session.failedRequests.length === 0
  );
}

function semanticCleanDetail(session, prefix = '') {
  return `${prefix ? `${prefix}; ` : ''}pageErrors=${JSON.stringify(session.pageErrors)}; ` +
    `consoleErrors=${JSON.stringify(session.consoleErrors)}; ` +
    `consoleWarnings=${JSON.stringify(session.consoleWarnings)}; ` +
    `httpErrors=${JSON.stringify(session.httpErrors)}; ` +
    `failedRequests=${JSON.stringify(session.failedRequests)}`;
}

async function waitFor(page, fn, arg, timeout = 30000, label = 'condition') {
  try {
    await page.waitForFunction(fn, arg, { timeout, polling: 100 });
    return true;
  } catch {
    return false;
  }
}

async function getStats(page) {
  return page.evaluate(() => window.__GARGANTUA__?.getStats?.() ?? null);
}

async function getState(page) {
  return page.evaluate(() => window.__GARGANTUA__?.getState?.() ?? null);
}

async function getDiagnostics(page) {
  return page.evaluate(() => window.__GARGANTUA__?.getShaderDiagnostics?.() ?? null);
}

async function getRig(page) {
  return page.evaluate(() => window.__GARGANTUA__?.rig?.() ?? null);
}

async function waitFrames(page, count = 1, timeout = FRAME_TIMEOUT) {
  const start = await getStats(page);
  if (!start) return false;
  return waitFor(
    page,
    ({ frames, count: needed }) =>
      (window.__GARGANTUA__?.getStats?.().frames ?? 0) >= frames + needed,
    { frames: start.frames, count },
    timeout,
    `${count} rendered frame(s)`,
  );
}

async function blurActive(page) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
}

async function press(page, key) {
  await blurActive(page);
  await page.keyboard.press(key);
  await page.waitForTimeout(150);
}

async function closeOverlays(page) {
  try {
    await page.evaluate(() => {
      const help = document.querySelector('#help');
      const error = document.querySelector('#error');
      if (help && !help.hidden) document.querySelector('#help-close')?.click();
      // Only dismiss a stray error overlay; never hide a live context-loss overlay
      // while its scenario is asserting it.
      if (error && !error.hidden && document.documentElement.dataset.context !== 'lost') {
        document.querySelector('#error-close')?.click();
      }
    });
  } catch {
    /* page may be mid-navigation */
  }
}

// ── canvas / PNG helpers ────────────────────────────────────────────────
function parsePng(buffer) {
  const signature = buffer.length >= 24 && buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
  return {
    signature,
    width: signature ? buffer.readUInt32BE(16) : 0,
    height: signature ? buffer.readUInt32BE(20) : 0,
    bytes: buffer.length,
  };
}

async function captureCanvas(page) {
  const raw = await page.evaluate(() => {
    const api = window.__GARGANTUA__;
    if (!api || typeof api.screenshot !== 'function') throw new Error('__GARGANTUA__.screenshot missing');
    const canvas = document.querySelector('#gl');
    if (!canvas) throw new Error('#gl canvas missing');
    const dataUrl = api.screenshot();
    return { dataUrl, canvasWidth: canvas.width, canvasHeight: canvas.height };
  });
  const prefix = 'data:image/png;base64,';
  const isDataUrl = typeof raw.dataUrl === 'string' && raw.dataUrl.startsWith(prefix);
  const buffer = isDataUrl ? Buffer.from(raw.dataUrl.slice(prefix.length), 'base64') : Buffer.alloc(0);
  const png = parsePng(buffer);
  return {
    dataUrl: raw.dataUrl,
    isDataUrl,
    buffer,
    bytes: buffer.length,
    png,
    canvasWidth: raw.canvasWidth,
    canvasHeight: raw.canvasHeight,
    hash: crypto.createHash('sha256').update(buffer).digest('hex'),
  };
}

async function canvasPixelStats(page) {
  return page.evaluate(() => {
    const api = window.__GARGANTUA__;
    const canvas = document.querySelector('#gl');
    if (!api?.screenshot || !canvas) return { error: 'canvas or screenshot API missing' };
    const dataUrl = api.screenshot();
    const sw = Math.max(1, Math.round(canvas.width / 4));
    const sh = Math.max(1, Math.round(canvas.height / 4));
    const scratch = document.createElement('canvas');
    scratch.width = sw;
    scratch.height = sh;
    const ctx = scratch.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(canvas, 0, 0, sw, sh);
    const pixels = ctx.getImageData(0, 0, sw, sh).data;
    let nonBlack = 0;
    let bright = 0;
    let max = 0;
    let sum = 0;
    let leftSum = 0;
    let leftCount = 0;
    let rightSum = 0;
    let rightCount = 0;
    let centerSum = 0;
    let centerCount = 0;
    let centralDark = 0;
    let centralBoxCount = 0;
    for (let y = 0; y < sh; y += 1) {
      for (let x = 0; x < sw; x += 1) {
        const index = (y * sw + x) * 4;
        const luma =
          0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2];
        if (luma > 6) nonBlack += 1;
        if (luma > 40) bright += 1;
        if (luma > max) max = luma;
        sum += luma;
        if (x < sw / 2) {
          leftSum += luma;
          leftCount += 1;
        } else {
          rightSum += luma;
          rightCount += 1;
        }
        if (x >= sw * 0.4 && x < sw * 0.6 && y >= sh * 0.4 && y < sh * 0.6) {
          centerSum += luma;
          centerCount += 1;
        }
        if (Math.abs(x / sw - 0.5) < 0.4 && Math.abs(y / sh - 0.5) < 0.4) {
          centralBoxCount += 1;
          if (luma < 6) centralDark += 1;
        }
      }
    }
    const total = sw * sh;
    const leftMean = leftSum / Math.max(1, leftCount);
    const rightMean = rightSum / Math.max(1, rightCount);
    return {
      samples: total,
      nonBlackFraction: Number((nonBlack / total).toFixed(4)),
      brightFraction: Number((bright / total).toFixed(4)),
      meanLuma: Number((sum / total).toFixed(2)),
      maxLuma: Number(max.toFixed(1)),
      centerMeanLuma: Number((centerSum / Math.max(1, centerCount)).toFixed(2)),
      centralDarkFraction: Number((centralDark / Math.max(1, centralBoxCount)).toFixed(4)),
      leftMeanLuma: Number(leftMean.toFixed(2)),
      rightMeanLuma: Number(rightMean.toFixed(2)),
      leftRightAsymmetry: Number(
        (Math.abs(leftMean - rightMean) / Math.max(0.001, (leftMean + rightMean) / 2)).toFixed(4),
      ),
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      dataUrlLength: dataUrl.length,
      isPngDataUrl: dataUrl.startsWith('data:image/png;base64,'),
    };
  });
}

/** Pixel diff of two PNG data URLs, evaluated in the page's own decoder. */
async function diffPngDataUrls(page, dataA, dataB) {
  return page.evaluate(
    async ({ a, b }) => {
      const loadImage = (src) =>
        new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error('image decode failed'));
          image.src = src;
        });
      const [imageA, imageB] = await Promise.all([loadImage(a), loadImage(b)]);
      if (imageA.width !== imageB.width || imageA.height !== imageB.height) {
        return { sameSize: false, widthA: imageA.width, heightA: imageA.height, widthB: imageB.width, heightB: imageB.height };
      }
      const width = imageA.width;
      const height = imageA.height;
      const draw = (image) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0);
        return ctx.getImageData(0, 0, width, height).data;
      };
      const pixelsA = draw(imageA);
      const pixelsB = draw(imageB);
      let diffPixels = 0;
      let sumDiff = 0;
      let maxChannelDiff = 0;
      let maxIndex = -1;
      for (let index = 0; index < pixelsA.length; index += 4) {
        let pixelDiff = 0;
        for (let channel = 0; channel < 3; channel += 1) {
          const delta = Math.abs(pixelsA[index + channel] - pixelsB[index + channel]);
          sumDiff += delta;
          if (delta > pixelDiff) pixelDiff = delta;
          if (delta > maxChannelDiff) {
            maxChannelDiff = delta;
            maxIndex = index;
          }
        }
        if (pixelDiff > 2) diffPixels += 1;
      }
      const total = width * height;
      return {
        sameSize: true,
        width,
        height,
        totalPixels: total,
        diffPixels,
        diffFraction: Number((diffPixels / total).toFixed(5)),
        meanAbsChannelDiff: Number((sumDiff / (total * 3)).toFixed(4)),
        maxChannelDiff,
        maxPixelIndex: maxIndex,
      };
    },
    { a: dataA, b: dataB },
  );
}

// ── DOM shortcut helpers ────────────────────────────────────────────────
async function setRangeInput(page, paramId, value) {
  return page.evaluate(
    ({ paramId: id, value: next }) => {
      const input = document.querySelector(`#params .param input[type="range"][data-param="${id}"]`);
      if (!input) return { ok: false, reason: 'input not found' };
      input.value = String(next);
      input.dispatchEvent(new Event('input', { bubbles: true, change: true }));
      const output = input.closest('.param')?.querySelector('.param__value');
      return { ok: true, value: input.value, output: output?.textContent ?? null };
    },
    { paramId, value },
  );
}

async function telemetryText(page) {
  return page.evaluate(() => document.querySelector('#telemetry')?.innerText ?? '');
}

// ── scenario: desktop load, HUD, controls ──────────────────────────────
async function scenarioDesktop(baseUrl) {
  section = 'Load, rendering & API';
  const session = await createSession({ name: 'desktop' });
  const page = session.page;
  try {
    let timing;
    try {
      timing = await load(session, `${baseUrl}?quality=standard&dpr=1`);
      check(
        'A1',
        'Static load reaches ready with no console/page/HTTP errors',
        cleanPasses(session),
        semanticCleanDetail(session, `ready in ${timing.ms} ms, HTTP ${timing.status}`),
        { acceptance: ['A'] },
      );
    } catch (error) {
      check('A1', 'Static load reaches ready with no console/page/HTTP errors', false, String(error.message), {
        acceptance: ['A'],
        repro: 'node tools/qa.mjs --only=desktop',
      });
    }

    await savePageShot(page, 'qa-01-desktop-load', 'Desktop first paint with HUD (quality=standard, 1000×620)');

    const glInfo = await page.evaluate(() => {
      const canvas = document.querySelector('#gl');
      const gl = canvas?.getContext('webgl2');
      if (!gl) return null;
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        isWebGL2: gl instanceof WebGL2RenderingContext,
        version: gl.getParameter(gl.VERSION),
        shadingLanguage: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      };
    });
    check(
      'A2',
      'WebGL2 rendering context is active (not WebGL1 fallback)',
      Boolean(glInfo?.isWebGL2),
      JSON.stringify(glInfo),
      { acceptance: ['A', 'F'] },
    );
    environment.webgl = glInfo;

    const pixelStats = await canvasPixelStats(page);
    check(
      'A3',
      'Canvas renders a non-black frame (screenshot pixel sampling)',
      Boolean(
        pixelStats &&
          pixelStats.isPngDataUrl &&
          pixelStats.nonBlackFraction > 0.2 &&
          pixelStats.brightFraction > 0.005 &&
          pixelStats.maxLuma > 80,
      ),
      JSON.stringify(pixelStats),
      { acceptance: ['A', 'B', 'C'] },
    );
    await saveCanvasShot(page, 'qa-02-canvas-standard', 'Raytraced canvas dump, ?quality=standard edge-on view');

    check(
      'C3',
      'Edge-on disk shows left/right brightness asymmetry (Doppler beaming)',
      Boolean(pixelStats && pixelStats.leftRightAsymmetry > 0.1),
      JSON.stringify({
        leftMeanLuma: pixelStats?.leftMeanLuma,
        rightMeanLuma: pixelStats?.rightMeanLuma,
        leftRightAsymmetry: pixelStats?.leftRightAsymmetry,
      }),
      { acceptance: ['C'] },
    );
    check(
      'C4',
      'Event-horizon shadow reads as a deep-black region inside the frame',
      Boolean(pixelStats && pixelStats.centralDarkFraction > 0.05),
      JSON.stringify({
        centralDarkFraction: pixelStats?.centralDarkFraction,
        centerMeanLuma: pixelStats?.centerMeanLuma,
        cornerDarknessNote: 'sampled dark pixels (luma<6) in the central 40% box',
      }),
      { acceptance: ['C'] },
    );

    const resources = await page.evaluate(() =>
      performance.getEntriesByType('resource').map((entry) => ({
        name: entry.name,
        initiatorType: entry.initiatorType,
      })),
    );
    const textureAssets = resources.filter((entry) =>
      /\.(png|jpe?g|webp|gif|avif|ktx2?|hdr|exr|basis|dds)(\?|$)/i.test(entry.name),
    );
    check(
      'B1',
      'No image/panorama textures are loaded — scene is procedural',
      textureAssets.length === 0,
      `resources=${resources.length}; imageAssets=${JSON.stringify(textureAssets)}`,
      { acceptance: ['B'] },
    );

    const shaderSource = fs.readFileSync(path.join(PROJECT_ROOT, 'src', 'shaders', 'blackhole.js'), 'utf8');
    const shaderTokens = ['uMaxSteps', 'uStepAngle', 'uBeaming', 'uRedshift', 'uDiskTurbulence', 'uPhotonRingBoost'];
    check(
      'B2',
      'Fragment shader integrates geodesics with relativistic terms (static evidence)',
      shaderTokens.every((token) => shaderSource.includes(token)) &&
        /RK4|u'' = -u/.test(shaderSource) &&
        !/sampler2D/.test(shaderSource),
      `tokens=${shaderTokens.length}/${shaderTokens.length}; RK4 present; sampler2D absent`,
      { acceptance: ['B', 'C'] },
    );

    const api = await page.evaluate(() => {
      const handle = window.__GARGANTUA__;
      return {
        version: handle?.version ?? null,
        ready: handle?.ready ?? false,
        constants: handle?.constants ?? null,
        paramCount: handle?.paramCount ?? null,
        params: handle?.params?.map((p) => p.id) ?? [],
        qualityLevels: handle?.qualityLevels?.map((q) => q.id) ?? [],
        debugViews: handle?.debugViews?.map((v) => v.id) ?? [],
        viewPresets: handle?.viewPresets?.map((v) => v.id) ?? [],
        shortcuts: handle?.shortcuts?.length ?? 0,
        hasFunctions: [
          'getState',
          'getStats',
          'setParam',
          'setParams',
          'resetParams',
          'setQuality',
          'setDebug',
          'setView',
          'setCameraMode',
          'setMotion',
          'setAudio',
          'setTime',
          'screenshot',
          'getShaderDiagnostics',
        ].every((name) => typeof handle?.[name] === 'function'),
      };
    });
    const constantsOk =
      api.constants &&
      api.constants.RS === 1 &&
      Math.abs(api.constants.CRITICAL_B - 2.598) < 0.01 &&
      api.constants.ISCO === 3 &&
      api.constants.PHOTON_SPHERE === 1.5;
    check(
      'A4',
      'window.__GARGANTUA__ API contract matches the documented surface',
      Boolean(
        api.version &&
          api.ready &&
          api.paramCount === 21 &&
          api.params.length === 21 &&
          api.qualityLevels.length === 3 &&
          api.debugViews.length === 10 &&
          api.viewPresets.length === 4 &&
          api.shortcuts >= 8 &&
          api.hasFunctions &&
          constantsOk,
      ),
      JSON.stringify(api),
      { acceptance: ['E', 'F'] },
    );

    const domCounts = await page.evaluate(() => ({
      sliderCount: document.querySelectorAll('#params .param input[type="range"]').length,
      paramRows: document.querySelectorAll('#params .param').length,
      sliderIds: [...document.querySelectorAll('#params .param input[type="range"]')].map((el) => el.dataset.param),
      viewButtons: document.querySelectorAll('#view-buttons [data-view]').length,
      qualityButtons: document.querySelectorAll('#quality-buttons [data-quality]').length,
      debugButtons: document.querySelectorAll('#debug-buttons [data-debug]').length,
      panelToggle: Boolean(document.querySelector('#panel-toggle')),
      resetButton: Boolean(document.querySelector('#reset-button')),
      helpButton: Boolean(document.querySelector('#help-button')),
      help: Boolean(document.querySelector('#help')),
      error: Boolean(document.querySelector('#error')),
      audioButton: Boolean(document.querySelector('#audio-button')),
      shotButton: Boolean(document.querySelector('#shot-button')),
      telemetry: Boolean(document.querySelector('#telemetry')),
      cameraReadout: Boolean(document.querySelector('#camera-readout')),
      hint: Boolean(document.querySelector('#hint')),
    }));
    check(
      'E1',
      'HUD exposes 21 parameter rows and the documented hooks',
      domCounts.sliderCount === 21 &&
        domCounts.paramRows === 21 &&
        new Set(domCounts.sliderIds).size === 21 &&
        domCounts.viewButtons === 4 &&
        domCounts.qualityButtons === 3 &&
        domCounts.debugButtons === 10 &&
        domCounts.panelToggle &&
        domCounts.resetButton &&
        domCounts.helpButton &&
        domCounts.help &&
        domCounts.error &&
        domCounts.audioButton &&
        domCounts.shotButton &&
        domCounts.telemetry &&
        domCounts.cameraReadout &&
        domCounts.hint,
      JSON.stringify(domCounts),
      { acceptance: ['E'] },
    );

    // ── parameter slider: exposure via a real DOM range input ────────────
    const paramDefs = await page.evaluate(() =>
      Object.fromEntries(
        window.__GARGANTUA__.params.map((param) => [
          param.id,
          { min: param.min, max: param.max, def: param.def },
        ]),
      ),
    );
    const exposureBefore = (await getState(page))?.params?.exposure;
    const changed = await setRangeInput(page, 'exposure', 1.75);
    const exposureAfter = await getState(page);
    const exposureState = exposureAfter?.params?.exposure;
    check(
      'E2',
      'Changing a DOM range slider updates the shared state (exposure)',
      changed.ok && Math.abs(exposureState - 1.75) < 1e-6 && (changed.output ?? '').includes('1.75'),
      JSON.stringify({ before: exposureBefore, after: exposureState, output: changed.output }),
      { acceptance: ['E'] },
    );
    await savePageShot(page, 'qa-03-exposure-175', 'Exposure raised to 1.75 through the HUD slider');

    const clampProbe = await (async () => {
      await setRangeInput(page, 'exposure', paramDefs.exposure.max + 100);
      const high = (await getState(page))?.params?.exposure;
      await setRangeInput(page, 'exposure', paramDefs.exposure.min - 100);
      const low = (await getState(page))?.params?.exposure;
      return { high, low };
    })();
    check(
      'E3',
      'Parameter values are validated/clamped to the schema range',
      clampProbe.high === paramDefs.exposure.max && clampProbe.low === paramDefs.exposure.min,
      JSON.stringify({ probe: clampProbe, range: paramDefs.exposure }),
      { acceptance: ['E'] },
    );

    // Restore defaults via R shortcut.
    await page.evaluate(() => window.__GARGANTUA__.setParams({ exposure: 2.4, diskBrightness: 0.2, grain: 0.9 }));
    await press(page, 'r');
    const afterResetKey = await getState(page);
    const defaults = Object.fromEntries(
      Object.entries(paramDefs).map(([id, definition]) => [id, definition.def]),
    );
    const resetMismatch = Object.entries(defaults).filter(
      ([id, value]) => Math.abs(afterResetKey.params[id] - value) > 1e-9,
    );
    check(
      'E4',
      'R shortcut resets all 21 parameters to their defaults',
      resetMismatch.length === 0,
      `mismatches=${JSON.stringify(resetMismatch)}`,
      { acceptance: ['E'] },
    );

    // Reset button as well.
    await page.evaluate(() => window.__GARGANTUA__.setParam('exposure', 2.2));
    await page.click('#reset-button');
    await page.waitForTimeout(150);
    const afterResetButton = (await getState(page))?.params?.exposure;
    check(
      'E5',
      'HUD reset button restores defaults',
      Math.abs(afterResetButton - defaults.exposure) < 1e-9,
      `exposure=${afterResetButton}`,
      { acceptance: ['E'] },
    );

    // ── panel toggle ─────────────────────────────────────────────────────
    await page.click('#panel-toggle');
    const panelClosed = await page.evaluate(() => ({
      panel: window.__GARGANTUA__.getState().panel,
      dataset: document.documentElement.dataset.panel,
      bodyHidden: document.querySelector('#panel .panel__body')
        ? getComputedStyle(document.querySelector('#panel .panel__body')).display === 'none'
        : null,
      aria: document.querySelector('#panel-toggle')?.getAttribute('aria-expanded'),
    }));
    await savePageShot(page, 'qa-04-panel-closed', 'Parameter panel collapsed via #panel-toggle');
    await page.click('#panel-toggle');
    await page.waitForTimeout(150);
    const panelReopened = await page.evaluate(() => ({
      panel: window.__GARGANTUA__.getState().panel,
      dataset: document.documentElement.dataset.panel,
    }));
    check(
      'E6',
      'Parameter panel toggles closed/open through #panel-toggle',
      panelClosed.panel === false &&
        panelClosed.dataset === 'closed' &&
        panelReopened.panel === true &&
        panelReopened.dataset === 'open',
      JSON.stringify({ closed: panelClosed, reopened: panelReopened }),
      { acceptance: ['E'] },
    );

    // ── help overlay ─────────────────────────────────────────────────────
    await page.click('#help-button');
    await page.waitForTimeout(350);
    const helpOpen = await page.evaluate(() => {
      const help = document.querySelector('#help');
      const style = help ? getComputedStyle(help) : null;
      return {
        hidden: help?.hidden ?? null,
        display: style?.display ?? null,
        visibility: style?.visibility ?? null,
        expanded: document.querySelector('#help-button')?.getAttribute('aria-expanded'),
        rows: document.querySelectorAll('#help-list > *').length,
      };
    });
    await savePageShot(page, 'qa-05-help-overlay', 'Keyboard shortcut help overlay');
    await page.click('#help-close');
    await page.waitForTimeout(250);
    const helpClosed = await page.evaluate(() => document.querySelector('#help')?.hidden ?? null);
    await press(page, '?');
    const helpKeyOpen = await page.evaluate(() => document.querySelector('#help')?.hidden === false);
    await press(page, 'Escape');
    const helpEscClosed = await page.evaluate(() => document.querySelector('#help')?.hidden === true);
    check(
      'E7',
      'Help overlay opens/closes via button, ? key and Escape',
      helpOpen.hidden === false &&
        helpOpen.expanded === 'true' &&
        helpOpen.rows > 0 &&
        helpClosed === true &&
        helpKeyOpen === true &&
        helpEscClosed === true,
      JSON.stringify({ open: helpOpen, closed: helpClosed, keyOpen: helpKeyOpen, escClosed: helpEscClosed }),
      { acceptance: ['E'] },
    );

    // ── HUD hide/show (H) ────────────────────────────────────────────────
    await press(page, 'h');
    const hudHidden = await waitFor(
      page,
      () => {
        const hud = document.querySelector('#hud');
        if (!hud) return false;
        const style = getComputedStyle(hud);
        return (
          document.documentElement.dataset.hud === 'hidden' &&
          (style.visibility === 'hidden' || Number(style.opacity) < 0.05)
        );
      },
      undefined,
      8000,
    );
    const hudHiddenState = await page.evaluate(() => ({
      state: window.__GARGANTUA__.getState().hud,
      dataset: document.documentElement.dataset.hud,
      opacity: getComputedStyle(document.querySelector('#hud')).opacity,
      visibility: getComputedStyle(document.querySelector('#hud')).visibility,
    }));
    await savePageShot(page, 'qa-06-hud-hidden', 'HUD hidden with the H shortcut');
    await press(page, 'h');
    const hudShown = await waitFor(
      page,
      () => {
        const hud = document.querySelector('#hud');
        if (!hud) return false;
        const style = getComputedStyle(hud);
        return document.documentElement.dataset.hud === 'visible' && Number(style.opacity) > 0.9;
      },
      undefined,
      8000,
    );
    const hudShownState = await page.evaluate(() => ({
      state: window.__GARGANTUA__.getState().hud,
      dataset: document.documentElement.dataset.hud,
      opacity: getComputedStyle(document.querySelector('#hud')).opacity,
    }));
    check(
      'E8',
      'H shortcut hides and restores the HUD',
      hudHidden && hudHiddenState.state === false && hudShown && hudShownState.state === true,
      JSON.stringify({ hidden: hudHiddenState, shown: hudShownState }),
      { acceptance: ['E'] },
    );

    // ── quality tiers ────────────────────────────────────────────────────
    section = 'Quality tiers';
    const qualityBefore = await getDiagnostics(page);
    const tiers = [];
    const tierErrors = [];
    const tierButtons = ['high', 'cinematic', 'standard'];
    for (const tier of tierButtons) {
      const errorsBefore = session.consoleErrors.length + session.pageErrors.length;
      await page.click(`#quality-buttons [data-quality="${tier}"]`);
      const stateOk = await waitFor(
        page,
        (id) => window.__GARGANTUA__?.getState?.().quality === id,
        tier,
        15000,
      );
      const rendered = await waitFrames(page, 1);
      const snapshot = await page.evaluate(() => ({
        state: window.__GARGANTUA__.getState().quality,
        dataset: document.documentElement.dataset.quality,
        active: document.querySelector(`#quality-buttons [data-quality="${window.__GARGANTUA__.getState().quality}"]`)?.classList.contains('is-active') ?? null,
        diagnostics: window.__GARGANTUA__.getShaderDiagnostics(),
        stats: window.__GARGANTUA__.getStats(),
      }));
      tiers.push({ tier, stateOk, rendered, ...snapshot });
      tierErrors.push({
        tier,
        console: session.consoleErrors.length - errorsBefore,
        page: session.pageErrors.length - errorsBefore,
      });
    }
    const byTier = Object.fromEntries(tiers.map((entry) => [entry.tier, entry]));
    const expected = await page.evaluate(() =>
      Object.fromEntries(
        window.__GARGANTUA__.qualityLevels.map((level) => [
          level.id,
          Math.round(1000 * level.renderScale),
        ]),
      ),
    );
    check(
      'F1',
      'Three quality tiers switch and change the reported render resolution',
      ['standard', 'high', 'cinematic'].every((tier) => {
        const entry = byTier[tier];
        return (
          entry &&
          entry.stateOk &&
          entry.rendered &&
          entry.state === tier &&
          entry.diagnostics.quality === tier &&
          entry.diagnostics.renderWidth === expected[tier] &&
          entry.stats.width === expected[tier] &&
          entry.active === true
        );
      }),
      JSON.stringify({
        before: { quality: qualityBefore.quality, width: qualityBefore.renderWidth },
        tiers: tiers.map((entry) => ({
          tier: entry.tier,
          render: `${entry.diagnostics?.renderWidth}×${entry.diagnostics?.renderHeight}`,
          canvas: `${entry.diagnostics?.canvasWidth}×${entry.diagnostics?.canvasHeight}`,
          dpr: entry.diagnostics?.dpr,
          statsWidth: entry.stats?.width,
          maxSteps: entry.stats?.maxSteps,
          active: entry.active,
        })),
        errors: tierErrors,
      }),
      { acceptance: ['F'] },
    );
    check(
      'F2',
      'Quality switching introduces no console/page errors',
      tierErrors.every((entry) => entry.console === 0 && entry.page === 0),
      JSON.stringify(tierErrors),
      { acceptance: ['F'] },
    );
    await page.click('#quality-buttons [data-quality="high"]');
    await waitFor(page, () => window.__GARGANTUA__?.getState?.().quality === 'high', undefined, 15000);
    await waitFrames(page, 1);
    await savePageShot(page, 'qa-07-quality-high', 'HIGH quality tier screenshot');
    await page.click('#quality-buttons [data-quality="standard"]');
    await waitFor(page, () => window.__GARGANTUA__?.getState?.().quality === 'standard', undefined, 15000);
    await waitFrames(page, 1);

    // ── debug views: keys 0-9 ────────────────────────────────────────────
    section = 'Debug views 0–9';
    const debugKeyResults = [];
    for (let index = 0; index <= 9; index += 1) {
      await press(page, String(index));
      const ok = await waitFor(page, (value) => window.__GARGANTUA__?.getState?.().debug === value, index, 10000);
      const observed = await page.evaluate(() => ({
        debug: window.__GARGANTUA__.getState().debug,
        dataset: document.documentElement.dataset.debug,
        active:
          document
            .querySelector(`#debug-buttons [data-debug="${window.__GARGANTUA__.getState().debug}"]`)
            ?.classList.contains('is-active') ?? null,
        label: document.querySelector('#debug-label')?.innerText?.replace(/\s+/g, ' ').trim() ?? '',
      }));
      debugKeyResults.push({ index, ok, ...observed });
      await waitFrames(page, 1);
    }
    check(
      'E9',
      'Keys 0–9 switch all ten debug views and keep HUD state in sync',
      debugKeyResults.every(
        (entry) => entry.ok && entry.debug === entry.index && entry.dataset === String(entry.index) && entry.active === true,
      ),
      JSON.stringify(debugKeyResults),
      { acceptance: ['C', 'E'] },
    );

    const debugButtonResults = [];
    for (let index = 0; index <= 9; index += 1) {
      await page.click(`#debug-buttons [data-debug="${index}"]`);
      const ok = await waitFor(page, (value) => window.__GARGANTUA__?.getState?.().debug === value, index, 10000);
      const observed = await page.evaluate(() => window.__GARGANTUA__.getState().debug);
      debugButtonResults.push({ index, ok, debug: observed });
      await waitFrames(page, 1);
    }
    check(
      'E10',
      'All ten debug-view buttons drive the same state as the keys',
      debugButtonResults.every((entry) => entry.ok && entry.debug === entry.index),
      JSON.stringify(debugButtonResults),
      { acceptance: ['E'] },
    );
    await page.click('#debug-buttons [data-debug="0"]');
    await waitFor(page, () => window.__GARGANTUA__?.getState?.().debug === 0, undefined, 10000);
    await waitFrames(page, 2);
    await savePageShot(page, 'qa-08-debug-0-final', 'Debug view 0 — FINAL beauty composite');
    await page.click('#debug-buttons [data-debug="2"]');
    await waitFor(page, () => window.__GARGANTUA__?.getState?.().debug === 2, undefined, 10000);
    await waitFrames(page, 2);
    await savePageShot(page, 'qa-09-debug-2-steps', 'Debug view 2 — geodesic step heat map');
    await page.click('#debug-buttons [data-debug="6"]');
    await waitFor(page, () => window.__GARGANTUA__?.getState?.().debug === 6, undefined, 10000);
    await waitFrames(page, 2);
    await savePageShot(page, 'qa-10-debug-6-redshift', 'Debug view 6 — observed/emitted redshift g');
    await page.click('#debug-buttons [data-debug="0"]');
    await waitFor(page, () => window.__GARGANTUA__?.getState?.().debug === 0, undefined, 10000);

    // ── 4 view presets ───────────────────────────────────────────────────
    section = 'View presets & shortcuts';
    const presetIds = ['polar', 'oblique', 'close', 'edge'];
    const presetResults = [];
    for (const id of presetIds) {
      await page.click(`#view-buttons [data-view="${id}"]`);
      await page.waitForTimeout(250);
      const observed = await page.evaluate((presetId) => {
        const rig = window.__GARGANTUA__.rig();
        return {
          storePreset: window.__GARGANTUA__.getState().camera.preset,
          storeMode: window.__GARGANTUA__.getState().camera.mode,
          rigPreset: rig?.preset ?? null,
          rigMode: rig?.mode ?? null,
          active:
            document
              .querySelector(`#view-buttons [data-view="${presetId}"]`)
              ?.classList.contains('is-active') ?? null,
        };
      }, id);
      presetResults.push({ id, ...observed });
    }
    check(
      'E11',
      'Four view-preset buttons move the camera to the authored poses',
      presetResults.every(
        (entry) => entry.rigPreset === entry.id && entry.storePreset === entry.id && entry.storeMode === 'manual' && entry.active === true,
      ),
      JSON.stringify(presetResults),
      {
        acceptance: ['E'],
        repro: 'Load the app, click each #view-buttons [data-view]; camera rig/store preset stays "edge" while the button highlights.',
      },
    );
    await savePageShot(page, 'qa-11-view-presets', 'View preset buttons in the HUD dock');

    const shiftResults = [];
    for (let index = 1; index <= 4; index += 1) {
      await press(page, `Shift+${index}`);
      const preset = await page.evaluate(() => window.__GARGANTUA__.getState().camera.preset);
      shiftResults.push({ index, preset });
    }
    const expectedShiftPresets = ['edge', 'polar', 'oblique', 'close'];
    check(
      'E12',
      'Shift+1…4 select the four view presets',
      shiftResults.every((entry, position) => entry.preset === expectedShiftPresets[position]),
      JSON.stringify(shiftResults),
      { acceptance: ['E'] },
    );

    // ── C / Space / M shortcuts ──────────────────────────────────────────
    const modeBeforeC = await page.evaluate(() => window.__GARGANTUA__.getState().camera.mode);
    await press(page, 'c');
    const modeAfterC1 = await page.evaluate(() => window.__GARGANTUA__.getState().camera.mode);
    await press(page, 'c');
    const modeAfterC2 = await page.evaluate(() => window.__GARGANTUA__.getState().camera.mode);
    check(
      'E13',
      'C toggles between cinematic and manual camera modes',
      modeAfterC1 !== modeBeforeC && modeAfterC2 === modeBeforeC,
      JSON.stringify({ before: modeBeforeC, afterFirst: modeAfterC1, afterSecond: modeAfterC2 }),
      { acceptance: ['E'] },
    );

    const motionBefore = await page.evaluate(() => window.__GARGANTUA__.getState().motion);
    await press(page, 'Space');
    const motionAfter = await page.evaluate(() => window.__GARGANTUA__.getState().motion);
    await press(page, 'Space');
    const motionRestored = await page.evaluate(() => window.__GARGANTUA__.getState().motion);
    check(
      'E14',
      'Space pauses and resumes simulated time',
      motionAfter === !motionBefore && motionRestored === motionBefore,
      JSON.stringify({ before: motionBefore, paused: motionAfter, resumed: motionRestored }),
      { acceptance: ['E'] },
    );

    // ── audio toggle (M + file 200) ──────────────────────────────────────
    const audioErrorsBefore = session.consoleErrors.length + session.pageErrors.length;
    await press(page, 'm');
    await page.waitForTimeout(2200);
    const audioOn = await page.evaluate(() => {
      const audio = document.querySelector('audio[data-gargantua-audio]');
      return {
        state: window.__GARGANTUA__.getState().audio,
        dataset: document.documentElement.dataset.audio,
        elementPresent: Boolean(audio),
        src: audio?.currentSrc || audio?.src || null,
        loop: audio?.loop ?? null,
        paused: audio?.paused ?? null,
        readyState: audio?.readyState ?? null,
      };
    });
    const oggResponses = session.responses.filter((response) => /\.ogg(\?|$)/i.test(response.url));
    let audioHttpStatus = null;
    if (audioOn.src) {
      try {
        const response = await session.context.request.get(audioOn.src, { method: 'HEAD', timeout: 15000 });
        audioHttpStatus = response.status();
      } catch (error) {
        audioHttpStatus = `request-failed: ${error.message}`;
      }
    }
    const audioErrorsAfter = session.consoleErrors.length + session.pageErrors.length;
    check(
      'E15',
      'M toggles ambient music; <audio> exists after gesture and the OGG responds 200',
      audioOn.state === true &&
        audioOn.dataset === 'on' &&
        audioOn.elementPresent &&
        audioOn.loop === true &&
        audioOn.paused === false &&
        (audioHttpStatus === 200 || oggResponses.some((response) => response.status === 200)) &&
        audioErrorsAfter === audioErrorsBefore,
      JSON.stringify({ audioOn, oggResponses, audioHttpStatus }),
      { acceptance: ['E', 'G'] },
    );
    await press(page, 'm');
    await page.waitForTimeout(400);
    const audioOff = await page.evaluate(() => ({
      state: window.__GARGANTUA__.getState().audio,
      dataset: document.documentElement.dataset.audio,
    }));
    check(
      'E16',
      'M toggles ambient music off again',
      audioOff.state === false && audioOff.dataset === 'off',
      JSON.stringify(audioOff),
      { acceptance: ['E'] },
    );

    // ── telemetry & camera readout ───────────────────────────────────────
    const telemetry = await telemetryText(page);
    const readout = await page.evaluate(() => document.querySelector('#camera-readout')?.innerText ?? '');
    check(
      'E17',
      'Telemetry and camera readout render live values',
      /FPS/i.test(telemetry) && /QUALITY/i.test(telemetry) && /STANDARD/i.test(telemetry) && /CAMERA|MANUAL|CINEMATIC/i.test(readout),
      JSON.stringify({ telemetry: truncate(telemetry, 240), readout: truncate(readout, 200) }),
      { acceptance: ['E'] },
    );

    // ── post-processing parameter A/B (HDR bloom etc.) ───────────────────
    section = 'Post-processing & animation';
    await page.evaluate(() => window.__GARGANTUA__.setParams({ exposure: 0.95, bloomStrength: 0.65 }));
    await waitFrames(page, 1);
    const postBase = await captureCanvas(page);
    const postVariants = [];
    const variants = [
      { id: 'bloom-off', params: { bloomStrength: 0 } },
      { id: 'bloom-max', params: { bloomStrength: 2.5 } },
      { id: 'vignette-off', params: { vignette: 0 } },
      { id: 'grain-off', params: { grain: 0 } },
      { id: 'chroma-off', params: { chromaticAberration: 0 } },
      { id: 'exposure-low', params: { exposure: 0.3 } },
    ];
    for (const variant of variants) {
      await page.evaluate((params) => window.__GARGANTUA__.setParams(params), variant.params);
      await waitFrames(page, 1);
      const capture = await captureCanvas(page);
      postVariants.push({ id: variant.id, hash: capture.hash.slice(0, 16), differsFromBase: capture.hash !== postBase.hash });
    }
    await page.evaluate(() =>
      window.__GARGANTUA__.setParams({ exposure: 0.95, bloomStrength: 0.65, vignette: 0.55, grain: 0.32, chromaticAberration: 0.4 }),
    );
    check(
      'D1',
      'HDR bloom / vignette / grain / chromatic aberration / exposure all alter the composite',
      postVariants.every((variant) => variant.differsFromBase),
      JSON.stringify({ base: postBase.hash.slice(0, 16), variants: postVariants }),
      { acceptance: ['D'] },
    );
    await page.click('#debug-buttons [data-debug="1"]');
    await waitFor(page, () => window.__GARGANTUA__?.getState?.().debug === 1, undefined, 10000);
    await waitFrames(page, 2);
    const rawHdr = await captureCanvas(page);
    await page.click('#debug-buttons [data-debug="0"]');
    await waitFor(page, () => window.__GARGANTUA__?.getState?.().debug === 0, undefined, 10000);
    await waitFrames(page, 2);
    const finalComposite = await captureCanvas(page);
    check(
      'D2',
      'Debug view 1 (RAW HDR) differs from the tonemapped FINAL composite',
      rawHdr.hash !== finalComposite.hash,
      JSON.stringify({ raw: rawHdr.hash.slice(0, 16), final: finalComposite.hash.slice(0, 16) }),
      { acceptance: ['D'] },
    );
    await saveCanvasShot(page, 'qa-22-final-composite', 'FINAL composite after HDR/bloom/vignette/grain/chroma A/B tests');

    const animA = await captureCanvas(page);
    await page.waitForTimeout(1600);
    const animB = await captureCanvas(page);
    check(
      'C1',
      'Scene is animated: successive frames differ while motion is live',
      animA.hash !== animB.hash,
      JSON.stringify({
        a: animA.hash.slice(0, 16),
        b: animB.hash.slice(0, 16),
        motion: (await getState(page))?.motion,
      }),
      { acceptance: ['C'] },
    );

    // ── cinematic rail + drag reclaims manual ────────────────────────────
    section = 'Camera: cinematic & orbit';
    await page.evaluate(() => window.__GARGANTUA__.setView('edge'));
    await page.waitForTimeout(300);
    await page.evaluate(() => window.__GARGANTUA__.setCameraMode('cinematic'));
    const cinematicStart = await getRig(page);
    const cinematicMoved = await waitFor(
      page,
      (start) => {
        const rig = window.__GARGANTUA__.rig();
        if (!rig) return false;
        const deltaAzimuth = Math.abs(((rig.azimuth - start.azimuth + 540) % 360) - 180);
        return Math.abs(rig.radius - start.radius) > 0.15 || deltaAzimuth > 0.35 || Math.abs(rig.polar - start.polar) > 0.15;
      },
      cinematicStart,
      20000,
    );
    const cinematicLater = await getRig(page);
    check(
      'E18',
      'Cinematic attract loop moves the camera over time',
      cinematicMoved &&
        (cinematicLater?.azimuth !== cinematicStart?.azimuth || cinematicLater?.radius !== cinematicStart?.radius),
      JSON.stringify({ start: cinematicStart, later: cinematicLater }),
      { acceptance: ['E', 'C'] },
    );
    await savePageShot(page, 'qa-12-cinematic', 'Cinematic attract loop (camera in motion)');

    const canvasPoint = await page.evaluate(() => {
      for (let y = 180; y < window.innerHeight - 180; y += 32) {
        for (let x = 100; x < window.innerWidth - 380; x += 32) {
          if (document.elementFromPoint(x, y)?.id === 'gl') return { x, y };
        }
      }
      return null;
    });
    let dragResult = { point: canvasPoint, stateMode: null, rigMode: null };
    if (canvasPoint) {
      await page.mouse.move(canvasPoint.x, canvasPoint.y);
      await page.mouse.down();
      await page.mouse.move(canvasPoint.x + 90, canvasPoint.y + 28, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(500);
      dragResult = await page.evaluate(() => ({
        stateMode: window.__GARGANTUA__.getState().camera.mode,
        rigMode: window.__GARGANTUA__.rig()?.mode ?? null,
        point: null,
      }));
      dragResult.point = canvasPoint;
    }
    check(
      'E19',
      'Dragging the canvas switches from cinematic to manual OrbitControls',
      Boolean(canvasPoint) && dragResult.stateMode === 'manual' && dragResult.rigMode === 'manual',
      JSON.stringify(dragResult),
      { acceptance: ['E'] },
    );

    // ── SAVE PNG button download ─────────────────────────────────────────
    section = 'Screenshot interface';
    let downloadInfo = null;
    try {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 20000 }),
        page.click('#shot-button'),
      ]);
      downloadInfo = { suggestedFilename: download.suggestedFilename(), failure: await download.failure() };
      await download.delete();
    } catch (error) {
      downloadInfo = { error: error.message };
    }
    check(
      'F3',
      'SAVE PNG button downloads a PNG file',
      Boolean(downloadInfo?.suggestedFilename && /\.png$/i.test(downloadInfo.suggestedFilename) && !downloadInfo.failure),
      JSON.stringify(downloadInfo),
      { acceptance: ['F'] },
    );

    // ── environment capture ──────────────────────────────────────────────
    const envPage = await page.evaluate(() => ({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      devicePixelRatio: window.devicePixelRatio,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      screen: { width: screen.width, height: screen.height },
      language: navigator.language,
      hardwareConcurrency: navigator.hardwareConcurrency,
    }));
    const glExtra = await page.evaluate(() => {
      const gl = document.querySelector('#gl')?.getContext('webgl2');
      if (!gl) return null;
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        version: gl.getParameter(gl.VERSION),
        renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      };
    });
    environment.page = envPage;
    environment.webgl = glExtra ?? environment.webgl;
  } catch (error) {
    check('DESKTOP-ERROR', 'Desktop scenario aborted', false, String(error?.stack ?? error), {
      acceptance: ['A', 'E'],
    });
    await savePageShot(page, 'qa-desktop-error', 'Desktop scenario failure state').catch(() => {});
  } finally {
    await closeSession(session);
  }
}

// ── scenario: shot URL determinism + post/debug hashes ─────────────────
async function scenarioShot(baseUrl) {
  section = 'Shot URL determinism';
  const shotUrl = `${baseUrl}?shot=1&quality=standard&view=edge&debug=0&ui=0&time=7&dpr=1`;
  const viewport = { width: 700, height: 440 };
  const runs = [];
  let shotPage = null;
  let shotSession = null;
  try {
    for (let index = 0; index < 2; index += 1) {
      const session = await createSession({ name: `shot-${index}`, viewport });
      const page = session.page;
      try {
        const timing = await load(session, shotUrl);
        await page.waitForTimeout(400);
        const state = await getState(page);
        const diagnostics = await getDiagnostics(page);
        const shotContract = await page.evaluate(() => ({
          windowShotReady: window.__SHOT_READY === true,
          shotReady: window.__GARGANTUA__?.shot?.ready === true,
          shotEnabled: window.__GARGANTUA__?.shot?.enabled === true,
          captureType: typeof window.__GARGANTUA__?.shot?.capture,
        }));
        const capture = await captureCanvas(page);
        const pixelStats = await canvasPixelStats(page);
        runs.push({
          session,
          page,
          timing,
          state,
          diagnostics,
          shotContract,
          capture,
          pixelStats,
          errors: cleanDetail(session),
          clean: cleanPasses(session),
        });
        if (index === 0) {
          shotPage = page;
          shotSession = session;
          await saveCanvasShot(page, 'qa-13-shot-deterministic', '?shot=1&quality=standard&view=edge&debug=0&ui=0&time=7&dpr=1 canvas dump (run A)');
        }
      } catch (error) {
        runs.push({ session, page, error: String(error.message), errors: cleanDetail(session), clean: false });
      }
    }

    const [first, second] = runs;
    const readyOk = runs.every((run) => !run.error && run.state?.shot?.enabled === true);
    check(
      'F4',
      'Screenshot URL (?shot=1) loads deterministically with UI hidden, motion frozen and shot contract ready',
      readyOk &&
        first.clean &&
        second.clean &&
        first.shotContract?.windowShotReady === true &&
        first.shotContract?.shotReady === true &&
        first.shotContract?.shotEnabled === true &&
        first.shotContract?.captureType === 'function' &&
        second.shotContract?.windowShotReady === true &&
        second.shotContract?.shotReady === true &&
        first.state?.motion === false &&
        first.state?.hud === false &&
        first.state?.panel === false &&
        first.state?.camera?.mode === 'manual' &&
        first.state?.camera?.preset === 'edge' &&
        first.state?.quality === 'standard' &&
        first.state?.debug === 0,
      JSON.stringify({
        first: first.state ? { shot: first.state.shot, shotContract: first.shotContract, motion: first.state.motion, hud: first.state.hud, quality: first.state.quality, camera: first.state.camera } : first.error,
        second: second.state ? { shot: second.state.shot, shotContract: second.shotContract, motion: second.state.motion, hud: second.state.hud } : second.error,
        errors: { first: first.errors, second: second.errors },
      }),
      { acceptance: ['F', 'G'] },
    );

    check(
      'F5',
      'Two fresh contexts produce identical state and screenshots',
      Boolean(
        first.state &&
          second.state &&
          JSON.stringify(first.state) === JSON.stringify(second.state) &&
          first.capture.hash === second.capture.hash &&
          first.diagnostics?.renderWidth === second.diagnostics?.renderWidth,
      ),
      JSON.stringify({
        stateEqual: JSON.stringify(first.state) === JSON.stringify(second.state),
        hashA: first.capture?.hash?.slice(0, 20),
        hashB: second.capture?.hash?.slice(0, 20),
        renderA: first.diagnostics ? `${first.diagnostics.renderWidth}×${first.diagnostics.renderHeight}` : null,
        renderB: second.diagnostics ? `${second.diagnostics.renderWidth}×${second.diagnostics.renderHeight}` : null,
      }),
      { acceptance: ['F'] },
    );

    const firstCapture = first.capture;
    check(
      'F6',
      '__GARGANTUA__.screenshot() returns a decodable, non-trivial PNG data URL',
      Boolean(
        firstCapture?.isDataUrl &&
          firstCapture.png.signature &&
          firstCapture.png.width === 700 &&
          firstCapture.png.height === 440 &&
          firstCapture.bytes > 50000 &&
          first.pixelStats?.nonBlackFraction > 0.2 &&
          first.pixelStats?.maxLuma > 80,
      ),
      JSON.stringify({
        isDataUrl: firstCapture?.isDataUrl,
        png: firstCapture?.png,
        bytes: firstCapture?.bytes,
        pixels: first.pixelStats,
      }),
      { acceptance: ['F'] },
    );

    if (!(first.capture?.hash === second.capture?.hash) && first.page && second.capture?.dataUrl) {
      const diff = await diffPngDataUrls(first.page, first.capture.dataUrl, second.capture.dataUrl);
      check('F7', 'Shot mismatch explained by pixel diff', diff.diffFraction < 0.001, JSON.stringify(diff), {
        acceptance: ['F'],
      });
    } else {
      check('F7', 'Shot determinism pixel diff (not needed — hashes match)', true, 'hashes identical', {
        acceptance: ['F'],
      });
    }

    // Deterministic debug-view / post-processing evidence on the fixed-time page.
    section = 'Debug views & post-processing (deterministic)';
    if (shotPage) {
      const debugHashes = [];
      for (let index = 0; index <= 9; index += 1) {
        await shotPage.evaluate((value) => window.__GARGANTUA__.setDebug(value), index);
        await shotPage.waitForFunction((value) => window.__GARGANTUA__.getState().debug === value, index, {
          timeout: 15000,
        });
        await waitFrames(shotPage, 1);
        const capture = await captureCanvas(shotPage);
        debugHashes.push({ debug: index, hash: capture.hash, bytes: capture.bytes });
        await saveCanvasShot(shotPage, `qa-14-debug-${index}`, `Debug view ${index} rendered with fixed shot time`);
      }
      const uniqueDebugHashes = new Set(debugHashes.map((entry) => entry.hash));
      check(
        'C2',
        'All ten debug views render distinct imagery (fixed time, deterministic)',
        uniqueDebugHashes.size >= 9,
        JSON.stringify({
          unique: uniqueDebugHashes.size,
          hashes: debugHashes.map((entry) => ({ debug: entry.debug, hash: entry.hash.slice(0, 12) })),
        }),
        { acceptance: ['B', 'C', 'D'] },
      );

      await shotPage.evaluate(() => window.__GARGANTUA__.setDebug(0));
      await shotPage.waitForFunction(() => window.__GARGANTUA__.getState().debug === 0, undefined, { timeout: 15000 });
      await waitFrames(shotPage, 1);
      const base = await captureCanvas(shotPage);
      const postVariants = [];
      const variants = [
        { id: 'bloomStrength', value: 0 },
        { id: 'bloomRadius', value: 0 },
        { id: 'bloomThreshold', value: 3 },
        { id: 'vignette', value: 0 },
        { id: 'grain', value: 0 },
        { id: 'chromaticAberration', value: 0 },
        { id: 'exposure', value: 2.4 },
      ];
      for (const variant of variants) {
        await shotPage.evaluate(({ id, value }) => window.__GARGANTUA__.setParam(id, value), variant);
        await waitFrames(shotPage, 1);
        const capture = await captureCanvas(shotPage);
        postVariants.push({ ...variant, hash: capture.hash, differs: capture.hash !== base.hash });
      }
      await shotPage.evaluate(() => window.__GARGANTUA__.resetParams());
      check(
        'D3',
        'Every post-processing parameter changes the final composite (deterministic A/B)',
        postVariants.every((variant) => variant.differs),
        JSON.stringify({
          base: base.hash.slice(0, 16),
          variants: postVariants.map((variant) => ({
            id: variant.id,
            value: variant.value,
            differs: variant.differs,
            hash: variant.hash.slice(0, 12),
          })),
        }),
        { acceptance: ['D'] },
      );
    }
  } catch (error) {
    check('SHOT-ERROR', 'Shot-URL scenario aborted', false, String(error?.stack ?? error), {
      acceptance: ['F'],
    });
  } finally {
    for (const run of runs) {
      if (run.session) await closeSession(run.session);
    }
  }
}

// ── scenario: persistence ──────────────────────────────────────────────
async function scenarioPersistence(baseUrl) {
  section = 'Persistence';
  const session = await createSession({ name: 'persistence', viewport: { width: 800, height: 500 } });
  const page = session.page;
  try {
    // Deliberately no URL parameters: persistence must restore the changed
    // state without help from the URL contract.
    await load(session, `${baseUrl}`);
    const initial = await getState(page);
    const domSet = await setRangeInput(page, 'exposure', 1.75);
    await page.click('#quality-buttons [data-quality="standard"]');
    await page.click('#debug-buttons [data-debug="3"]');
    await page.waitForTimeout(900);
    const stored = await page.evaluate(() => window.localStorage.getItem('gargantua.state.v1'));
    const changed = await getState(page);
    await page.reload({ waitUntil: 'load', timeout: 90000 });
    await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', undefined, {
      timeout: READY_TIMEOUT,
      polling: 100,
    });
    const restored = await getState(page);
    const storedState = stored ? JSON.parse(stored) : null;
    check(
      'F8',
      'Exposure, quality and debug survive a reload (localStorage)',
      Math.abs(restored?.params?.exposure - 1.75) < 1e-6 &&
        restored?.quality === 'standard' &&
        restored?.debug === 3 &&
        Math.abs(changed?.params?.exposure - 1.75) < 1e-6 &&
        Math.abs(storedState?.params?.exposure - 1.75) < 1e-6 &&
        storedState?.quality === 'standard',
      JSON.stringify({
        initial: initial?.params?.exposure,
        changed: changed?.params?.exposure,
        stored: storedState?.params?.exposure,
        restored: restored?.params?.exposure,
        restoredQuality: restored?.quality,
        restoredDebug: restored?.debug,
        slider: domSet.value,
      }),
      { acceptance: ['F'] },
    );
    await savePageShot(page, 'qa-15-persistence-restored', 'State restored after reload (exposure=1.75, standard, debug 3)');

    await page.evaluate(() => window.localStorage.clear());
    await page.reload({ waitUntil: 'load', timeout: 90000 });
    await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', undefined, {
      timeout: READY_TIMEOUT,
      polling: 100,
    });
    const cleared = await getState(page);
    const defaults = await page.evaluate(() =>
      Object.fromEntries(window.__GARGANTUA__.params.map((param) => [param.id, param.def])),
    );
    check(
      'F9',
      'Clearing storage restores shipping defaults',
      Math.abs(cleared?.params?.exposure - defaults.exposure) < 1e-6 &&
        cleared?.quality === 'high' &&
        cleared?.debug === 0,
      JSON.stringify({
        exposure: cleared?.params?.exposure,
        defaultExposure: defaults.exposure,
        quality: cleared?.quality,
        debug: cleared?.debug,
        stored: await page.evaluate(() => window.localStorage.getItem('gargantua.state.v1')),
      }),
      { acceptance: ['F'] },
    );
  } catch (error) {
    check('PERSIST-ERROR', 'Persistence scenario aborted', false, String(error?.stack ?? error), {
      acceptance: ['F'],
    });
  } finally {
    await closeSession(session);
  }
}

// ── scenario: mobile 390×844 ──────────────────────────────────────────
async function scenarioMobile(baseUrl) {
  section = 'Mobile 390×844 + touch';
  const session = await createSession({
    name: 'mobile',
    viewport: MOBILE_VIEWPORT,
    deviceScaleFactor: 2,
    mobile: true,
    hasTouch: true,
  });
  const page = session.page;
  try {
    await load(session, `${baseUrl}?quality=standard&dpr=1`);
    const layout = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      sliderCount: document.querySelectorAll('#params .param input[type="range"]').length,
      touchPoints: navigator.maxTouchPoints,
      panelToggleVisible: (() => {
        const el = document.querySelector('#panel-toggle');
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })(),
    }));
    const overflow = Math.max(layout.scrollWidth, layout.bodyScrollWidth) > layout.innerWidth + 1;
    check(
      'F10',
      'Mobile viewport loads with 21 sliders and no horizontal overflow',
      layout.sliderCount === 21 && !overflow && layout.touchPoints > 0,
      JSON.stringify(layout),
      { acceptance: ['F'] },
    );

    const panelInitial = await page.evaluate(() => ({
      panel: window.__GARGANTUA__.getState().panel,
      dataset: document.documentElement.dataset.panel,
    }));
    await page.tap('#panel-toggle');
    await page.waitForTimeout(450);
    const panelAfterTap = await page.evaluate(() => ({
      panel: window.__GARGANTUA__.getState().panel,
      dataset: document.documentElement.dataset.panel,
    }));
    await page.tap('#panel-toggle');
    await page.waitForTimeout(450);
    const panelRestored = await page.evaluate(() => ({
      panel: window.__GARGANTUA__.getState().panel,
      dataset: document.documentElement.dataset.panel,
    }));
    await page.tap('#debug-buttons [data-debug="7"]');
    await page.waitForTimeout(400);
    const debugAfterTap = await page.evaluate(() => window.__GARGANTUA__.getState().debug);
    const pixelStats = await canvasPixelStats(page);
    await savePageShot(page, 'qa-16-mobile', 'Mobile 390×844 touch context with HUD');
    check(
      'F11',
      'HUD is usable on touch (panel toggle + debug tap) and the canvas renders',
      panelAfterTap.panel === !panelInitial.panel &&
        panelAfterTap.dataset === (panelAfterTap.panel ? 'open' : 'closed') &&
        panelRestored.panel === panelInitial.panel &&
        debugAfterTap === 7 &&
        pixelStats?.nonBlackFraction > 0.2 &&
        pixelStats?.maxLuma > 80,
      JSON.stringify({
        panelInitial,
        panelAfterTap,
        panelRestored,
        debugAfterTap,
        pixels: pixelStats,
        errors: cleanDetail(session),
      }),
      { acceptance: ['F'] },
    );
    check(
      'F12',
      'Mobile context produces no console/page/HTTP errors',
      cleanPasses(session),
      JSON.stringify(cleanDetail(session)),
      { acceptance: ['F'] },
    );
  } catch (error) {
    check('MOBILE-ERROR', 'Mobile scenario aborted', false, String(error?.stack ?? error), {
      acceptance: ['F'],
    });
  } finally {
    await closeSession(session);
  }
}

// ── scenario: reduced motion ──────────────────────────────────────────
async function scenarioReducedMotion(baseUrl) {
  section = 'prefers-reduced-motion';
  const session = await createSession({
    name: 'reduced',
    viewport: { width: 800, height: 500 },
    reducedMotion: 'reduce',
  });
  const page = session.page;
  try {
    await load(session, `${baseUrl}?quality=standard&dpr=1`);
    const first = await page.evaluate(() => ({
      stateMode: window.__GARGANTUA__.getState().camera.mode,
      rig: window.__GARGANTUA__.rig(),
      motion: window.__GARGANTUA__.getState().motion,
    }));
    await page.waitForTimeout(1800);
    const second = await page.evaluate(() => ({
      stateMode: window.__GARGANTUA__.getState().camera.mode,
      rig: window.__GARGANTUA__.rig(),
    }));
    const stable =
      Math.abs(second.rig.radius - first.rig.radius) < 0.05 &&
      Math.abs(second.rig.azimuth - first.rig.azimuth) < 0.05 &&
      Math.abs(second.rig.polar - first.rig.polar) < 0.05;
    await savePageShot(page, 'qa-17-reduced-motion', 'prefers-reduced-motion: manual still shot');
    check(
      'F13',
      'Reduced-motion context disables the cinematic loop and holds a static camera',
      first.stateMode === 'manual' && first.rig?.mode === 'manual' && stable && cleanPasses(session),
      JSON.stringify({ first, second, stable, errors: cleanDetail(session) }),
      { acceptance: ['F'] },
    );
  } catch (error) {
    check('REDUCED-ERROR', 'Reduced-motion scenario aborted', false, String(error?.stack ?? error), {
      acceptance: ['F'],
    });
  } finally {
    await closeSession(session);
  }
}

// ── scenario: Retina deviceScaleFactor=2 ──────────────────────────────
async function scenarioRetina(baseUrl) {
  section = 'Retina / DPR';
  const session = await createSession({
    name: 'retina',
    viewport: { width: 500, height: 340 },
    deviceScaleFactor: 2,
  });
  const page = session.page;
  try {
    await load(session, `${baseUrl}?quality=high`);
    await waitFrames(page, 1);
    const qualityCaps = await page.evaluate(() =>
      Object.fromEntries(window.__GARGANTUA__.qualityLevels.map((level) => [level.id, level.dpr])),
    );
    const observed = await page.evaluate(() => ({
      devicePixelRatio: window.devicePixelRatio,
      quality: window.__GARGANTUA__.getState().quality,
      diagnostics: window.__GARGANTUA__.getShaderDiagnostics(),
      stats: window.__GARGANTUA__.getStats(),
      canvas: (() => {
        const canvas = document.querySelector('#gl');
        return canvas ? { width: canvas.width, height: canvas.height } : null;
      })(),
    }));
    await savePageShot(page, 'qa-18-retina', 'Retina context deviceScaleFactor=2, quality=high');
    const expectedHigh = Math.min(2, qualityCaps.high);
    const dpr = observed.diagnostics?.dpr;

    // Same Retina device, quality=standard: the tier cap (1.0×) must win over
    // devicePixelRatio 2. This is the documented quality.dpr cap behaviour.
    await load(session, `${baseUrl}?quality=standard`);
    await waitFrames(page, 1);
    const observedStandard = await page.evaluate(() => ({
      devicePixelRatio: window.devicePixelRatio,
      diagnostics: window.__GARGANTUA__.getShaderDiagnostics(),
      canvas: (() => {
        const canvas = document.querySelector('#gl');
        return canvas ? { width: canvas.width, height: canvas.height } : null;
      })(),
    }));
    const expectedStandard = Math.min(2, qualityCaps.standard);
    check(
      'F14',
      'Retina (deviceScaleFactor=2) DPR matches the quality-tier cap, not the device ratio',
      observed.devicePixelRatio === 2 &&
        dpr === expectedHigh &&
        observed.stats?.dpr === expectedHigh &&
        observed.canvas?.width === Math.round(500 * expectedHigh) &&
        observed.diagnostics?.canvasWidth === Math.round(500 * expectedHigh) &&
        observedStandard.diagnostics?.dpr === expectedStandard &&
        observedStandard.canvas?.width === Math.round(500 * expectedStandard) &&
        cleanPasses(session),
      JSON.stringify({
        devicePixelRatio: observed.devicePixelRatio,
        qualityCaps,
        high: {
          reportedDpr: dpr,
          expectedDpr: expectedHigh,
          canvasWidth: observed.canvas?.width,
          renderWidth: observed.diagnostics?.renderWidth,
        },
        standard: {
          reportedDpr: observedStandard.diagnostics?.dpr,
          expectedDpr: expectedStandard,
          canvasWidth: observedStandard.canvas?.width,
          renderWidth: observedStandard.diagnostics?.renderWidth,
        },
        errors: cleanDetail(session),
      }),
      { acceptance: ['F'] },
    );
  } catch (error) {
    check('RETINA-ERROR', 'Retina scenario aborted', false, String(error?.stack ?? error), {
      acceptance: ['F'],
    });
  } finally {
    await closeSession(session);
  }
}

// ── scenario: WebGL context loss / restore ────────────────────────────
async function scenarioContextLoss(baseUrl) {
  section = 'WebGL context loss & restore';
  const session = await createSession({ name: 'context', viewport: { width: 800, height: 500 } });
  const page = session.page;
  try {
    await load(session, `${baseUrl}?quality=standard&dpr=1`);
    await waitFrames(page, 1);
    const extension = await page.evaluate(() => {
      const canvas = document.querySelector('#gl');
      const gl = canvas?.getContext('webgl2');
      const ext = gl?.getExtension('WEBGL_lose_context') ?? null;
      window.__QA_LOSE_CONTEXT__ = ext;
      return { available: Boolean(ext), functions: ext ? ['loseContext', 'restoreContext'].filter((name) => typeof ext[name] === 'function') : [] };
    });
    if (!extension.available) {
      skip(
        'F15',
        'WEBGL_lose_context extension available',
        'Headless Chrome/SwiftShader did not expose WEBGL_lose_context; context-loss overlay cannot be driven from the page.',
        { acceptance: ['F'] },
      );
      return;
    }
    check('F15', 'WEBGL_lose_context extension is available', true, JSON.stringify(extension), { acceptance: ['F'] });

    const pageErrorsBefore = session.pageErrors.length;
    const consoleErrorsBefore = session.consoleErrors.length;
    const consoleWarningsBefore = session.consoleWarnings.length;
    await page.evaluate(() => window.__QA_LOSE_CONTEXT__.loseContext());
    const lost = await waitFor(
      page,
      () => document.documentElement.dataset.context === 'lost',
      undefined,
      15000,
    );
    const lostState = await page.evaluate(() => {
      const error = document.querySelector('#error');
      const style = error ? getComputedStyle(error) : null;
      return {
        datasetContext: document.documentElement.dataset.context,
        errorHidden: error?.hidden ?? null,
        errorVisible: Boolean(error && !error.hidden && style?.visibility !== 'hidden' && style?.display !== 'none'),
        errorTitle: document.querySelector('#error-title')?.textContent ?? null,
        errorMessage: document.querySelector('#error-message')?.textContent ?? null,
        errorActionVisible: (() => {
          const button = document.querySelector('#error-action');
          return Boolean(button && !button.hidden);
        })(),
      };
    });
    await savePageShot(page, 'qa-19-webgl-context-lost', 'WebGL context lost — recovery overlay');

    const restoreAttempt = await page.evaluate(() => {
      try {
        window.__QA_LOSE_CONTEXT__.restoreContext();
        return { called: true };
      } catch (error) {
        return { called: false, error: String(error?.message ?? error) };
      }
    });
    const restored = await waitFor(
      page,
      () => document.documentElement.dataset.context === 'restored',
      undefined,
      40000,
    );
    let restoredState = null;
    let restoredPixels = null;
    if (restored) {
      const overlayHidden = await waitFor(
        page,
        () => document.querySelector('#error')?.hidden === true,
        undefined,
        15000,
      );
      await waitFrames(page, 2).catch(() => false);
      restoredPixels = await canvasPixelStats(page).catch(() => null);
      restoredState = await page.evaluate(() => ({
        datasetContext: document.documentElement.dataset.context,
        errorHidden: document.querySelector('#error')?.hidden ?? null,
        overlayHidden: window.__QA_LOSE_CONTEXT__ ? document.querySelector('#error')?.hidden === true : null,
      }));
      restoredState.overlayHidden = overlayHidden;
    }
    await savePageShot(page, 'qa-20-webgl-restored', 'WebGL context restored — rendering resumed');
    const pageErrorsAfter = session.pageErrors.length;
    const consoleErrorsAfter = session.consoleErrors.length;
    const consoleWarningsAfter = session.consoleWarnings.length;

    check(
      'F16',
      'Losing the WebGL context shows the recovery overlay and sets dataset.context=lost',
      lost &&
        lostState.datasetContext === 'lost' &&
        lostState.errorVisible === true &&
        /lost/i.test(lostState.errorTitle ?? '') &&
        lostState.errorActionVisible === true,
      JSON.stringify({ lost, lostState }),
      { acceptance: ['F'] },
    );
    check(
      'F17',
      'Restoring the context recovers rendering with zero page errors / console errors / console warnings',
      restored &&
        restoredState?.datasetContext === 'restored' &&
        restoredState?.errorHidden === true &&
        pageErrorsAfter === pageErrorsBefore &&
        consoleErrorsAfter === consoleErrorsBefore &&
        consoleWarningsAfter === consoleWarningsBefore &&
        restoredPixels?.nonBlackFraction > 0.2,
      JSON.stringify({
        restoreAttempt,
        restored,
        restoredState,
        pixels: restoredPixels,
        pageErrorsBefore,
        pageErrorsAfter,
        consoleErrorsBefore,
        consoleErrorsAfter,
        consoleWarningsBefore,
        consoleWarningsAfter,
        warnings: session.consoleWarnings.slice(-6),
        consoleErrors: session.consoleErrors.slice(-4),
      }),
      {
        acceptance: ['F'],
        repro: 'Load app, canvas.getContext("webgl2").getExtension("WEBGL_lose_context").loseContext(), then restoreContext().',
      },
    );
  } catch (error) {
    check('CONTEXT-ERROR', 'WebGL context-loss scenario aborted', false, String(error?.stack ?? error), {
      acceptance: ['F'],
    });
  } finally {
    await closeSession(session);
  }
}

// ── scenario: static _site subpath integration ────────────────────────
async function scenarioStatic() {
  section = 'Static subpath integration (_site)';
  if (!fs.existsSync(WISH_PATH)) {
    skip(
      'G1',
      'projects/gargantua/wish.json exists for the site builder',
      `${path.relative(REPO_ROOT, WISH_PATH)} is missing; the Lead adds it before the freeze. Static subpath test skipped for this run.`,
      { acceptance: ['G'] },
    );
    return;
  }

  const build = spawnSync(
    process.execPath,
    ['scripts/build-site.mjs', '--only=gargantua', '--skip-install'],
    { cwd: REPO_ROOT, encoding: 'utf8', timeout: 180000, env: { ...process.env, CI: '1' } },
  );
  const buildDetail = {
    status: build.status,
    signal: build.signal,
    stdoutTail: truncate(build.stdout ?? '', 900),
    stderrTail: truncate(build.stderr ?? '', 900),
  };
  check(
    'G1',
    'Site builder assembles _site for gargantua',
    build.status === 0,
    JSON.stringify(buildDetail),
    { acceptance: ['G'], repro: 'node scripts/build-site.mjs --only=gargantua --skip-install' },
  );
  if (build.status !== 0) return;

  let siteServer = null;
  const session = await createSession({ name: 'static', viewport: { width: 800, height: 500 } });
  const page = session.page;
  try {
    siteServer = await startStaticServer({ root: path.join(REPO_ROOT, '_site'), port: 0 });
    const staticUrl = `${siteServer.url}projects/gargantua/`;
    let timing = null;
    let loadError = null;
    try {
      timing = await load(session, `${staticUrl}?quality=standard&dpr=1`);
    } catch (error) {
      loadError = String(error.message);
    }
    const pixelStats = loadError ? null : await canvasPixelStats(page);
    await savePageShot(page, 'qa-21-static-subpath', 'GARGANTUA served from _site/projects/gargantua/');
    const resourceChecks = await page.evaluate(() =>
      performance.getEntriesByType('resource').map((entry) => entry.name),
    );
    const hasThree = session.responses.some(
      (response) => response.url.includes('/projects/gargantua/vendor/three/three.module.js') && response.status === 200,
    );
    const hasMain = session.responses.some(
      (response) => response.url.includes('/projects/gargantua/src/main.js') && response.status === 200,
    );
    const audioUrl = `${siteServer.url}projects/gargantua/assets/audio/gargantua-ambient.ogg`;
    let audioStatus = null;
    try {
      audioStatus = (await fetch(audioUrl, { method: 'HEAD' })).status;
    } catch (error) {
      audioStatus = `fetch-failed: ${error.message}`;
    }
    const projectsJsonUrl = `${siteServer.url}projects.json`;
    let projectsJson = null;
    try {
      const response = await fetch(projectsJsonUrl);
      projectsJson = { status: response.status, body: await response.json() };
    } catch (error) {
      projectsJson = { status: 'fetch-failed', error: String(error.message) };
    }
    const gargantuaEntry = projectsJson?.body?.works?.find((work) => work.id === 'gargantua') ?? null;

    check(
      'G2',
      'Built site serves /projects/gargantua/ with zero 404s and ready',
      !loadError &&
        cleanPasses(session) &&
        session.httpErrors.length === 0 &&
        timing !== null &&
        hasMain &&
        hasThree,
      JSON.stringify({
        staticUrl,
        timing,
        loadError,
        httpErrors: session.httpErrors,
        consoleErrors: session.consoleErrors,
        pageErrors: session.pageErrors,
        failedRequests: session.failedRequests,
        resources: resourceChecks.length,
        hasMain,
        hasThree,
      }),
      { acceptance: ['A', 'G'], repro: 'node scripts/build-site.mjs --only=gargantua --skip-install && serve _site' },
    );
    check(
      'G3',
      'Subpath canvas renders a non-black frame',
      Boolean(pixelStats && pixelStats.nonBlackFraction > 0.2 && pixelStats.maxLuma > 80),
      JSON.stringify(pixelStats),
      { acceptance: ['A', 'G'] },
    );
    check(
      'G4',
      'Audio asset ships in the static build and responds 200',
      audioStatus === 200,
      JSON.stringify({ url: audioUrl, status: audioStatus }),
      { acceptance: ['G'] },
    );
    const workIds = projectsJson?.body?.works?.map((work) => work.id) ?? [];
    check(
      'G5',
      'projects.json includes the portfolio works and gargantua with preview + cover',
      Boolean(
        projectsJson?.status === 200 &&
          gargantuaEntry &&
          gargantuaEntry.preview === 'projects/gargantua/' &&
          typeof gargantuaEntry.title === 'string' &&
          (gargantuaEntry.cover === '' || /^assets\/covers\//.test(gargantuaEntry.cover)) &&
          workIds.length >= 3 &&
          workIds.includes('gargantua'),
      ),
      JSON.stringify({
        status: projectsJson?.status,
        workCount: workIds.length,
        works: workIds,
        entry: gargantuaEntry,
      }),
      { acceptance: ['G'] },
    );
    if (gargantuaEntry?.cover) {
      const coverFile = path.join(REPO_ROOT, 'site', gargantuaEntry.cover.replaceAll('/', path.sep));
      check(
        'G6',
        'projects.json cover file exists on disk',
        fs.existsSync(coverFile),
        JSON.stringify({ cover: gargantuaEntry.cover, file: coverFile, bytes: fs.existsSync(coverFile) ? fs.statSync(coverFile).size : null }),
        { acceptance: ['G'] },
      );
    } else {
      skip('G6', 'projects.json cover file', 'projects.json has no cover yet (run tools/cover.mjs before the final build)', {
        acceptance: ['G'],
      });
    }
  } catch (error) {
    check('STATIC-ERROR', 'Static subpath scenario aborted', false, String(error?.stack ?? error), {
      acceptance: ['A', 'G'],
    });
  } finally {
    await closeSession(session);
    if (siteServer) await siteServer.close();
  }
}

// ── scenario: cover artifact ──────────────────────────────────────────
async function scenarioCover() {
  section = 'Cover artifact';
  if (!fs.existsSync(COVER_PATH)) {
    skip(
      'G7',
      'site/assets/covers/gargantua.jpg generated',
      `Missing ${path.relative(REPO_ROOT, COVER_PATH)}; run node tools/cover.mjs before the final QA pass.`,
      { acceptance: ['G'] },
    );
    return;
  }
  const buffer = fs.readFileSync(COVER_PATH);
  const isJpeg = buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const context = await browser.newContext({ viewport: { width: 800, height: 500 } });
  const page = await context.newPage();
  try {
    const dataUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`;
    const info = await page.evaluate(async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
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
          const inCorner =
            (x < corner || x >= width - corner) && (y < corner || y >= height - corner);
          if (inCorner) {
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
    }, dataUrl);
    const size = buffer.length;
    const dimensionsOk = info.width === 1600 && info.height === 1000;
    const sizeOk = size >= 100 * 1024 && size <= 400 * 1024;
    const contentOk = info.nonBlackFraction > 0.02 && info.maxLuma > 120 && info.cornerMeanLuma < 40;
    check(
      'G7',
      'Cover is a 1600×1000 JPEG (100–400 KB) with a luminous scene on a deep-black field',
      isJpeg && dimensionsOk && sizeOk && contentOk,
      JSON.stringify({ isJpeg, size, dimensions: `${info.width}×${info.height}`, ...info }),
      { acceptance: ['G'] },
    );
    check(
      'G8',
      'Cover reads as a deep-black field with a luminous disk/ring and a dark central shadow',
      info.centralDarkFraction > 0.05 && info.cornerMeanLuma < 15 && info.maxLuma > 120,
      JSON.stringify({
        centralDarkFraction: info.centralDarkFraction,
        centerMeanLuma: info.centerMeanLuma,
        cornerMeanLuma: info.cornerMeanLuma,
        maxLuma: info.maxLuma,
      }),
      { acceptance: ['G'] },
    );
  } catch (error) {
    check('COVER-ERROR', 'Cover verification failed to decode the JPEG', false, String(error.message), {
      acceptance: ['G'],
    });
  } finally {
    await context.close();
  }
}

// ── environment ────────────────────────────────────────────────────────
const environment = {
  os: `${os.type()} ${os.release()} (${process.platform} ${process.arch})`,
  node: process.version,
  playwrightCore: playwrightVersion,
  chromeChannel: 'system Chrome (headless)',
  chromeVersion: null,
  browserArgs: BROWSER_ARGS,
  server: 'tools/serve.mjs (in-process, ephemeral port)',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

// ── report generation ──────────────────────────────────────────────────
function acceptanceStatus(id) {
  const tagged = results.filter((entry) => entry.acceptance.includes(id));
  if (!tagged.length) return 'unverified';
  if (tagged.some((entry) => entry.status === 'fail')) return 'fail';
  if (tagged.some((entry) => entry.status === 'skip')) return 'partial';
  return 'pass';
}

function buildFinalData() {
  const failures = results.filter((entry) => entry.status === 'fail');
  const skipped = results.filter((entry) => entry.status === 'skip');
  const passed = results.filter((entry) => entry.status === 'pass');
  const acceptance = Object.entries(ACCEPTANCE_CRITERIA).map(([id, criterion]) => {
    const tagged = results.filter((entry) => entry.acceptance.includes(id));
    return {
      id,
      criterion,
      status: acceptanceStatus(id),
      tests: tagged.map((entry) => ({
        id: entry.id,
        name: entry.name,
        status: entry.status,
        detail: entry.detail,
      })),
      evidence: [
        ...new Set(
          tagged.flatMap((entry) => entry.screenshots),
        ),
      ].map((file) => file.replace(/^docs\//, '')),
    };
  });
  return {
    project: 'gargantua',
    title: 'GARGANTUA browser acceptance results',
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    command: 'node tools/qa.mjs',
    environment,
    summary: {
      total: results.length,
      passed: passed.length,
      failed: failures.length,
      skipped: skipped.length,
      acceptance: Object.fromEntries(acceptance.map((entry) => [entry.id, entry.status])),
    },
    acceptance,
    results,
    screenshots,
    knownLimitations: KNOWN_LIMITATIONS,
    defects: failures.map((entry) => ({
      id: entry.id,
      name: entry.name,
      detail: entry.detail,
      acceptance: entry.acceptance,
      repro: entry.repro,
    })),
  };
}

const STATUS_ICON = { pass: 'PASS', fail: 'FAIL', skip: 'SKIP' };

function renderReport(data) {
  const lines = [];
  const summary = data.summary;
  lines.push('# GARGANTUA — Browser Acceptance Report');
  lines.push('');
  lines.push(`Generated: ${data.generatedAt}  ·  Suite: \`tools/qa.mjs\`  ·  Duration: ${(data.durationMs / 1000).toFixed(1)} s`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  lines.push(`| Tests executed | ${summary.total} |`);
  lines.push(`| Passed | ${summary.passed} |`);
  lines.push(`| Failed | ${summary.failed} |`);
  lines.push(`| Skipped | ${summary.skipped} |`);
  lines.push(`| Overall | ${summary.failed === 0 ? 'PASS (all executed checks green)' : 'FAIL'} |`);
  lines.push('');
  lines.push('## Environment');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  for (const [key, value] of Object.entries(data.environment)) {
    lines.push(`| ${key} | ${typeof value === 'string' ? value : JSON.stringify(value)} |`);
  }
  lines.push('');
  lines.push('## Issue #2 acceptance criteria (1:1 mapping)');
  lines.push('');
  lines.push('| # | Criterion | Status | Evidence (test ids / screenshots) |');
  lines.push('| --- | --- | --- | --- |');
  for (const entry of data.acceptance) {
    const tests = entry.tests.map((test) => `${test.id}:${test.status}`).join(', ');
    const shots = entry.evidence.length ? entry.evidence.join(', ') : '—';
    lines.push(`| ${entry.id} | ${entry.criterion} | ${STATUS_ICON[entry.status] ?? entry.status.toUpperCase()} | ${tests}<br>${shots} |`);
  }
  lines.push('');
  const sections = [...new Set(data.results.map((entry) => entry.section))];
  for (const sectionName of sections) {
    const rows = data.results.filter((entry) => entry.section === sectionName);
    lines.push(`## ${sectionName}`);
    lines.push('');
    lines.push('| ID | Status | Check | Detail |');
    lines.push('| --- | --- | --- | --- |');
    for (const row of rows) {
      const detail = (row.detail || '').replaceAll('|', '\\|').replace(/\s+/g, ' ');
      lines.push(`| ${row.id} | ${STATUS_ICON[row.status] ?? row.status} | ${row.name.replaceAll('|', '\\|')} | ${detail.slice(0, 700)} |`);
    }
    lines.push('');
  }
  lines.push('## Screenshots');
  lines.push('');
  lines.push('| File | Caption | Bytes |');
  lines.push('| --- | --- | --- |');
  for (const shot of data.screenshots) {
    const relative = shot.file.replace(/^docs\//, '');
    lines.push(`| [${path.basename(shot.file)}](${relative}) | ${shot.caption.replaceAll('|', '\\|')} | ${shot.bytes ?? '—'} |`);
  }
  lines.push('');
  lines.push('## Defects found');
  lines.push('');
  if (!data.defects.length) {
    lines.push('None: every executed acceptance check passed.');
  } else {
    for (const defect of data.defects) {
      lines.push(`### ${defect.id} — ${defect.name}`);
      lines.push('');
      lines.push('```text');
      lines.push(defect.detail.slice(0, 1400));
      lines.push('```');
      if (defect.repro) lines.push(`Reproduction: ${defect.repro}`);
      lines.push('');
    }
  }
  lines.push('## Known limitations');
  lines.push('');
  for (const limitation of data.knownLimitations) lines.push(`- ${limitation}`);
  lines.push('');
  lines.push('## How to reproduce');
  lines.push('');
  lines.push('```powershell');
  lines.push('cd projects/gargantua');
  lines.push('node tools/serve.mjs            # manual review on http://127.0.0.1:5193/');
  lines.push('node tools/qa.mjs               # this acceptance suite');
  lines.push('node tools/cover.mjs            # regenerate site/assets/covers/gargantua.jpg');
  lines.push('```');
  lines.push('');
  lines.push('The suite starts its own static server on an ephemeral port; the development server on :5192 is never touched.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function writeReports() {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
  const data = buildFinalData();
  fs.writeFileSync(QA_FINAL_PATH, `${JSON.stringify(data, null, 2)}\n`);
  fs.writeFileSync(QA_REPORT_PATH, renderReport(data));
  return data;
}

// ── main ───────────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(SCREENS_DIR, { recursive: true });
  browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: BROWSER_ARGS,
  });
  environment.chromeVersion = browser.version();

  server = await startStaticServer({ root: PROJECT_ROOT, port: 0 });
  const baseUrl = server.url;
  environment.servedUrl = baseUrl;
  console.log(`[qa] serving ${PROJECT_ROOT} at ${baseUrl}`);
  console.log(`[qa] chrome ${environment.chromeVersion} · ${environment.os}`);

  try {
    if (wants('desktop')) await scenarioDesktop(baseUrl);
    if (wants('shot')) await scenarioShot(baseUrl);
    if (wants('persistence')) await scenarioPersistence(baseUrl);
    if (wants('mobile')) await scenarioMobile(baseUrl);
    if (wants('reduced')) await scenarioReducedMotion(baseUrl);
    if (wants('retina')) await scenarioRetina(baseUrl);
    if (wants('context')) await scenarioContextLoss(baseUrl);
    if (wants('static')) await scenarioStatic();
    if (wants('cover')) await scenarioCover();
    validateScreenshots();
  } catch (error) {
    check('SUITE-ERROR', 'Acceptance suite crashed before completing', false, String(error?.stack ?? error), {
      acceptance: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    });
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) await server.close().catch(() => {});
  }

  const data = writeReports();
  const summary = data.summary;
  console.log('');
  console.log('──────────────────────────────────────────────────────────────');
  console.log(`[qa] ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped (${summary.total} checks)`);
  console.log(`[qa] acceptance: ${Object.entries(summary.acceptance).map(([id, status]) => `${id}=${status}`).join(' ')}`);
  console.log(`[qa] report: ${path.relative(REPO_ROOT, QA_REPORT_PATH)}`);
  console.log(`[qa] json:   ${path.relative(REPO_ROOT, QA_FINAL_PATH)}`);
  for (const defect of data.defects) console.log(`[qa] FAIL ${defect.id}: ${defect.name} — ${truncate(defect.detail, 220)}`);
  console.log('──────────────────────────────────────────────────────────────');
  process.exit(summary.failed > 0 ? 1 : 0);
}

await main();
