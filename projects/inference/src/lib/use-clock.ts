import { useEffect, useRef, useState } from 'react';
import type { StagePosition } from '../data/journey';
import { journeyStore } from './journey-store';

export interface ClockReadout extends StagePosition {
  seconds: number;
  totalSeconds: number;
  playing: boolean;
}

function read(): ClockReadout {
  const clock = journeyStore.clock;
  const position = clock.position;
  return {
    ...position,
    seconds: clock.elapsedSeconds,
    totalSeconds: clock.remainingSeconds + clock.elapsedSeconds,
    playing: clock.playing,
  };
}

/**
 * A small, component-local RAF clock so the 3D loop and the high-frequency
 * timeline do not force the entire React tree to re-render every frame.
 */
export function useClockPosition(fps = 24): ClockReadout {
  const [readout, setReadout] = useState<ClockReadout>(read);
  const previous = useRef(readout);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const interval = 1000 / fps;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < interval) return;
      last = now;
      const next = read();
      const prior = previous.current;
      if (
        Math.abs(next.globalProgress - prior.globalProgress) < 0.00002 &&
        next.index === prior.index &&
        next.playing === prior.playing
      ) {
        return;
      }
      previous.current = next;
      setReadout(next);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [fps]);

  return readout;
}
