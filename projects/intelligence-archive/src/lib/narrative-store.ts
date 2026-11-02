import { useSyncExternalStore } from 'react';

export interface NarrativeState {
  scrollY: number;
  pageProgress: number;
  chapter: number;
  chapterProgress: number;
  year: number;
  velocity: number;
  direction: 1 | -1;
  reducedMotion: boolean;
  scrollable: boolean;
}

const state: NarrativeState = {
  scrollY: 0,
  pageProgress: 0,
  chapter: 0,
  chapterProgress: 0,
  year: 1950,
  velocity: 0,
  direction: 1,
  reducedMotion: false,
  scrollable: true,
};

const listeners = new Set<() => void>();
let notifyQueued = false;

function flush(): void {
  notifyQueued = false;
  for (const listener of listeners) listener();
}

function scheduleNotify(): void {
  if (notifyQueued) return;
  notifyQueued = true;
  queueMicrotask(flush);
}

export const narrative = {
  get(): NarrativeState {
    return state;
  },
  set(patch: Partial<NarrativeState>): void {
    let changed = false;
    (Object.keys(patch) as Array<keyof NarrativeState>).forEach((key) => {
      const next = patch[key];
      if (next !== undefined && state[key] !== next) {
        (state as unknown as Record<string, unknown>)[key] = next;
        changed = true;
      }
    });
    if (changed) scheduleNotify();
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useNarrative<T>(selector: (snapshot: NarrativeState) => T): T {
  return useSyncExternalStore(
    narrative.subscribe,
    () => selector(state),
    () => selector(state),
  );
}
