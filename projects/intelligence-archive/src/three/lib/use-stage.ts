/**
 * OWNER: three
 * 视口 / 页面可见性 hooks。章节内嵌舞台离开视口时，
 * Canvas 切到 frameloop="never"，停止一切渲染与 useFrame。
 */
import { useEffect, useState, type RefObject } from 'react';
import { setStageVisible, type StageKind } from './presence';

export function useInView<T extends HTMLElement>(
  ref: RefObject<T | null>,
  rootMargin = '160px',
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        let next = false;
        for (const entry of entries) {
          if (entry.isIntersecting) next = true;
        }
        setInView(next);
      },
      { rootMargin, threshold: 0 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return inView;
}

export function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(
    typeof document === 'undefined' ? true : document.visibilityState !== 'hidden',
  );

  useEffect(() => {
    const handle = (): void => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, []);

  return visible;
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    typeof window === 'undefined' ? false : window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handle = (): void => setReduced(query.matches);
    query.addEventListener('change', handle);
    return () => query.removeEventListener('change', handle);
  }, []);

  return reduced;
}

/**
 * 把内嵌舞台的可见性登记到全局 presence 表。
 * 返回当前是否应继续渲染。
 */
export function useStageActivity<T extends HTMLElement>(
  ref: RefObject<T | null>,
  kind: StageKind,
): { inView: boolean; pageVisible: boolean; active: boolean } {
  const inView = useInView(ref);
  const pageVisible = useDocumentVisible();

  useEffect(() => {
    setStageVisible(kind, inView && pageVisible);
    return () => setStageVisible(kind, false);
  }, [inView, pageVisible, kind]);

  return { inView, pageVisible, active: inView && pageVisible };
}
