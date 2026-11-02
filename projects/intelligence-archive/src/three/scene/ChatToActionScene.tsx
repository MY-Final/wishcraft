/**
 * OWNER: three
 * 第七章 FROM CHAT TO ACTION —— 章节内嵌场景（也可在 DEV 预览中单独检视）。
 *
 * 对话框 → 七个黑色半透明模块在白色空间依次展开 → 连线传递 → 收束为巨大黑色矩形。
 * 克制、精密、工业图纸感：只有 1px 线、半透明黑、等宽小字，没有发光与控制台装饰。
 *
 * 模块文案（与 DESIGN BIBLE 对齐）：需求理解 / 检索 / 规划 / 编码 / 工具 / 验证 / 交付。
 * 注：任务书写“六个模块”，但列举了七项，这里按列举的七项实现。
 */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { narrative } from '../../lib/narrative-store';
import {
  createCircleGeometry,
  createRectGeometry,
  createSegmentGeometry,
} from '../lib/geometry';
import { clamp, damp, lerp, smoothstep } from '../lib/math';
import { createScreenPoint, projectToScreen } from '../lib/project';
import type { RenderQuality } from '../lib/quality';

export interface AgentModule {
  key: string;
  zh: string;
  en: string;
}

export const AGENT_MODULES: AgentModule[] = [
  { key: 'understand', zh: '需求理解', en: 'UNDERSTAND' },
  { key: 'retrieve', zh: '检索', en: 'RETRIEVE' },
  { key: 'plan', zh: '规划', en: 'PLAN' },
  { key: 'code', zh: '编码', en: 'CODE' },
  { key: 'tool', zh: '工具', en: 'TOOL' },
  { key: 'verify', zh: '验证', en: 'VERIFY' },
  { key: 'deliver', zh: '交付', en: 'DELIVER' },
];

const MODULE_W = 0.34;
const MODULE_H = 0.2;
const SPACING = 0.5;
const ROW_Y = -0.22;
const CONVERGE_START = 0.78;
const CONVERGE_END = 0.93;
const RECT_W = 2.72;
const RECT_H = 1.32;

const INK = '#161616';
const LIGHT = '#f2f2ef';
const HAIRLINE = '#b4b4b0';

interface ChatToActionSceneProps {
  quality: RenderQuality;
  reducedMotion: boolean;
  labelRefs: RefObject<Array<HTMLDivElement | null>>;
  /** 仅 DEV 预览：固定进度 0—1，用于单独检视展开 / 收束各阶段 */
  demoProgress?: number;
}

