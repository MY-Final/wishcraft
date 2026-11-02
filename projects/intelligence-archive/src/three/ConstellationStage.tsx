/**
 * OWNER: three
 * 第五章内嵌舞台：模型星图（章节内 canvas，非全局层）。
 *
 * 接口（与 lead 确认）：
 *   <ConstellationStage onSelectModel={(id) => ...} />
 * 可选：models / className。父容器负责尺寸（组件铺满 100%×100%）。
 * 机构筛选与缩放按钮统一放在左下；不监听未聚焦/未按 Alt 的滚轮，不劫持页面滚动。
 */
import { Canvas } from '@react-three/fiber';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react';
import { modelsBetween, type Model } from '../data';
import { useNarrative } from '../lib/narrative-store';
import { clamp } from './lib/math';
import { detectWebGL, readQuality } from './lib/quality';
import { useStageActivity } from './lib/use-stage';
import ConstellationScene, { type ConstellationHover } from './scene/ConstellationScene';
import { buildConstellationLayout } from './scene/constellation-layout';
import './three.css';

export interface ConstellationStageProps {
  onSelectModel?: (id: string) => void;
  /** 默认 2023-01-01 — 2024-12-31 的全部模型 */
  models?: Model[];
  className?: string;
}

const DEFAULT_ROTATION = { x: 0.2, y: 0 };
const DEFAULT_ZOOM = 1;
const MIN_ZOOM = 0.72;
const MAX_ZOOM = 1.9;

