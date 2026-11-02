import { useEffect, useRef } from 'react';
import { narrative } from './narrative-store';

/**
 * 把当前章节进度写成 CSS 变量 --p（0..1），供纯 CSS 编排滚动叙事。
 * 不触发 React 重渲染；只在 rAF 中直接操作 DOM。
 *
 * 用法：
 *   const ref = useStageProgress<HTMLDivElement>({ chapter: 3 });
 *   <div ref={ref} style={{ '--p': 0 }}>…
 *   CSS: transform: translateX(calc((1 - var(--p)) * 100vw));
 */
export function useStageProgress<T extends HTMLElement = HTMLDivElement>(options: {
  chapter: number;
}) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let frame = 0;
    let last = -1;

    const update = () => {
      frame = 0;
      const state = narrative.get();
      const progress =
        state.chapter === options.chapter
          ? state.chapterProgress
          : state.chapter > options.chapter
            ? 1
            : 0;
      if (Math.abs(progress - last) < 0.0008) return;
      last = progress;
      element.style.setProperty('--p', progress.toFixed(4));
    };

    const unsubscribe = narrative.subscribe(() => {
      if (!frame) frame = requestAnimationFrame(update);
    });
    update();

    return () => {
      unsubscribe();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [options.chapter]);

  return ref;
}
