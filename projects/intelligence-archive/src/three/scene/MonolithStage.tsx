/**
 * OWNER: three
 * 全局 MONOLITH 舞台（挂在固定全屏 NarrativeCanvas 内）。
 * 只读取 narrative.get()，不做任何 React 状态更新。
 */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { chapters } from '../../data/chapters';
import { narrative } from '../../lib/narrative-store';
import { clamp, damp, lerp, smoothstep } from '../lib/math';
import { monolithPresenceFactor } from '../lib/presence';
import type { RenderQuality } from '../lib/quality';
import { createMonolithData, lerpShapes } from './monolith-geometry';

const INK = new THREE.Color('#161616');
const VOID_INK = new THREE.Color('#f2f2ef');
const WEAVE_INK = new THREE.Color('#cfcfca');

const scratchColor = new THREE.Color();

interface MonolithStageProps {
  quality: RenderQuality;
  reducedMotion: boolean;
}

export default function MonolithStage({ quality, reducedMotion }: MonolithStageProps) {
  const data = useMemo(() => createMonolithData(quality.isMobile), [quality.isMobile]);

  const resources = useMemo(() => {
    const sheet = new THREE.LineBasicMaterial({
      color: INK.clone(),
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });
    const weave = new THREE.LineBasicMaterial({
      color: WEAVE_INK.clone(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const tree = new THREE.LineBasicMaterial({
      color: INK.clone(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const pruned = new THREE.LineBasicMaterial({
      color: INK.clone(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const semanticTokens = new THREE.PointsMaterial({
      color: INK.clone(),
      size: 0.022,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    return {
      sheet,
      weave,
      tree,
      pruned,
      semanticTokens,
      dispose(): void {
        sheet.dispose();
        weave.dispose();
        tree.dispose();
        pruned.dispose();
        semanticTokens.dispose();
      },
    };
  }, []);

  useEffect(() => {
    return () => {
      data.dispose();
      resources.dispose();
    };
  }, [data, resources]);

  const rootGroup = useRef<THREE.Group>(null);
  const formRef = useRef(0);
  const appliedFormRef = useRef(-1);
  const voidRef = useRef(0);
  const presenceRef = useRef(1);
  const weaveRef = useRef(0);
  const treeRef = useRef(0);
  const pointerTarget = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handlePointer = (event: PointerEvent): void => {
      pointerTarget.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointerTarget.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', handlePointer, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointer);
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.06);
    const snapshot = narrative.get();
    const chapter = clamp(snapshot.chapter, 0, 8);
    const reduced = reducedMotion || snapshot.reducedMotion;

    // 窄屏整体缩放，保证构图不横向溢出；1px 线宽不受缩放影响
    if (rootGroup.current) {
      const aspect = state.size.width / Math.max(state.size.height, 1);
      const fit = clamp(aspect / 1.6, 0.34, 1);
      rootGroup.current.scale.setScalar(fit);
    }

    // ---- 形态：章节索引即形态索引，指数阻尼过渡 ----
    formRef.current = reduced
      ? chapter
      : damp(formRef.current, chapter, 2.1, dt);
    const form = clamp(formRef.current, 0, 8);
    const lo = Math.min(Math.floor(form), 8);
    const hi = Math.min(lo + 1, 8);
    const rawT = form - lo;
    const morphT = rawT * rawT * (3 - 2 * rawT);

    if (reduced) {
      // 静态模式：每次失效重绘一张完全确定的画面
      lerpShapes(data, lo, hi, morphT);
      appliedFormRef.current = form;
    } else if (Math.abs(form - appliedFormRef.current) > 0.0008) {
      lerpShapes(data, lo, hi, morphT);
      appliedFormRef.current = form;
    }

    // ---- 明暗：第三章深色章节，线条换色 ----
    const voidTarget = chapters[chapter]?.tone === 'void' ? 1 : 0;
    voidRef.current = reduced ? voidTarget : damp(voidRef.current, voidTarget, 4.5, dt);
    scratchColor.copy(INK).lerp(VOID_INK, voidRef.current);
    resources.sheet.color.copy(scratchColor);
    const treeInk = voidRef.current > 0.5 ? VOID_INK : INK;
    resources.tree.color.lerp(treeInk, reduced ? 1 : 1 - Math.exp(-4 * dt));
    resources.pruned.color.copy(resources.tree.color);

    // ---- 透明度：形态基准 × 内嵌舞台存在感 ----
    const baseOpacity = lerp(data.shapeOpacity[lo], data.shapeOpacity[hi], morphT);
    const presenceTarget = monolithPresenceFactor(chapter);
    presenceRef.current = reduced
      ? presenceTarget
      : damp(presenceRef.current, presenceTarget, 2.5, dt);
    const sheetTarget = baseOpacity * presenceRef.current;
    resources.sheet.opacity = reduced
      ? sheetTarget
      : damp(resources.sheet.opacity, sheetTarget, 3.2, dt);

    // ---- 注意力连线（ch3） ----
    const weaveTarget =
      chapter === 3 ? 0.4 * (0.24 + 0.76 * smoothstep(0, 0.6, snapshot.chapterProgress)) : 0;
    weaveRef.current = reduced ? weaveTarget : damp(weaveRef.current, weaveTarget, 3, dt);
    resources.weave.opacity = weaveRef.current;

    // ---- 语义空间 token 点（ch4） ----
    const tokenTarget = chapter === 4 ? 0.62 : 0;
    resources.semanticTokens.opacity = reduced
      ? tokenTarget
      : damp(resources.semanticTokens.opacity, tokenTarget, 3, dt);

    // ---- 推理树（ch6）：章节自己有图，MONOLITH 退到背景 ----
    const treeTarget = chapter === 6 ? 0.24 : 0;
    treeRef.current = reduced ? treeTarget : damp(treeRef.current, treeTarget, 2.4, dt);
    resources.tree.opacity = treeRef.current;
    resources.pruned.opacity = treeRef.current * 0.3;

    // ---- 终章：镜面由章节 DOM/CSS 承担，全局层只保留极细收束线（在 sheet 形态里） ----

    // ---- 相机：缓慢推拉 + 极小视差（≤ 0.15 rad） ----
    const camera = state.camera;
    const targetZ =
      lerp(data.cameraZ[lo], data.cameraZ[hi], morphT) - (snapshot.chapterProgress - 0.5) * 0.12;
    const targetY = lerp(data.cameraY[lo], data.cameraY[hi], morphT);
    const lookY = lerp(data.lookY[lo], data.lookY[hi], morphT);
    const halfWidth = typeof window === 'undefined' ? 16 : window.innerWidth;
    const parallaxX = reduced || halfWidth < 820 ? 0 : pointerTarget.current.x * 0.24;
    const parallaxY = reduced || halfWidth < 820 ? 0 : -pointerTarget.current.y * 0.14;

    if (reduced) {
      camera.position.set(0, targetY, targetZ);
      camera.lookAt(0, lookY, 0);
    } else {
      camera.position.x = damp(camera.position.x, parallaxX, 1.8, dt);
      camera.position.y = damp(camera.position.y, targetY + parallaxY, 1.8, dt);
      camera.position.z = damp(camera.position.z, targetZ, 1.6, dt);
      camera.lookAt(0, lookY, 0);
    }
  });

  return (
    <group ref={rootGroup}>
      <lineSegments
        geometry={data.geometry}
        material={resources.sheet}
        frustumCulled={false}
      />
      <lineSegments
        geometry={data.weaveGeometry}
        material={resources.weave}
        frustumCulled={false}
      />
      <points
        geometry={data.semanticGeometry}
        material={resources.semanticTokens}
        frustumCulled={false}
      />
      <lineSegments
        geometry={data.treeGeometry}
        material={resources.tree}
        frustumCulled={false}
      />
      <lineSegments
        geometry={data.prunedGeometry}
        material={resources.pruned}
        frustumCulled={false}
      />
    </group>
  );
}
