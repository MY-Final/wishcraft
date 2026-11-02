import { useEffect, useRef } from 'react';
import { generatedTokensAt } from '../data/metrics';
import { journeyStore } from '../lib/journey-store';
import { detectWebGL, readQuality } from '../three/quality';
import { World, type WorldInput } from '../three/World';

interface ExperienceProps {
  onReady: () => void;
  onUnsupported: () => void;
}

declare global {
  interface Window {
    __INFERENCE__?: {
      getSnapshot: typeof journeyStore.getSnapshot;
      clock: typeof journeyStore.clock;
      world: World;
      getDebugInfo: () => ReturnType<World['getDebugInfo']>;
    };
  }
}

export default function Experience({ onReady, onUnsupported }: ExperienceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  const callbacks = useRef({ onReady, onUnsupported });
  callbacks.current = { onReady, onUnsupported };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!detectWebGL()) {
      callbacks.current.onUnsupported();
      return;
    }

    let cancelled = false;
    let raf = 0;
    let world: World | null = null;
    let startedAt = 0;
    let lastFrame = 0;
    const quality = readQuality();

    const loop = (now: number) => {
      if (cancelled || !world) return;
      raf = requestAnimationFrame(loop);
      const dt = lastFrame === 0 ? 1 / 60 : Math.min(0.06, (now - lastFrame) / 1000);
      lastFrame = now;

      const snapshot = journeyStore.getSnapshot();
      if (snapshot.phase === 'journey') {
        journeyStore.clock.advance(dt);
        journeyStore.syncFromClock(journeyStore.clock.completed);
      }

      const current = journeyStore.getSnapshot();
      const clock = journeyStore.clock;
      const position =
        current.phase === 'landing'
          ? { index: 0, localProgress: 0, globalProgress: 0, stageElapsed: 0 }
          : current.phase === 'ended'
            ? { index: 8, localProgress: 1, globalProgress: 1, stageElapsed: 0 }
            : clock.position;

      const input: WorldInput = {
        phase: current.phase,
        stageIndex: position.index,
        stageProgress: position.localProgress,
        globalProgress: position.globalProgress,
        time: (now - startedAt) / 1000,
        stageElapsed: position.stageElapsed,
        speed: current.speed,
        playing: clock.playing,
        architecture: current.architecture,
        clientMode: current.clientMode,
        temperature: current.temperature,
        reducedMotion: current.reducedMotion || quality.reducedMotion,
        quality,
        generatedTokenCount: generatedTokensAt(position.index, position.localProgress),
        explore: current.explore,
        cameraNonce: current.cameraNonce,
      };

      world.update(input, dt);
    };

    const setup = async () => {
      try {
        await document.fonts.ready;
        if (cancelled) return;
        world = new World(canvas, {
          quality,
          onPick: (infoId, tokenIndex) => {
            const snapshot = journeyStore.getSnapshot();
            if (snapshot.phase === 'landing') return;
            if (typeof tokenIndex === 'number') journeyStore.openToken(tokenIndex);
            else journeyStore.openInfo(infoId);
          },
        });
        if (cancelled) {
          world.dispose();
          return;
        }
        worldRef.current = world;
        startedAt = performance.now();
        lastFrame = 0;
        window.__INFERENCE__ = {
          getSnapshot: journeyStore.getSnapshot,
          clock: journeyStore.clock,
          world,
          getDebugInfo: () => world!.getDebugInfo(),
        };
        document.documentElement.dataset.ready = 'true';
        callbacks.current.onReady();
        raf = requestAnimationFrame(loop);
      } catch (error) {
        console.error('[THE INFERENCE] WebGL setup failed', error);
        if (!cancelled) callbacks.current.onUnsupported();
      }
    };

    void setup();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      world?.dispose();
      worldRef.current = null;
      if (window.__INFERENCE__) delete window.__INFERENCE__;
      delete document.documentElement.dataset.ready;
    };
  }, []);

  return (
    <div className="scene-shell">
      <canvas
        ref={canvasRef}
        className="scene-canvas"
        aria-hidden="true"
        tabIndex={-1}
      />
      <div className="scene-grain" aria-hidden="true" />
    </div>
  );
}
