/**
 * OWNER: three
 * 全站唯一的固定 3D 背景层。由 NarrativeView 挂载一次。
 *
 * 层叠契约（与 Lead 确认）：
 *   .scene 背景（z-auto） < 本层（z-index:1） < .scene__stage 内容（z-index:2）
 * 因此这里只画线框与半透明几何，不做全屏不透明填充；第七章巨矩形与第八章
 * 黑色镜面由章节 DOM/CSS 承担（见 docs/THREE_NOTES.md）。
 *
 * 性能 / 降级：
 *   - alpha 透明、pointer-events: none
 *   - dpr 上限 1.75；移动端 1.25
 *   - 页面切后台暂停（frameloop: never）；prefers-reduced-motion 用 demand 静态构图
 *   - 无 WebGL 返回 null，页面文字与背景完整可读
 */
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useNarrative } from '../lib/narrative-store';
import { detectWebGL, readQuality } from './lib/quality';
import { useDocumentVisible } from './lib/use-stage';
import MonolithStage from './scene/MonolithStage';
import StagePreview from './dev/StagePreview';
import './three.css';

/** reduced-motion 下用 demand 模式，只在章节变化时重绘一帧。 */
function DemandDriver({ demand }: { demand: boolean }) {
  const invalidate = useThree((state) => state.invalidate);
  const chapter = useNarrative((state) => state.chapter);
  useEffect(() => {
    if (demand) invalidate();
  }, [demand, chapter, invalidate]);
  return null;
}

export default function NarrativeCanvas() {
  const quality = useMemo(readQuality, []);
  const webgl = useMemo(detectWebGL, []);
  const reducedMotion = useNarrative((state) => state.reducedMotion);
  const pageVisible = useDocumentVisible();

  // 仅开发环境：用 ?threePreview=network|constellation 单独检视章节内嵌 3D 舞台。
  const previewKind = import.meta.env.DEV
    ? new URLSearchParams(window.location.search).get('threePreview')
    : null;

  if (!webgl) return null;
  if (previewKind === 'network' || previewKind === 'constellation') {
    return <StagePreview kind={previewKind} />;
  }

  return (
    <div className="three-backdrop" aria-hidden="true">
      <Canvas
        frameloop={!pageVisible ? 'never' : reducedMotion ? 'demand' : 'always'}
        dpr={quality.dpr}
        gl={{
          alpha: true,
          antialias: true,
          stencil: false,
          depth: true,
          powerPreference: 'high-performance',
        }}
        camera={{ fov: 34, near: 0.1, far: 30, position: [0, 0, 4.2] }}
        style={{ pointerEvents: 'none' }}
        onCreated={({ gl }) => {
          gl.setClearAlpha(0);
          gl.toneMapping = THREE.NoToneMapping;
        }}
      >
        <MonolithStage quality={quality} reducedMotion={reducedMotion} />
        <DemandDriver demand={reducedMotion} />
      </Canvas>
    </div>
  );
}