export default function ChatToActionScene({
  quality,
  reducedMotion,
  labelRefs,
  demoProgress,
}: ChatToActionSceneProps) {
  const resources = useMemo(() => {
    const modulePlane = new THREE.PlaneGeometry(1, 1);
    const moduleBorder = createRectGeometry(1, 1, 0.002);
    const dialogRect = createRectGeometry(0.92, 0.34, 0.002);
    const dialogLines = createSegmentGeometry([
      -0.32, 0.07, 0.001, 0.32, 0.07, 0.001,
      -0.32, -0.04, 0.001, 0.1, -0.04, 0.001,
      0.16, -0.04, 0.001, 0.16, -0.12, 0.001,
    ]);

    const connectorSegments: number[] = [];
    for (let i = 0; i < AGENT_MODULES.length - 1; i += 1) {
      const left = (i - 3) * SPACING + MODULE_W / 2;
      const right = (i - 2) * SPACING - MODULE_W / 2;
      connectorSegments.push(left, ROW_Y, 0.02, right, ROW_Y, 0.02);
    }
    const connectors = createSegmentGeometry(connectorSegments);
    const dot = createCircleGeometry(0.017, 18, 0);

    const moduleFill = new THREE.MeshBasicMaterial({
      color: INK,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const moduleEdge = new THREE.LineBasicMaterial({
      color: LIGHT,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const dialogStroke = new THREE.LineBasicMaterial({
      color: INK,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const connectorStroke = new THREE.LineBasicMaterial({
      color: HAIRLINE,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const dotFill = new THREE.MeshBasicMaterial({
      color: INK,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const rectFill = new THREE.MeshBasicMaterial({
      color: '#111111',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    return {
      modulePlane,
      moduleBorder,
      dialogRect,
      dialogLines,
      connectors,
      dot,
      moduleFill,
      moduleEdge,
      dialogStroke,
      connectorStroke,
      dotFill,
      rectFill,
      dispose(): void {
        modulePlane.dispose();
        moduleBorder.dispose();
        dialogRect.dispose();
        dialogLines.dispose();
        connectors.dispose();
        dot.dispose();
        moduleFill.dispose();
        moduleEdge.dispose();
        dialogStroke.dispose();
        connectorStroke.dispose();
        dotFill.dispose();
        rectFill.dispose();
      },
    };
  }, []);

  useEffect(() => () => resources.dispose(), [resources]);

  const groupRef = useRef<THREE.Group>(null);
  const dialogRef = useRef<THREE.Group>(null);
  const dotRef = useRef<THREE.Mesh>(null);
  const rectRef = useRef<THREE.Mesh>(null);
  const moduleRefs = useRef<Array<THREE.Group | null>>([]);
  const presenceRef = useRef(0);
  const progressRef = useRef(0);
  const screen = useMemo(() => createScreenPoint(), []);
  const world = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.06);
    const snapshot = narrative.get();
    const chapter = clamp(snapshot.chapter, 0, 8);
    const reduced = reducedMotion || snapshot.reducedMotion;
    const demo = typeof demoProgress === 'number';

    const targetPresence = demo || chapter === 7 ? 1 : 0;
    presenceRef.current = reduced
      ? targetPresence
      : damp(presenceRef.current, targetPresence, 2.8, dt);
    const presence = presenceRef.current;

    if (groupRef.current) {
      groupRef.current.visible = presence > 0.004;
      // 窄屏上整体缩放，避免七个模块溢出画幅
      const fit = clamp(state.size.width / Math.max(state.size.height, 1) / 1.6, 0.34, 1);
      groupRef.current.scale.setScalar(fit);
    }
    if (presence <= 0.004) {
      const labels = labelRefs.current;
      if (labels) {
        for (const element of labels) {
          if (element) element.style.visibility = 'hidden';
        }
      }
      return;
    }

    const progressTarget = demo ? demoProgress : reduced ? 0.62 : snapshot.chapterProgress;
    progressRef.current = reduced ? progressTarget : damp(progressRef.current, progressTarget, 4.5, dt);
    const p = clamp(progressRef.current);
    const converge = smoothstep(CONVERGE_START, CONVERGE_END, p);

    // 对话框
    if (dialogRef.current) {
      const dialogReveal = smoothstep(0, 0.04, p) * (1 - smoothstep(0.1, 0.17, p));
      dialogRef.current.scale.setScalar(0.6 + 0.4 * dialogReveal);
      resources.dialogStroke.opacity = presence * dialogReveal * 0.9;
    }

    // 连线
    const connectorReveal = smoothstep(0.3, 0.37, p) * (1 - smoothstep(0.74, 0.81, p));
    resources.connectorStroke.opacity = presence * connectorReveal * 0.6;

    // 传递点（只在非 reduced-motion 下移动）
    if (dotRef.current) {
      const dotOpacity = reduced ? 0 : presence * connectorReveal;
      resources.dotFill.opacity = dotOpacity;
      dotRef.current.visible = dotOpacity > 0.01;
      if (dotOpacity > 0.01) {
        const phase = (state.clock.elapsedTime * 0.16) % 1;
        const x = lerp(-1.62, 1.62, phase);
        dotRef.current.position.set(x, ROW_Y, 0.07);
      }
    }

    // 模块展开 / 收束
    resources.moduleFill.opacity = presence * 0.84;
    resources.moduleEdge.opacity = presence * 0.5 * (1 - converge);
    const showLabels = !quality.isMobile;
    for (let i = 0; i < AGENT_MODULES.length; i += 1) {
      const group = moduleRefs.current[i];
      const start = 0.17 + i * 0.045;
      const reveal = smoothstep(start, start + 0.09, p);
      const restX = (i - 3) * SPACING;
      const x = lerp(restX, 0, converge);
      const y = lerp(ROW_Y + (1 - reveal) * 0.05, -0.03, converge);
      const scale = Math.max(0.001, reveal * (1 - converge));

      if (group) {
        group.position.set(x, y, 0.04 + i * 0.0008);
        group.scale.setScalar(scale);
      }

      const label = labelRefs.current?.[i];
      if (label) {
        if (!showLabels || reveal < 0.35 || converge > 0.55) {
          label.style.visibility = 'hidden';
        } else if (group) {
          group.getWorldPosition(world);
          projectToScreen(world, state.camera, state.size.width, state.size.height, screen);
          label.style.visibility = screen.visible ? 'visible' : 'hidden';
          label.style.transform = `translate3d(${Math.round(screen.x)}px, ${Math.round(screen.y)}px, 0)`;
          label.style.opacity = String(
            clamp(presence * smoothstep(0.35, 0.6, reveal) * (1 - converge * 1.4)),
          );
        }
      }
    }

    // 收束后的黑色矩形
    if (rectRef.current) {
      const rectReveal = smoothstep(0.8, 0.94, p);
      rectRef.current.scale.set(RECT_W * rectReveal, RECT_H * rectReveal, 1);
      resources.rectFill.opacity = presence * 0.97 * rectReveal;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <group ref={dialogRef} position={[0, 0.16, 0.06]}>
        <lineSegments geometry={resources.dialogRect} material={resources.dialogStroke} />
        <lineSegments geometry={resources.dialogLines} material={resources.dialogStroke} />
      </group>

      <lineSegments geometry={resources.connectors} material={resources.connectorStroke} />
      <mesh ref={dotRef} geometry={resources.dot} material={resources.dotFill} />

      {AGENT_MODULES.map((module, index) => (
        <group
          key={module.key}
          ref={(el) => {
            moduleRefs.current[index] = el;
          }}
          position={[(index - 3) * SPACING, ROW_Y, 0.04]}
        >
          <mesh
            geometry={resources.modulePlane}
            material={resources.moduleFill}
            scale={[MODULE_W, MODULE_H, 1]}
          />
          <lineSegments
            geometry={resources.moduleBorder}
            material={resources.moduleEdge}
            scale={[MODULE_W, MODULE_H, 1]}
          />
        </group>
      ))}

      <mesh
        ref={rectRef}
        geometry={resources.modulePlane}
        material={resources.rectFill}
        position={[0, -0.02, 0.1]}
        scale={[0.001, 0.001, 1]}
      />
    </group>
  );
}
