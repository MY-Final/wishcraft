/**
 * AQUA PURE — 360° wrap label artwork.
 *
 * The whole label is painted on one 2048 × 716 Canvas 2D surface. Everything is
 * vector / typography — no bitmaps, no web fonts, no network — so the texture
 * is deterministic and can be regenerated at any resolution from CONFIG.
 *
 * Wrap-seam rule: all full-width decoration is horizontally periodic (waves
 * whose wavelength divides the canvas width, 8 px pinstripes) and every text
 * block keeps a generous margin from x = 0 / x = width, so the left and right
 * edges join invisibly around the bottle.
 */
import * as THREE from 'three';
import { CONFIG } from './config.js';

const FONT_SANS = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
const FONT_SERIF = 'Georgia, "Times New Roman", serif';
const FONT_MONO = '"Cascadia Mono", Consolas, "Courier New", monospace';

const INK = '#0e2f52';
const INK_SOFT = '#46617c';
const BLUE = '#1a6fd4';
const BLUE_DEEP = '#0d4d9c';
const GOLD = '#b08d52';
const HAIRLINE = 'rgba(14, 47, 82, 0.22)';

/* ── canvas helpers ─────────────────────────────────────────────────────── */

function roundedRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

function trackedWidth(ctx, text, tracking) {
  const chars = Array.from(text);
  let width = 0;
  for (const char of chars) width += ctx.measureText(char).width + tracking;
  return width - (chars.length ? tracking : 0);
}

/** Draw letters with explicit tracking (works in every Canvas 2D engine). */
function drawTrackedText(ctx, text, x, y, tracking, align = 'center') {
  const chars = Array.from(text);
  const widths = chars.map((char) => ctx.measureText(char).width);
  const total =
    widths.reduce((sum, width) => sum + width, 0) + tracking * Math.max(0, chars.length - 1);
  let cursor = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const previousAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  for (let i = 0; i < chars.length; i += 1) {
    ctx.fillText(chars[i], cursor, y);
    cursor += widths[i] + tracking;
  }
  ctx.textAlign = previousAlign;
}

function drawDroplet(ctx, cx, cy, size, fill, stroke, lineWidth = 1) {
  const radius = size * 0.36;
  const top = cy - size * 0.55;
  const circleY = cy + size * 0.16;

  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.bezierCurveTo(
    cx - size * 0.2,
    top + size * 0.22,
    cx - radius,
    circleY - size * 0.24,
    cx - radius,
    circleY,
  );
  ctx.arc(cx, circleY, radius, Math.PI, 0, true);
  ctx.bezierCurveTo(
    cx + radius,
    circleY - size * 0.24,
    cx + size * 0.2,
    top + size * 0.22,
    cx,
    top,
  );
  ctx.closePath();

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

/** A periodically continuous sine wave; wavelength must divide the width. */
function drawWave(ctx, width, baseY, amplitude, wavelength, color, lineWidth = 1, phase = 0) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  for (let x = 0; x <= width; x += 4) {
    const y = baseY + Math.sin((x / wavelength) * Math.PI * 2 + phase) * amplitude;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

/* ── artwork ────────────────────────────────────────────────────────────── */

/** Smooth Catmull-Rom polyline — rolling ridgelines without polygon spikes. */
function smoothCurveThrough(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2[0], p2[1]);
  }
}

