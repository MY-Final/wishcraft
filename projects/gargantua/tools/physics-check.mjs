/**
 * GARGANTUA — independent physics self-check.
 *
 * The shader integrates the Schwarzschild null-geodesic Binet equation
 *
 *     u'' + u = 3 M u²,   u = 1 / r,   r_s = 2M = 1
 *
 * This script re-implements the same equations in JavaScript (independently of
 * the GLSL, so it cannot "test itself" in a circular way) and checks the
 * textbook results the renderer relies on:
 *
 *   · critical impact parameter b_c = 3√3 M ≈ 2.598076
 *   · weak-field deflection angle α ≈ 2 r_s / b
 *   · the photon sphere at r = 1.5 r_s is an exact circular null orbit
 *   · Keplerian redshift factor g(r → ∞) → 1 and g(ISCO, face-on) = 1/√2
 *   · the disk temperature profile is T(r_in) = T_peak and T ∝ r^(-3/4)
 *
 * Usage: node tools/physics-check.mjs [--json]
 * Exit code 0 only if every assertion passes.
 */
import fs from 'node:fs';
import path from 'node:path';

const RS = 1.0;
const MASS = 0.5;
const B_CRITICAL = (3 * Math.sqrt(3)) / 2;
const ISCO = 3.0;

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

/**
 * RK4 integration of the null-geodesic plane equation, matching the shader.
 * Starts at r0 with local direction components (dr, dt) measured by a static
 * observer (|dr|² + dt² = 1).
 */
function integrateGeodesic({ r0, dr, dt, step = 0.001, maxSteps = 400_000 }) {
  const f0 = 1 - RS / r0;
  let u = 1 / r0;
  let du = -u * Math.sqrt(f0) * dr / Math.max(dt, 1e-12);
  let phi = 0;
  const h = step;
  const b = (r0 * dt) / Math.sqrt(f0);

  if (dt < 1e-9) {
    return { captured: dr < 0, escapePhi: null, steps: 0, b: 0 };
  }

  for (let i = 0; i < maxSteps; i++) {
    const uPrev = u;
    const k1u = du;
    const k1d = -u + 1.5 * u * u;
    const u2 = u + 0.5 * h * k1u;
    const k2u = du + 0.5 * h * k1d;
    const k2d = -u2 + 1.5 * u2 * u2;
    const u3 = u + 0.5 * h * k2u;
    const k3u = du + 0.5 * h * k2d;
    const k3d = -u3 + 1.5 * u3 * u3;
    const u4 = u + h * k3u;
    const k4u = du + h * k3d;
    const k4d = -u4 + 1.5 * u4 * u4;
    u += (h / 6) * (k1u + 2 * k2u + 2 * k3u + k4u);
    du += (h / 6) * (k1d + 2 * k2d + 2 * k3d + k4d);
    phi += h;

    if (u <= 0) {
      const t = uPrev / Math.max(uPrev - u, 1e-12);
      return { captured: false, escapePhi: phi - h + h * t, steps: i + 1, b };
    }
    if (u >= 1) {
      return { captured: true, escapePhi: null, steps: i + 1, b };
    }
  }
  return { captured: true, escapePhi: null, steps: maxSteps, b, stalled: true };
}

/** Rays far outside the photon sphere with a given impact parameter. */
function rayForImpact(r0, b) {
  const f0 = 1 - RS / r0;
  const dt = (b * Math.sqrt(f0)) / r0;
  const dr = -Math.sqrt(Math.max(1 - dt * dt, 0));
  return { r0, dr, dt };
}

