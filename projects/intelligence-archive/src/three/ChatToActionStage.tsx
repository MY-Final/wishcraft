/**
 * OWNER: three
 * 第七章内嵌舞台：FROM CHAT TO ACTION。
 *
 * 接口（与 lead 确认）：
 *   <ChatToActionStage />
 * 自带 R3F Canvas，铺满父容器（父容器负责尺寸，建议 100svh sticky 舞台）。
 * 场景由 narrative.get() 的第七章进度驱动：
 *   对话框 → 七个黑色半透明模块依次展开 → 连线传递 → 收束为黑色矩形。
 * 黑色矩形收束后与第八章镜面位置对齐，章节 DOM/CSS 可在其上叠加说明文字。
 * 不劫持页面滚动；离开视口停止渲染。
 * 可选 `demoProgress`（0—1）仅供 DEV 预览固定某一帧，生产不要传。
 */
import { Canvas } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import { useNarrative } from '../lib/narrative-store';
import { readQuality } from './lib/quality';
import { useStageActivity } from './lib/use-stage';
import ChatToActionScene, { AGENT_MODULES } from './scene/ChatToActionScene';
import './three.css';

export interface ChatToActionStageProps {
  className?: string;
  /** 仅 DEV 预览使用：固定进度 0—1 */
  demoProgress?: number;
}

export default function ChatToActionStage({ className, demoProgress }: ChatToActionStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Array<HTMLDivElement | null>>(
    [],
  ) as RefObject<Array<HTMLDivElement | null>>;
  const quality = useMemo(readQuality, []);
  const reducedMotion = useNarrative((state) => state.reducedMotion);
  const { active } = useStageActivity(containerRef, 'action');
  const demo = typeof demoProgress === 'number';

  const frameloop = demo ? 'always' : !active ? 'never' : reducedMotion ? 'demand' : 'always';

  return (
    <div
      ref={containerRef}
      className={`three-stage action-stage${className ? ` ${className}` : ''}`}
      aria-label="从对话到行动：需求理解、检索、规划、编码、工具、验证、交付七个环节"
    >
      <Canvas
        frameloop={frameloop}
        dpr={quality.dpr}
        camera={{ fov: 34, near: 0.1, far: 30, position: [0, 0, 4.2] }}
        gl={{ alpha: true, antialias: true, stencil: false, depth: true }}
        onCreated={({ gl }) => {
          gl.setClearAlpha(0);
        }}
      >
        <ChatToActionScene
          quality={quality}
          reducedMotion={reducedMotion}
          labelRefs={labelRefs}
          demoProgress={demo ? demoProgress : undefined}
        />
      </Canvas>

      <div className="three-agent-labels">
        {AGENT_MODULES.map((module, index) => (
          <div
            key={module.key}
            className="three-agent-label"
            ref={(element) => {
              labelRefs.current[index] = element;
            }}
          >
            <div className="three-agent-label__inner">
              <span className="three-agent-label__index">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="three-agent-label__zh u-cn">{module.zh}</span>
              <span className="three-agent-label__en">{module.en}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="three-stage__hint">
        FROM CHAT TO ACTION
        <br />
        7 STAGES · ONE SYSTEM
      </p>
    </div>
  );
}
