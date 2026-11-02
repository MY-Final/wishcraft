import { chapters } from '../data/chapters';
import { narrative } from './narrative-store';

interface SceneRecord {
  element: HTMLElement;
  top: number;
  height: number;
  chapter: number;
  yearStart: number;
  yearEnd: number;
}

let scenes: SceneRecord[] = [];
let mounted = false;
let frameRequest = 0;
let resizeObserver: ResizeObserver | null = null;
let reducedMotionQuery: MediaQueryList | null = null;

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function measure(): void {
  const scrollY = window.scrollY;
  scenes = Array.from(document.querySelectorAll<HTMLElement>('[data-scene]')).map((element) => {
    const chapter = Number(element.dataset.chapter ?? 0);
    const meta = chapters[chapter] ?? chapters[0];
    const rect = element.getBoundingClientRect();
    return {
      element,
      top: rect.top + scrollY,
      height: Math.max(rect.height, 1),
      chapter,
      yearStart: Number(element.dataset.yearStart ?? meta.startYear),
      yearEnd: Number(element.dataset.yearEnd ?? meta.endYear),
    };
  });
}

function update(): void {
  frameRequest = 0;
  const scrollY = window.scrollY;
  const viewportHeight = window.innerHeight;
  const documentHeight = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
    1,
  );
  const maxScroll = Math.max(documentHeight - viewportHeight, 1);
  const previous = narrative.get();
  const delta = scrollY - previous.scrollY;
  const direction: 1 | -1 = delta >= 0 ? 1 : -1;
  const velocity = clamp(Math.abs(delta) / 60, 0, 1.6);

  let active = scenes[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  const center = scrollY + viewportHeight * 0.5;
  for (const scene of scenes) {
    const sceneCenter = scene.top + scene.height * 0.5;
    const contains = scrollY >= scene.top - viewportHeight * 0.05 && scrollY < scene.top + scene.height;
    if (contains) {
      active = scene;
      break;
    }
    const distance = Math.abs(sceneCenter - center);
    if (distance < bestDistance) {
      bestDistance = distance;
      active = scene;
    }
  }

  if (!active) {
    narrative.set({ scrollY, velocity, direction });
    return;
  }

  const chapterProgress = clamp((scrollY - active.top) / Math.max(active.height - viewportHeight, 1));
  const rawYear = lerp(active.yearStart, active.yearEnd, chapterProgress);
  const year =
    active.yearStart === active.yearEnd ? active.yearStart : Math.round(rawYear);

  narrative.set({
    scrollY,
    pageProgress: clamp(scrollY / maxScroll),
    chapter: active.chapter,
    chapterProgress,
    year,
    velocity,
    direction,
  });
}

function requestUpdate(): void {
  if (frameRequest) return;
  frameRequest = requestAnimationFrame(update);
}

function handleResize(): void {
  measure();
  requestUpdate();
}

export function initScrollDirector(): () => void {
  if (mounted) return () => undefined;
  mounted = true;
  measure();
  update();

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);
  window.addEventListener('load', handleResize);

  resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(document.body);
  for (const scene of scenes) resizeObserver.observe(scene.element);

  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const applyReducedMotion = (): void => {
    narrative.set({ reducedMotion: reducedMotionQuery?.matches ?? false });
  };
  reducedMotionQuery.addEventListener('change', applyReducedMotion);
  applyReducedMotion();

  const refreshTimers = [
    window.setTimeout(handleResize, 600),
    window.setTimeout(handleResize, 1800),
  ];
  if (document.fonts?.ready) {
    document.fonts.ready.then(handleResize).catch(() => undefined);
  }

  return () => {
    mounted = false;
    refreshTimers.forEach((timer) => window.clearTimeout(timer));
    if (frameRequest) cancelAnimationFrame(frameRequest);
    frameRequest = 0;
    window.removeEventListener('scroll', requestUpdate);
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('orientationchange', handleResize);
    window.removeEventListener('load', handleResize);
    reducedMotionQuery?.removeEventListener('change', applyReducedMotion);
    resizeObserver?.disconnect();
    resizeObserver = null;
    scenes = [];
  };
}

export function scrollToChapter(index: number, progress = 0.06): void {
  const target = scenes.find((scene) => scene.chapter === index);
  if (!target) return;
  const viewportHeight = window.innerHeight;
  const top = target.top + Math.max(target.height - viewportHeight, 0) * progress;
  const behavior: ScrollBehavior = narrative.get().reducedMotion ? 'auto' : 'smooth';
  window.scrollTo({ top, behavior });
}

export function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: narrative.get().reducedMotion ? 'auto' : 'smooth' });
}

export function scrollToSceneSelector(selector: string): void {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) return;
  const top = element.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top, behavior: narrative.get().reducedMotion ? 'auto' : 'smooth' });
}

export function getChapterProgress(): number {
  return narrative.get().chapterProgress;
}

export function refreshScrollDirector(): void {
  measure();
  requestUpdate();
}
