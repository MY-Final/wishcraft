import type { QualityInfo } from './types';

const MOBILE_QUERY = '(max-width: 820px), (pointer: coarse)';

export function detectWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return false;
    (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function readQuality(): QualityInfo {
  if (typeof window === 'undefined') {
    return { dpr: 1, isMobile: false, nodeScale: 1, reducedMotion: false, tier: 'high' };
  }

  const isMobile = window.matchMedia(MOBILE_QUERY).matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  const rawDpr = window.devicePixelRatio || 1;
  const tier: QualityInfo['tier'] = isMobile || cores <= 4 ? 'balanced' : 'high';
  const dpr = Math.min(rawDpr, isMobile ? 1.35 : tier === 'high' ? 1.75 : 1.5);

  return {
    dpr,
    isMobile,
    nodeScale: isMobile ? 0.55 : tier === 'high' ? 1 : 0.8,
    reducedMotion,
    tier,
  };
}