/** Layered mountain-and-lake vignette inside a softly rounded window. */
function drawLandscape(ctx, cx, top, width, height) {
  const x0 = cx - width / 2;
  const y1 = top + height;
  const horizon = top + height * 0.64;

  ctx.save();
  roundedRectPath(ctx, x0, top, width, height, 12);
  ctx.clip();

  // Sky: cool glacier light.
  const sky = ctx.createLinearGradient(0, top, 0, horizon);
  sky.addColorStop(0, '#c4dff5');
  sky.addColorStop(0.55, '#e4f1fc');
  sky.addColorStop(1, '#f7fcff');
  ctx.fillStyle = sky;
  ctx.fillRect(x0, top, width, height);

  // Low sun behind the ridge.
  const sunX = x0 + width * 0.76;
  const sunY = top + height * 0.27;
  const glow = ctx.createRadialGradient(sunX, sunY, 1, sunX, sunY, height * 0.4);
  glow.addColorStop(0, 'rgba(255, 248, 222, 0.95)');
  glow.addColorStop(0.3, 'rgba(255, 240, 198, 0.4)');
  glow.addColorStop(1, 'rgba(255, 240, 198, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x0, top, width, height);

  // Far ridge — atmospheric, almost dissolving into the haze.
  const farRidge = [
    [x0, horizon],
    [x0 + width * 0.09, top + height * 0.45],
    [x0 + width * 0.2, top + height * 0.27],
    [x0 + width * 0.31, top + height * 0.39],
    [x0 + width * 0.42, top + height * 0.22],
    [x0 + width * 0.54, top + height * 0.36],
    [x0 + width * 0.67, top + height * 0.25],
    [x0 + width * 0.8, top + height * 0.4],
    [x0 + width * 0.91, top + height * 0.32],
    [x0 + width, horizon],
  ];
  smoothCurveThrough(ctx, farRidge);
  ctx.lineTo(x0 + width, horizon + 2);
  ctx.lineTo(x0, horizon + 2);
  ctx.closePath();
  const far = ctx.createLinearGradient(0, top + height * 0.18, 0, horizon);
  far.addColorStop(0, 'rgba(166, 200, 231, 0.92)');
  far.addColorStop(1, 'rgba(214, 232, 246, 0.92)');
  ctx.fillStyle = far;
  ctx.fill();

  // A band of valley mist sits on the horizon line.
  const mist = ctx.createLinearGradient(0, horizon - height * 0.16, 0, horizon + height * 0.04);
  mist.addColorStop(0, 'rgba(246, 252, 255, 0)');
  mist.addColorStop(0.7, 'rgba(246, 252, 255, 0.62)');
  mist.addColorStop(1, 'rgba(246, 252, 255, 0)');
  ctx.fillStyle = mist;
  ctx.fillRect(x0, horizon - height * 0.16, width, height * 0.2);

  // Main ridge — deeper, softer watercolour blue.
  const mainRidge = [
    [x0, horizon],
    [x0 + width * 0.07, top + height * 0.55],
    [x0 + width * 0.17, top + height * 0.39],
    [x0 + width * 0.27, top + height * 0.49],
    [x0 + width * 0.38, top + height * 0.33],
    [x0 + width * 0.5, top + height * 0.45],
    [x0 + width * 0.63, top + height * 0.36],
    [x0 + width * 0.76, top + height * 0.5],
    [x0 + width * 0.88, top + height * 0.42],
    [x0 + width, horizon],
  ];
  smoothCurveThrough(ctx, mainRidge);
  ctx.lineTo(x0 + width, horizon + 2);
  ctx.lineTo(x0, horizon + 2);
  ctx.closePath();
  const near = ctx.createLinearGradient(0, top + height * 0.28, 0, horizon);
  near.addColorStop(0, 'rgba(61, 122, 178, 0.9)');
  near.addColorStop(0.6, 'rgba(96, 153, 201, 0.82)');
  near.addColorStop(1, 'rgba(150, 192, 226, 0.55)');
  ctx.fillStyle = near;
  ctx.fill();

  // Soft snow caps on the two dominant peaks.
  const snowPeaks = [
    { x: x0 + width * 0.38, y: top + height * 0.33, spread: width * 0.052 },
    { x: x0 + width * 0.63, y: top + height * 0.36, spread: width * 0.045 },
  ];
  ctx.fillStyle = 'rgba(251, 254, 255, 0.9)';
  for (const peak of snowPeaks) {
    ctx.beginPath();
    ctx.moveTo(peak.x, peak.y);
    ctx.bezierCurveTo(
      peak.x + peak.spread * 0.3,
      peak.y + height * 0.05,
      peak.x + peak.spread * 0.8,
      peak.y + height * 0.09,
      peak.x + peak.spread,
      peak.y + height * 0.13,
    );
    ctx.bezierCurveTo(
      peak.x + peak.spread * 0.4,
      peak.y + height * 0.1,
      peak.x + peak.spread * 0.1,
      peak.y + height * 0.12,
      peak.x,
      peak.y + height * 0.155,
    );
    ctx.bezierCurveTo(
      peak.x - peak.spread * 0.2,
      peak.y + height * 0.11,
      peak.x - peak.spread * 0.65,
      peak.y + height * 0.08,
      peak.x - peak.spread,
      peak.y + height * 0.135,
    );
    ctx.closePath();
    ctx.fill();
  }

  // Lake below the ridge.
  const lake = ctx.createLinearGradient(0, horizon, 0, y1);
  lake.addColorStop(0, '#5b97cc');
  lake.addColorStop(0.4, '#8cb9df');
  lake.addColorStop(1, '#deedf9');
  ctx.fillStyle = lake;
  ctx.fillRect(x0, horizon, width, y1 - horizon);

  // Warm gold waterline.
  ctx.fillStyle = 'rgba(176, 141, 82, 0.5)';
  ctx.fillRect(x0, horizon - 1.1, width, 1.2);

  // Still-water reflections: short horizontal strokes, denser near the shore.
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 16; i += 1) {
    const y = horizon + 8 + i * ((y1 - horizon - 12) / 16);
    const spread = width * (0.16 + i * 0.017);
    const offset = Math.sin(i * 1.9) * width * 0.12;
    ctx.globalAlpha = 0.45 - i * 0.022;
    ctx.beginPath();
    ctx.moveTo(cx - spread + offset, y);
    ctx.lineTo(cx + spread * 0.85 + offset, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();

  // Fine frame.
  ctx.save();
  ctx.strokeStyle = 'rgba(14, 47, 82, 0.16)';
  ctx.lineWidth = 1;
  roundedRectPath(ctx, x0, top, width, height, 12);
  ctx.stroke();
  ctx.restore();
}

function drawBarcode(ctx, x, y, width, height, value) {
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  roundedRectPath(ctx, x, y, width, height, 4);
  ctx.fill();

  // Deterministic pseudo-random bar pattern (no external barcode font).
  let seed = 0x1a6fd4;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  const innerX = x + 15;
  const innerW = width - 30;
  const barTop = y + 13;
  const barBottom = y + height - 36;
  let cursor = innerX;
  let guard = true;
  while (cursor < innerX + innerW - 2) {
    const barW = guard ? 3.2 : 1.1 + random() * 3.4;
    const gap = guard ? 5.5 : 1.0 + random() * 2.8;
    ctx.fillStyle = 'rgba(12, 26, 42, 0.9)';
    ctx.fillRect(cursor, barTop, Math.min(barW, innerX + innerW - cursor), barBottom - barTop);
    cursor += barW + gap;
    guard = !guard && random() > 0.62;
  }
  ctx.fillRect(innerX, barTop, innerW, 2.2);
  ctx.fillRect(innerX, barBottom - 2.2, innerW, 2.2);

  ctx.fillStyle = '#172b42';
  ctx.font = `500 17px ${FONT_MONO}`;
  ctx.textAlign = 'center';
  ctx.fillText(value, x + width / 2, y + height - 12);
  ctx.textAlign = 'left';
  ctx.restore();
}

function drawRecyclingMark(ctx, cx, cy, radius) {
  ctx.save();
  ctx.strokeStyle = 'rgba(14, 47, 82, 0.68)';
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius);
  ctx.lineTo(cx + radius * 0.92, cy + radius * 0.62);
  ctx.lineTo(cx - radius * 0.92, cy + radius * 0.62);
  ctx.closePath();
  ctx.stroke();

  // Arrow heads on all three corners.
  const corners = [
    [cx, cy - radius, 0],
    [cx + radius * 0.92, cy + radius * 0.62, 2],
    [cx - radius * 0.92, cy + radius * 0.62, -2],
  ];
  for (const [x, y] of corners) {
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 3);
    ctx.lineTo(x, y - 4);
    ctx.lineTo(x + 5, y + 3);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(14, 47, 82, 0.78)';
  ctx.font = `600 ${Math.round(radius * 0.44)}px ${FONT_SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText('PET', cx, cy + radius * 0.18);
  ctx.font = `500 ${Math.round(radius * 0.3)}px ${FONT_MONO}`;
  ctx.fillText('01', cx, cy + radius * 0.48);
  ctx.textAlign = 'left';
  ctx.restore();
}

/* ── panels ─────────────────────────────────────────────────────────────── */

function drawFrontPanel(ctx, cx, H) {
  // Droplet seal + origin line.
  drawDroplet(ctx, cx, 48, 22, BLUE, null);

  ctx.fillStyle = INK_SOFT;
  ctx.font = `600 17px ${FONT_SANS}`;
  drawTrackedText(ctx, 'NATURAL MINERAL WATER', cx, 86, 3.2);

  drawLandscape(ctx, cx, 106, 386, 152);

  // Wordmark: high-contrast serif, wide set — classic premium water typography.
  ctx.fillStyle = INK;
  ctx.font = `600 114px ${FONT_SERIF}`;
  drawTrackedText(ctx, 'AQUA', cx, 372, 7);
  ctx.font = `400 114px ${FONT_SERIF}`;
  drawTrackedText(ctx, 'PURE', cx, 474, 9);

  // Gold rule with a tiny diamond.
  const ruleW = 164;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - ruleW / 2, 505);
  ctx.lineTo(cx + ruleW / 2, 505);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.moveTo(cx, 501.5);
  ctx.lineTo(cx + 3.6, 505);
  ctx.lineTo(cx, 508.5);
  ctx.lineTo(cx - 3.6, 505);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = INK;
  ctx.font = `450 42px ${FONT_SANS}`;
  drawTrackedText(ctx, '500 ml', cx, 557, 2.4);

  ctx.fillStyle = INK_SOFT;
  ctx.font = `500 14px ${FONT_SANS}`;
  drawTrackedText(ctx, 'STILL MINERAL WATER', cx, 597, 3.4);

  ctx.fillStyle = 'rgba(70, 97, 124, 0.82)';
  ctx.font = `500 11.5px ${FONT_SANS}`;
  drawTrackedText(ctx, 'SINCE 2019 · KUNLUN SPRING · 100% PURE', cx, 663, 2.1);
}

function drawSidePanel(ctx, cx, variant) {
  ctx.fillStyle = INK_SOFT;
  ctx.font = `600 16px ${FONT_SANS}`;
  drawTrackedText(ctx, 'AQUA PURE', cx, 62, 4);

  ctx.strokeStyle = 'rgba(176, 141, 82, 0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 58, 88);
  ctx.lineTo(cx + 58, 88);
  ctx.stroke();

  // Oversized watermark droplet.
  drawDroplet(ctx, cx, 228, 168, 'rgba(26, 111, 212, 0.05)', 'rgba(26, 111, 212, 0.17)', 1);

  // Restrained side typography — the panel centre is the silhouette point of
  // a front view, so it stays small and low-contrast instead of shouting a
  // half-cut word at the label edge.
  ctx.fillStyle = 'rgba(14, 47, 82, 0.62)';
  ctx.font = `500 31px ${FONT_SERIF}`;
  drawTrackedText(ctx, variant.word, cx, 352, 7);

  ctx.fillStyle = 'rgba(70, 97, 124, 0.72)';
  ctx.font = `500 10.5px ${FONT_SANS}`;
  drawTrackedText(ctx, variant.line, cx, 378, 2.5);

  // pH badge.
  ctx.save();
  ctx.strokeStyle = 'rgba(176, 141, 82, 0.7)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, 458, 40, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = `600 18px ${FONT_SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText('pH 7.4', cx, 452);
  ctx.fillStyle = INK_SOFT;
  ctx.font = `500 9px ${FONT_SANS}`;
  ctx.fillText('NEUTRAL', cx, 469);
  ctx.textAlign = 'left';
  ctx.restore();

  ctx.fillStyle = 'rgba(70, 97, 124, 0.75)';
  ctx.font = `500 10.5px ${FONT_SANS}`;
  drawTrackedText(ctx, 'LOW MINERAL · SOFT FINISH', cx, 548, 2.1);

  ctx.fillStyle = INK;
  ctx.font = `450 18px ${FONT_SANS}`;
  drawTrackedText(ctx, '500 ml', cx, 592, 1.7);

  ctx.fillStyle = 'rgba(70, 97, 124, 0.65)';
  ctx.font = `500 10px ${FONT_SANS}`;
  drawTrackedText(ctx, 'BOTTLED AT SOURCE', cx, 664, 2);
}

function drawBackPanel(ctx, cx, H) {
  const left = cx - 200;
  const right = cx + 200;

  ctx.fillStyle = INK;
  ctx.font = `700 20px ${FONT_SANS}`;
  drawTrackedText(ctx, 'NUTRITION INFORMATION', cx, 52, 1.8);

  ctx.fillStyle = INK_SOFT;
  ctx.font = `500 12px ${FONT_SANS}`;
  drawTrackedText(ctx, '营养成分表 · PER 100 ml', cx, 76, 2.1);

  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, 92);
  ctx.lineTo(right, 92);
  ctx.stroke();

  const rows = [
    ['能量 / Energy', '0 kJ'],
    ['蛋白质 / Protein', '0 g'],
    ['脂肪 / Fat', '0 g'],
    ['碳水化合物 / Carbohydrate', '0 g'],
    ['钠 / Sodium', '1 mg'],
    ['钙 / Calcium', '8 mg'],
    ['镁 / Magnesium', '2 mg'],
    ['pH', '7.4'],
  ];
  const rowTop = 120;
  const rowStep = 30;
  rows.forEach(([label, value], index) => {
    const y = rowTop + index * rowStep;
    if (index > 0) {
      ctx.strokeStyle = 'rgba(14, 47, 82, 0.09)';
      ctx.beginPath();
      ctx.moveTo(left, y - 20);
      ctx.lineTo(right, y - 20);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(35, 64, 92, 0.92)';
    ctx.font = `450 13.5px ${FONT_SANS}`;
    ctx.textAlign = 'left';
    ctx.fillText(label, left, y);
    ctx.fillStyle = INK;
    ctx.font = `600 13.5px ${FONT_SANS}`;
    ctx.textAlign = 'right';
    ctx.fillText(value, right, y);
  });
  ctx.textAlign = 'left';

  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, 368);
  ctx.lineTo(right, 368);
  ctx.stroke();

  ctx.fillStyle = 'rgba(70, 97, 124, 0.85)';
  ctx.font = `500 10.5px ${FONT_SANS}`;
  drawTrackedText(ctx, 'INGREDIENTS · NATURAL MINERAL WATER', cx, 388, 1.6);

  drawBarcode(ctx, left + 32, 410, 336, 150, '8 901234 567890');

  ctx.fillStyle = INK;
  ctx.font = `600 12.5px ${FONT_SANS}`;
  drawTrackedText(ctx, '水源地 · 昆仑山冰川泉 · 海拔 4,200 m', cx, 600, 1.2);
  ctx.fillStyle = INK_SOFT;
  ctx.font = `500 11px ${FONT_SANS}`;
  drawTrackedText(ctx, 'SOURCE: KUNLUN GLACIER SPRING · BOTTLED AT SOURCE', cx, 621, 1.1);

  drawRecyclingMark(ctx, left + 34, 660, 26);
  ctx.fillStyle = 'rgba(70, 97, 124, 0.8)';
  ctx.font = `500 9.5px ${FONT_SANS}`;
  ctx.textAlign = 'left';
  ctx.fillText('PLEASE RECYCLE', left + 78, 656);
  ctx.fillText('净含量 500 ml · 中国制造', left + 78, 674);
  ctx.textAlign = 'left';
}

/* ── public API ─────────────────────────────────────────────────────────── */

/**
 * Build the AQUA PURE wrap-label texture.
 * @param {typeof CONFIG} [config]
 * @returns {THREE.CanvasTexture}
 */
export function createLabelTexture(config = CONFIG) {
  const label = config?.bottle?.label ?? CONFIG.bottle.label;
  const width = label.textureWidth ?? 2048;
  const height = label.textureHeight ?? 716;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('[aqua-pure] 2D canvas is not available for the label texture');

  const panel = width / 4;

  // Pearl-white paper with a barely-there vertical gradient.
  const paper = ctx.createLinearGradient(0, 0, 0, height);
  paper.addColorStop(0, '#fdfefe');
  paper.addColorStop(0.45, '#f7fafc');
  paper.addColorStop(1, '#e9eff5');
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, width, height);

  // 8 px pinstripes — width is divisible by 8, so this is seam-safe.
  ctx.save();
  ctx.globalAlpha = 0.022;
  ctx.strokeStyle = '#4d6a86';
  ctx.lineWidth = 1;
  for (let x = 4; x < width; x += 8) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }
  ctx.restore();

  // Continuous water lines behind everything (integer number of wavelengths).
  drawWave(ctx, width, 96, 5.5, 256, 'rgba(26, 111, 212, 0.12)', 1.1, 0.6);
  drawWave(ctx, width, 678, 6.5, 256, 'rgba(26, 111, 212, 0.11)', 1.1, 2.1);
  drawWave(ctx, width, 688, 5, 512, 'rgba(176, 141, 82, 0.16)', 0.9, 1.2);

  // Framing rules — horizontal, so they wrap perfectly.
  ctx.fillStyle = 'rgba(14, 47, 82, 0.72)';
  ctx.fillRect(0, 13, width, 1.6);
  ctx.fillRect(0, height - 15, width, 1.6);
  ctx.fillStyle = 'rgba(14, 47, 82, 0.3)';
  ctx.fillRect(0, 18, width, 0.8);
  ctx.fillRect(0, height - 20, width, 0.8);

  drawSidePanel(ctx, panel * 0.5, {
    word: 'PURE',
    line: 'STILL · NATURAL',
  });
  drawFrontPanel(ctx, panel * 1.5, height);
  drawSidePanel(ctx, panel * 2.5, {
    word: 'STILL',
    line: 'LOW MINERAL · SOFT',
  });
  drawBackPanel(ctx, panel * 3.5, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