export default function ConstellationStage({ onSelectModel, models, className }: ConstellationStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef({ ...DEFAULT_ROTATION });
  const draggingRef = useRef(false);
  const dragState = useRef({ pointerId: -1, x: 0, y: 0, travel: 0 });
  const focusedRef = useRef(false);
  const labelRefs = useRef<Array<HTMLDivElement | null>>([]) as RefObject<Array<HTMLDivElement | null>>;

  const quality = useMemo(readQuality, []);
  const webgl = useMemo(detectWebGL, []);
  const reducedMotion = useNarrative((state) => state.reducedMotion);
  const { active } = useStageActivity(containerRef, 'constellation');

  const sourceModels = useMemo(
    () => models ?? modelsBetween('2023-01-01', '2024-12-31'),
    [models],
  );
  const layout = useMemo(() => buildConstellationLayout(sourceModels), [sourceModels]);

  const [activeOrg, setActiveOrg] = useState<string | null>(null);
  const [hovered, setHovered] = useState<ConstellationHover | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [dragging, setDragging] = useState(false);
  const [revision, setRevision] = useState(0);

  const bump = (): void => setRevision((value) => value + 1);

  const hoveredModelId = hovered
    ? layout.orbits[hovered.orbitIndex]?.nodes[hovered.nodeIndex]?.modelId
    : undefined;

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const handleWheel = (event: WheelEvent): void => {
      if (!event.altKey && !focusedRef.current) return;
      event.preventDefault();
      setZoom((value) => clamp(value * (event.deltaY > 0 ? 0.94 : 1.06), MIN_ZOOM, MAX_ZOOM));
    };
    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('button')) return;
    dragState.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, travel: 0 };
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
    rotationRef.current.y += dx * 0.0055;
    rotationRef.current.x = clamp(rotationRef.current.x + dy * 0.004, -0.95, 0.95);
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

  const handleNodeClick = (modelId: string): void => {
    if (dragState.current.travel > 8) return;
    setSelectedId(modelId);
    onSelectModel?.(modelId);
  };

  const changeZoom = (factor: number): void => {
    setZoom((value) => clamp(value * factor, MIN_ZOOM, MAX_ZOOM));
  };

  const resetView = (): void => {
    rotationRef.current.x = DEFAULT_ROTATION.x;
    rotationRef.current.y = DEFAULT_ROTATION.y;
    setZoom(DEFAULT_ZOOM);
    bump();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const step = event.shiftKey ? 0.3 : 0.12;
    if (event.key === 'ArrowLeft') rotationRef.current.y -= step;
    else if (event.key === 'ArrowRight') rotationRef.current.y += step;
    else if (event.key === 'ArrowUp') rotationRef.current.x -= step * 0.7;
    else if (event.key === 'ArrowDown') rotationRef.current.x += step * 0.7;
    else if (event.key === '+' || event.key === '=') changeZoom(1.1);
    else if (event.key === '-' || event.key === '_') changeZoom(0.9);
    else if (event.key === 'Home') resetView();
    else return;
    event.preventDefault();
    rotationRef.current.x = clamp(rotationRef.current.x, -0.95, 0.95);
    bump();
  };

  const rootClassName = `three-stage constellation-stage${dragging ? ' is-dragging' : ''}${
    className ? ` ${className}` : ''
  }`;

  if (!webgl) return null;

  return (
    <div
      ref={containerRef}
      className={rootClassName}
      tabIndex={0}
      role="group"
      aria-label="2023—2024 全球模型星图：拖动旋转，点击节点查看模型档案"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={(event) => {
        if (draggingRef.current) endDrag(event);
      }}
      onKeyDown={handleKeyDown}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onBlur={() => {
        focusedRef.current = false;
      }}
    >
      <Canvas
        frameloop={!active ? 'never' : reducedMotion ? 'demand' : 'always'}
        dpr={quality.dpr}
        camera={{ fov: 34, near: 0.1, far: 30, position: [0, 0, 4.9] }}
        gl={{ alpha: true, antialias: true, stencil: false, depth: true }}
        onCreated={({ gl }) => {
          gl.setClearAlpha(0);
        }}
      >
        <ConstellationScene
          layout={layout}
          activeOrg={activeOrg}
          hovered={hovered}
          selectedId={selectedId}
          rotationRef={rotationRef}
          draggingRef={draggingRef}
          zoom={zoom}
          reducedMotion={reducedMotion}
          revision={revision}
          labelRefs={labelRefs}
          onHover={setHovered}
          onClickNode={handleNodeClick}
        />
      </Canvas>

      <div className="three-stage__labels">
        {layout.nodes.map((node, index) => {
          const isActive = node.modelId === selectedId || node.modelId === hoveredModelId;
          return (
            <div
              key={node.modelId}
              ref={(element) => {
                labelRefs.current[index] = element;
              }}
              className={`three-stage__label${isActive ? ' is-active' : ''}`}
            >
              <span className="three-stage__label-inner">
                <span className="three-stage__label-name">{node.name}</span>
                <span className="three-stage__label-date">{node.displayDate}</span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="three-stage__controls">
        <div className="three-stage__filter" role="group" aria-label="按机构筛选">
          <button
            type="button"
            aria-pressed={activeOrg === null}
            onClick={() => {
              setActiveOrg(null);
              bump();
            }}
          >
            全部
          </button>
          {layout.orgOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={activeOrg === option.id}
              onClick={() => {
                setActiveOrg(option.id);
                bump();
              }}
            >
              {option.label} · {option.count}
            </button>
          ))}
        </div>
        <div className="three-stage__zoom" role="group" aria-label="缩放">
          <button type="button" aria-label="缩小" onClick={() => changeZoom(0.9)}>
            −
          </button>
          <button type="button" aria-label="放大" onClick={() => changeZoom(1.1)}>
            +
          </button>
          <button type="button" className="three-stage__reset" onClick={resetView}>
            RESET
          </button>
        </div>
      </div>

      <p className="three-stage__hint">
        DRAG TO ROTATE
        <br />
        ALT + WHEEL TO ZOOM
        <br />
        <span className="three-stage__counter">
          2023 — 2024 · {layout.nodes.length} MODELS · {layout.orbits.length} TRACKS
        </span>
      </p>
    </div>
  );
}
