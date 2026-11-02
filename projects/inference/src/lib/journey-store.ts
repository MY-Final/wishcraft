import { useSyncExternalStore } from 'react';
import { STAGES } from '../data/journey';
import type { ArchitectureMode, ClientMode, Phase } from '../three/types';
import { JourneyClock, type PlaybackSpeed } from './journey-clock';

export interface JourneySnapshot {
  phase: Phase;
  stageIndex: number;
  playing: boolean;
  speed: PlaybackSpeed;
  explore: boolean;
  architecture: ArchitectureMode;
  clientMode: ClientMode;
  temperature: number;
  infoId: string | null;
  tokenInspect: number | null;
  deepDiveStage: number | null;
  notesOpen: boolean;
  metricsOpen: boolean;
  cameraNonce: number;
  reducedMotion: boolean;
  finaleDismissed: boolean;
}

type Listener = () => void;

class JourneyStore {
  readonly clock = new JourneyClock();
  private listeners = new Set<Listener>();
  private resumeAfterOverlay = false;
  private snapshot: JourneySnapshot = {
    phase: 'landing',
    stageIndex: 0,
    playing: false,
    speed: 1,
    explore: false,
    architecture: 'dense',
    clientMode: 'web',
    temperature: 0.7,
    infoId: null,
    tokenInspect: null,
    deepDiveStage: null,
    notesOpen: false,
    metricsOpen: true,
    cameraNonce: 0,
    reducedMotion:
      typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false,
    finaleDismissed: false,
  };

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): JourneySnapshot => this.snapshot;

  private emit(patch: Partial<JourneySnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  private pauseForOverlay(): void {
    if (this.clock.playing) {
      this.resumeAfterOverlay = true;
      this.clock.pause();
      this.emit({ playing: false });
    }
  }

  private finish(): void {
    this.clock.pause();
    this.emit({
      phase: 'ended',
      stageIndex: STAGES.length - 1,
      playing: false,
      explore: false,
      finaleDismissed: false,
    });
  }

  syncFromClock(completed: boolean): void {
    const position = this.clock.position;
    const shouldEnd = completed || this.clock.completed;
    if (shouldEnd && this.snapshot.phase === 'journey') {
      this.finish();
      return;
    }
    if (this.snapshot.phase === 'journey' && position.index !== this.snapshot.stageIndex) {
      this.emit({ stageIndex: position.index });
    }
  }

  dismissFinale = (): void => {
    this.emit({ finaleDismissed: true, explore: true });
  };

  start = (): void => {
    this.resumeAfterOverlay = false;
    this.clock.begin();
    this.emit({
      phase: 'journey',
      stageIndex: 0,
      playing: true,
      explore: false,
      infoId: null,
      tokenInspect: null,
      deepDiveStage: null,
      notesOpen: false,
      finaleDismissed: false,
    });
  };

  restart = (): void => {
    this.start();
  };

  togglePlay = (): void => {
    if (this.snapshot.phase === 'landing') {
      this.start();
      return;
    }
    if (this.snapshot.phase === 'ended') {
      this.start();
      return;
    }
    if (this.clock.playing) {
      this.clock.pause();
      this.emit({ playing: false });
    } else {
      this.clock.play();
      this.emit({ playing: true, explore: false });
    }
  };

  pause = (): void => {
    this.clock.pause();
    this.emit({ playing: false });
  };

  play = (): void => {
    if (this.snapshot.phase === 'landing') {
      this.start();
      return;
    }
    if (this.snapshot.phase === 'ended') {
      this.start();
      return;
    }
    this.clock.play();
    this.emit({ playing: true, explore: false });
  };

  nextStage = (): void => {
    if (this.snapshot.phase === 'landing') {
      this.start();
      return;
    }
    this.clock.nextStage();
    if (this.clock.completed) {
      this.finish();
      return;
    }
    this.emitFromClock();
  };

  previousStage = (): void => {
    if (this.snapshot.phase === 'landing') return;
    this.clock.previousStage();
    this.emitFromClock();
  };

  seekStage = (index: number): void => {
    if (this.snapshot.phase === 'landing') this.resumeAfterOverlay = false;
    this.clock.seekStage(index);
    this.emitFromClock();
  };

  seekProgress = (progress: number): void => {
    this.clock.seekProgress(progress);
    if (progress >= 1) {
      this.finish();
      return;
    }
    this.emitFromClock();
  };

  private emitFromClock(): void {
    const position = this.clock.position;
    const nextPhase: Phase =
      this.snapshot.phase === 'landing' || this.snapshot.phase === 'ended'
        ? this.clock.progress >= 1
          ? 'ended'
          : 'journey'
        : this.snapshot.phase;
    this.emit({
      phase: nextPhase,
      stageIndex: position.index,
      playing: this.clock.playing,
      explore: false,
      finaleDismissed: nextPhase === 'ended' ? this.snapshot.finaleDismissed : false,
    });
  }

  setSpeed = (speed: PlaybackSpeed): void => {
    this.clock.speed = speed;
    this.emit({ speed });
  };

  toggleExplore = (): void => {
    if (this.snapshot.phase === 'landing') {
      this.start();
      return;
    }
    const explore = !this.snapshot.explore;
    if (explore && this.clock.playing) {
      this.clock.pause();
      this.emit({ explore, playing: false, infoId: null, tokenInspect: null });
    } else {
      this.emit({ explore });
    }
  };

  openInfo = (id: string): void => {
    this.pauseForOverlay();
    this.emit({
      infoId: id,
      tokenInspect: null,
      deepDiveStage: null,
      notesOpen: false,
    });
  };

  openToken = (index: number): void => {
    this.pauseForOverlay();
    this.emit({
      tokenInspect: index,
      infoId: null,
      deepDiveStage: null,
      notesOpen: false,
    });
  };

  openDeepDive = (stageIndex: number): void => {
    this.pauseForOverlay();
    this.emit({
      deepDiveStage: stageIndex,
      infoId: null,
      tokenInspect: null,
      notesOpen: false,
    });
  };

  openNotes = (): void => {
    this.pauseForOverlay();
    this.emit({
      notesOpen: true,
      infoId: null,
      tokenInspect: null,
      deepDiveStage: null,
    });
  };

  closeOverlay = (): void => {
    const shouldResume = this.resumeAfterOverlay;
    this.resumeAfterOverlay = false;
    this.emit({ infoId: null, tokenInspect: null, deepDiveStage: null, notesOpen: false });
    if (shouldResume && this.snapshot.phase === 'journey') {
      this.clock.play();
      this.emit({ playing: true });
    }
  };

  toggleMetrics = (): void => {
    this.emit({ metricsOpen: !this.snapshot.metricsOpen });
  };

  resetCamera = (): void => {
    this.emit({ cameraNonce: this.snapshot.cameraNonce + 1 });
  };

  setArchitecture = (architecture: ArchitectureMode): void => {
    this.emit({ architecture });
  };

  setClientMode = (clientMode: ClientMode): void => {
    this.emit({ clientMode });
  };

  setTemperature = (temperature: number): void => {
    this.emit({ temperature: Math.min(1.5, Math.max(0.1, temperature)) });
  };
}

export const journeyStore = new JourneyStore();

export function useJourney(): JourneySnapshot {
  return useSyncExternalStore(journeyStore.subscribe, journeyStore.getSnapshot, journeyStore.getSnapshot);
}