function deflectionAngle(b, r0 = 2_000_000) {
  const ray = rayForImpact(r0, b);
  const result = integrateGeodesic({ ...ray, step: 0.0005, maxSteps: 400_000 });
  if (result.captured || result.escapePhi === null) return null;
  // Direction in the (e1, e2) plane before and after the encounter.
  const inAngle = Math.atan2(ray.dt, ray.dr);
  const outAngle = result.escapePhi;
  let delta = outAngle - inAngle;
  // The in-angle for a far observer is ≈ π; bring the difference into (-π, π].
  delta = ((delta + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  return Math.abs(delta);
}

// ── 1. critical impact parameter ─────────────────────────────────────────
{
  let lo = 2.0;
  let hi = 3.5;
  const r0 = 400;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const result = integrateGeodesic({ ...rayForImpact(r0, mid), step: 0.001, maxSteps: 300_000 });
    if (result.captured) lo = mid;
    else hi = mid;
  }
  const measured = (lo + hi) / 2;
  const error = Math.abs(measured - B_CRITICAL);
  ok(
    'Critical impact parameter b_c = 3√3 M',
    error < 2e-3,
    `measured ${measured.toFixed(6)} r_s vs ${B_CRITICAL.toFixed(6)} r_s (Δ=${error.toExponential(2)})`,
  );
}

// ── 2. weak-field deflection ─────────────────────────────────────────────
for (const b of [20, 50]) {
  const measured = deflectionAngle(b);
  // Second-order Schwarzschild deflection: 4M/b + (15π/4)(M/b)² + O((M/b)³).
  const ratio = MASS / b;
  const expected = 4 * ratio + (15 * Math.PI) / 4 * ratio * ratio;
  const relative = measured === null ? Infinity : Math.abs(measured - expected) / expected;
  ok(
    `Weak-field deflection at b = ${b} r_s`,
    relative < 0.015,
    `measured ${(measured * 1000).toFixed(3)} mrad vs ${(expected * 1000).toFixed(3)} mrad (rel ${(relative * 100).toFixed(2)}%)`,
  );
}

// ── 3. photon sphere is an exact circular null orbit ────────────────────
{
  // u = 1 / 1.5 = 2/3, u' = 0 is an equilibrium of u'' = -u + 1.5 u².
  const u = 2 / 3;
  const acceleration = -u + 1.5 * u * u;
  // Also integrate 200 steps from that state and verify it stays put.
  let uu = u;
  let duu = 0;
  const h = 0.001;
  let maxDrift = 0;
  for (let i = 0; i < 200; i++) {
    const k1u = duu;
    const k1d = -uu + 1.5 * uu * uu;
    const u2 = uu + 0.5 * h * k1u;
    const k2u = duu + 0.5 * h * k1d;
    const k2d = -u2 + 1.5 * u2 * u2;
    const u3 = uu + 0.5 * h * k2u;
    const k3u = duu + 0.5 * h * k2d;
    const k3d = -u3 + 1.5 * u3 * u3;
    const u4 = uu + h * k3u;
    const k4u = duu + h * k3d;
    const k4d = -u4 + 1.5 * u4 * u4;
    uu += (h / 6) * (k1u + 2 * k2u + 2 * k3u + k4u);
    duu += (h / 6) * (k1d + 2 * k2d + 2 * k3d + k4d);
    maxDrift = Math.max(maxDrift, Math.abs(uu - u), Math.abs(duu));
  }
  ok(
    'Photon sphere r = 1.5 r_s is a circular null orbit',
    Math.abs(acceleration) < 1e-12 && maxDrift < 1e-14,
    `u'' = ${acceleration.toExponential(2)}, drift after 0.2 rad = ${maxDrift.toExponential(2)}`,
  );
}

// ── 4. Keplerian redshift factor ────────────────────────────────────────
{
  const gFactor = (r, bz = 0) => {
    const omega = Math.sqrt(MASS / (r * r * r));
    return Math.sqrt(Math.max(1 - 3 * MASS / r, 0)) / (1 - omega * bz);
  };
  const far = gFactor(1e12);
  const iscoFaceOn = gFactor(ISCO, 0);
  const expectedIsco = Math.sqrt(0.5);
  // A photon with positive angular momentum emitted by the approaching side
  // of the disk must be blueshifted.
  const approaching = gFactor(ISCO, 2.4);
  const receding = gFactor(ISCO, -2.4);
  ok(
    'Gravitational redshift g → 1 far from the hole',
    Math.abs(far - 1) < 1e-11,
    `g(10¹² r_s) = ${far.toFixed(12)}`,
  );
  ok(
    'ISCO face-on redshift g = 1/√2',
    Math.abs(iscoFaceOn - expectedIsco) < 1e-9,
    `g = ${iscoFaceOn.toFixed(12)}`,
  );
  ok(
    'Doppler asymmetry: approaching side is blueshifted',
    approaching > 1 && receding < 1 && approaching > receding,
    `g_approach = ${approaching.toFixed(4)}, g_recede = ${receding.toFixed(4)}`,
  );
}

// ── 5. disk temperature profile ─────────────────────────────────────────
{
  const rin = ISCO;
  const peak = 5800;
  const temperature = (r) => peak * Math.pow(Math.min(rin / r, 1), 0.75);
  const tIn = temperature(rin);
  const t2 = temperature(2 * rin);
  const expected = peak * Math.pow(0.5, 0.75);
  const decreasing = t2 < tIn && temperature(4 * rin) < t2;
  ok(
    'Disk temperature profile T ∝ r^(-3/4)',
    Math.abs(tIn - peak) < 1e-9 && Math.abs(t2 - expected) < 1e-6 && decreasing,
    `T(r_in) = ${tIn.toFixed(1)} K, T(2r_in) = ${t2.toFixed(1)} K, T(4r_in) = ${temperature(4 * rin).toFixed(1)} K`,
  );
}

// ── 6. integration conserves the Binet invariant ────────────────────────
{
  // For the exact ODE, (u')² + u² - u³ is conserved (the energy analogue).
  const ray = rayForImpact(50, 8);
  const f0 = 1 - RS / 50;
  const u0 = 1 / 50;
  const du0 = -u0 * Math.sqrt(f0) * ray.dr / ray.dt;
  const invariant0 = du0 * du0 + u0 * u0 - u0 * u0 * u0;
  let u = u0;
  let du = du0;
  const h = 0.0005;
  let maxError = 0;
  for (let i = 0; i < 20_000; i++) {
    const k1u = du;
    const k1d = -u + 1.5 * u * u;
    const u2 = u + 0.5 * h * k1u;
    const k2u = du + 0.5 * h * k1d;
    const k2d = -u2 + 1.5 * u2 * u2;
    const u3 = u + 0.5 * h * k2u;
    const k3u = du + 0.5 * h * k2d;
    const k3d = -u3 + 1.5 * u3 * u3;
    const u4 = u + h * k3u;
    const k4u = du + h * k3d;
    const k4d = -u4 + 1.5 * u4 * u4;
    u += (h / 6) * (k1u + 2 * k2u + 2 * k3u + k4u);
    du += (h / 6) * (k1d + 2 * k2d + 2 * k3d + k4d);
    const invariant = du * du + u * u - u * u * u;
    maxError = Math.max(maxError, Math.abs(invariant - invariant0));
  }
  ok(
    'RK4 conserves the null-geodesic invariant (u′)² + u² − u³',
    maxError < 1e-10,
    `max drift over 10 rad = ${maxError.toExponential(2)}`,
  );
}

const passed = results.filter((entry) => entry.pass).length;
const failed = results.length - passed;
console.log(`\n${passed}/${results.length} checks passed${failed ? `, ${failed} FAILED` : ''}.`);

if (process.argv.includes('--json')) {
  const out = path.resolve(import.meta.dirname, '..', 'docs', 'PHYSICS_CHECK.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(
    out,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        constants: { RS, MASS, B_CRITICAL, ISCO },
        passed,
        failed,
        results,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Wrote ${path.relative(process.cwd(), out)}`);
}

process.exitCode = failed === 0 ? 0 : 1;
