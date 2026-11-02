/**
 * OWNER: three
 * 设备能力探测：WebGL 可用性、DPR 上限、节点密度。
 * 桌面 dpr ≤ 1.75；移动端 dpr ≤ 1.25 且节点减半。
 */

export interface RenderQuality {
  /** 已经按设备裁剪过的像素比 */
  dpr: number;
  isMobile: boolean;
  /** 节点 / 线段数量的乘数：移动端 0.5 */
  nodeScale: number;
}

const MOBILE_QUERY = '(max-width: 820px), (pointer: coarse)';

export function detectWebGL(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ??
      (canvas.getContext('webgl') as WebGLRenderingContext | null);
    if (!gl) return false;
    const context = gl as WebGLRenderingContext;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function readQuality(): RenderQuality {
  if (typeof window === 'undefined') {
    return { dpr: 1, isMobile: false, nodeScale: 1 };
  }
  const isMobile = window.matchMedia(MOBILE_QUERY).matches;
  const rawDpr = window.devicePixelRatio || 1;
  const dpr = Math.min(rawDpr, isMobile ? 1.25 : 1.75);
  return { dpr, isMobile, nodeScale: isMobile ? 0.5 : 1 };
}
