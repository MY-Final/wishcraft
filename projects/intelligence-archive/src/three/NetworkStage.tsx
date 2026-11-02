/**
 * OWNER: three
 * 第二章内嵌舞台：可拖拽旋转的事件网络（章节内 canvas，非全局层）。
 *
 * 接口（与 lead 确认）：
 *   <NetworkStage onSelectEvent={(id) => ...} />
 * 可选：events / className。父容器负责尺寸（组件本身铺满 100%×100%）。
 * 不监听滚轮；触摸为 pan-y，垂直滚动仍交给页面。离开视口即停止渲染。
 */
import { Canvas } from '@react-three/fiber';
import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import { eventsForChapter, type HistoryEvent } from '../data';
import { useNarrative } from '../lib/narrative-store';
import { clamp } from './lib/math';
import { detectWebGL, readQuality } from './lib/quality';
import { verificationLabel } from './lib/verification';
import { useStageActivity } from './lib/use-stage';
import NetworkScene, { type NetworkHover } from './scene/NetworkScene';
import { buildNetworkLayout } from './scene/network-layout';
import './three.css';

export interface NetworkStageProps {
  onSelectEvent?: (id: string) => void;
  /** 默认 eventsForChapter(2)；测试 / 复用时可显式传入 */
  events?: HistoryEvent[];
  className?: string;
}

const DEFAULT_ROTATION = { x: 0.34, y: 0.62 };

export default function NetworkStage({ onSelectEvent, events, className }: NetworkStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<HTMLDivElement>(null) as RefObject<HTMLDivElement | null>;
  const rotationRef = useRef({ ...DEFAULT_ROTATION });
  const draggingRef = useRef(false);
  const dragState = useRef({ pointerId: -1, x: 0, y: 0, travel: 0 });

  const quality = useMemo(readQuality, []);
  const webgl = useMemo(detectWebGL, []);
  const reducedMotion = useNarrative((state) => state.reducedMotion);
  const { active } = useStageActivity(containerRef, 'network');

  const sourceEvents = useMemo(() => events ?? eventsForChapter(2), [events]);
  const layout = useMemo(() => buildNetworkLayout(sourceEvents), [sourceEvents]);

  const [hovered, setHovered] = useState<NetworkHover | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [revision, setRevision] = useState(0);

  const hoveredNode = hovered
    ? hovered.kind === 'event'
      ? layout.eventNodes[hovered.index]
      : layout.orgNodes[hovered.index]
    : undefined;

  const bump = (): void => setRevision((value) => value + 1);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('button')) return;
    dragState.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      travel: 0,
    };
    draggingRef.current = true;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (!draggingRef.current) return;
    const dx = event.clientX - dragState.current.x;
    const dy = event.clientY - dragState.current.y;
    dragState.current.x = event.clientX;
    dragState.current.y = event.clientY;
    dragState.current.travel += Math.abs(dx) + Math.abs(dy);
    rotationRef.current.y += dx * 0.0062;
    rotationRef.current.x = clamp(rotationRef.current.x + dy * 0.004, -0.9, 0.9);
    if (reducedMotion) bump();
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>): void => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(dragState.current.pointerId)) {
      event.currentTarget.releasePointerCapture(dragState.current.pointerId);
    }
  };

  const handleNodeClick = (kind: 'event' | 'org', index: number): void => {
    if (dragState.current.travel > 8) return;
    if (kind !== 'event') return;
    const node = layout.eventNodes[index];
    if (!node) return;
    setSelectedId(node.id);
    onSelectEvent?.(node.id);
  };

  const resetView = (): void => {
    rotationRef.current.x = DEFAULT_ROTATION.x;
    rotationRef.current.y = DEFAULT_ROTATION.y;
    bump();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const step = event.shiftKey ? 0.32 : 0.12;
    if (event.key === 'ArrowLeft') rotationRef.current.y -= step;
    else if (event.key === 'ArrowRight') rotationRef.current.y += step;
    else if (event.key === 'ArrowUp') rotationRef.current.x -= step * 0.7;
    else if (event.key === 'ArrowDown') rotationRef.current.x += step * 0.7;
    else if (event.key === 'Home') {
      rotationRef.current.x = DEFAULT_ROTATION.x;
      rotationRef.current.y = DEFAULT_ROTATION.y;
    } else return;
    event.preventDefault();
    rotationRef.current.x = clamp(rotationRef.current.x, -0.9, 0.9);
    bump();
  };

  const rootClassName = `three-stage network-stage${dragging ? ' is-dragging' : ''}${
    className ? ` ${className}` : ''
  }`;

  if (!webgl) return null;

  return (
    <div
      ref={containerRef}
      className={rootClassName}
      tabIndex={0}
      role="group"
      aria-label="1980—2011 事件网络：拖动旋转，点击节点查看事件"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={(event) => {
        if (draggingRef.current) endDrag(event);
      }}
      onKeyDown={handleKeyDown}
    >
      <Canvas
        frameloop={!active ? 'never' : reducedMotion ? 'demand' : 'always'}
        dpr={quality.dpr}
        camera={{ fov: 36, near: 0.1, far: 30, position: [0, 0, 3.95] }}
        gl={{ alpha: true, antialias: true, stencil: false, depth: true }}
        onCreated={({ gl }) => {
          gl.setClearAlpha(0);
        }}
      >
        <NetworkScene
          layout={layout}
          hovered={hovered}
          selectedId={selectedId}
          rotationRef={rotationRef}
          draggingRef={draggingRef}
          reducedMotion={reducedMotion}
          revision={revision}
          hoverLabelRef={hoverRef}
          onHover={setHovered}
          onClickNode={handleNodeClick}
        />
      </Canvas>

      <div className="three-stage__hover" ref={hoverRef}>
        {hoveredNode && (
          <div className="three-stage__hover-inner">
            <span className="three-stage__hover-date">{hoveredNode.meta}</span>
            <span className="three-stage__hover-title">{hoveredNode.title}</span>
            <span className="three-stage__hover-meta">
              {hoveredNode.kind === 'event' ? 'EVENT' : 'ORGANIZATION'}
              {hoveredNode.verification ? ` · ${verificationLabel(hoveredNode.verification)}` : ''}
            </span>
          </div>
        )}
      </div>

      <div className="three-stage__controls">
        <button type="button" className="three-stage__reset" onClick={resetView}>
          RESET VIEW
        </button>
      </div>

      <p className="three-stage__hint">
        DRAG TO ROTATE
        <br />
        CLICK A NODE
        <br />
        <span className="three-stage__counter">
          {layout.eventNodes.length} EVENTS · {layout.orgNodes.length} ORGANIZATIONS
        </span>
      </p>
    </div>
  );
}
