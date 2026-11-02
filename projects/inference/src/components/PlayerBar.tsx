import { useEffect, useRef } from 'react';
import { STAGES, TOTAL_DURATION, formatDuration } from '../data/journey';
import { journeyStore, useJourney } from '../lib/journey-store';
import type { PlaybackSpeed } from '../lib/journey-clock';
import { useClockPosition } from '../lib/use-clock';
import {
  CameraResetIcon,
  CompassIcon,
  PauseIcon,
  PlayIcon,
  ReplayIcon,
  StepBackIcon,
  StepForwardIcon,
} from './icons';

const SPEEDS: PlaybackSpeed[] = [0.5, 1, 2];

export default function PlayerBar() {
  const snapshot = useJourney();
  const readout = useClockPosition(30);
  const dragging = useRef(false);
  const wasPlaying = useRef(false);
  const stage = STAGES[snapshot.stageIndex] ?? STAGES[0];

  useEffect(() => {
    const endDrag = () => {
      if (!dragging.current) return;
      dragging.current = false;
      if (wasPlaying.current && journeyStore.getSnapshot().phase === 'journey') {
        journeyStore.play();
      }
      wasPlaying.current = false;
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    return () => {
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    };
  }, []);

  const beginScrub = () => {
    if (dragging.current) return;
    dragging.current = true;
    wasPlaying.current = journeyStore.clock.playing;
    if (wasPlaying.current) journeyStore.pause();
  };

  const isEnded = snapshot.phase === 'ended';
  const playLabel = isEnded ? '重新播放' : snapshot.playing ? '暂停' : '继续播放';

  return (
    <footer className="player" aria-label="播放控制">
      <div className="player__inner">
        <div className="player__transport">
          <button
            className="transport-button transport-button--minor"
            type="button"
            onClick={() => journeyStore.restart()}
            aria-label="重新播放"
            title="重新播放"
          >
            <ReplayIcon width="16" height="16" />
          </button>
          <button
            className="transport-button transport-button--minor"
            type="button"
            onClick={() => journeyStore.previousStage()}
            aria-label="上一章"
            title="上一章"
          >
            <StepBackIcon width="16" height="16" />
          </button>
          <button
            className="transport-button transport-button--play"
            type="button"
            onClick={() => journeyStore.togglePlay()}
            aria-label={playLabel}
            title={playLabel}
          >
            {isEnded ? (
              <ReplayIcon width="18" height="18" />
            ) : snapshot.playing ? (
              <PauseIcon width="18" height="18" />
            ) : (
              <PlayIcon width="18" height="18" />
            )}
          </button>
          <button
            className="transport-button transport-button--minor"
            type="button"
            onClick={() => journeyStore.nextStage()}
            aria-label="下一章"
            title="下一章"
          >
            <StepForwardIcon width="16" height="16" />
          </button>
        </div>

        <div className="player__timeline">
          <div className="timeline__head">
            <span className="timeline__chapter">
              <span className="mono">{String(stage.index + 1).padStart(2, '0')}</span>
              <span>{stage.nav}</span>
            </span>
            <span className="timeline__time mono">
              {formatDuration(readout.seconds)} <span>/ {formatDuration(TOTAL_DURATION)}</span>
            </span>
          </div>

          <div className="timeline__rail">
            <div className="timeline__segments" aria-hidden="true">
              {STAGES.map((entry) => {
                const width = (entry.duration / TOTAL_DURATION) * 100;
                return (
                  <span
                    key={entry.id}
                    className={`timeline__segment ${entry.index === snapshot.stageIndex ? 'is-active' : ''}`}
                    style={{ width: `${width}%` }}
                    title={`${String(entry.index + 1).padStart(2, '0')} ${entry.nav}`}
                  />
                );
              })}
            </div>
            <div
              className="timeline__fill"
              style={{ transform: `scaleX(${readout.globalProgress})` }}
              aria-hidden="true"
            />
            <input
              className="timeline__range"
              type="range"
              min={0}
              max={1000}
              step={1}
              value={Math.round(readout.globalProgress * 1000)}
              aria-label="播放进度"
              aria-valuetext={`第 ${stage.index + 1} 章 ${stage.nav}，${Math.round(readout.globalProgress * 100)}%`}
              onPointerDown={beginScrub}
              onKeyDown={beginScrub}
              onKeyUp={() => {
                if (dragging.current) {
                  dragging.current = false;
                  if (wasPlaying.current && journeyStore.getSnapshot().phase === 'journey') journeyStore.play();
                  wasPlaying.current = false;
                }
              }}
              onChange={(event) => {
                journeyStore.seekProgress(Number(event.currentTarget.value) / 1000);
              }}
            />
          </div>

          <div className="timeline__scale mono" aria-hidden="true">
            <span>00:00</span>
            <span>REQUEST</span>
            <span>COMPUTE</span>
            <span>ARRIVAL</span>
            <span>{formatDuration(TOTAL_DURATION)}</span>
          </div>
        </div>

        <div className="player__tools">
          <div className="speed-group" role="group" aria-label="播放速度">
            {SPEEDS.map((speed) => (
              <button
                key={speed}
                type="button"
                className={`speed-group__button ${snapshot.speed === speed ? 'is-active' : ''}`}
                aria-pressed={snapshot.speed === speed}
                onClick={() => journeyStore.setSpeed(speed)}
              >
                {speed === 1 ? '1×' : `${speed}×`}
              </button>
            ))}
          </div>

          <button
            className={`tool-button ${snapshot.explore ? 'is-active' : ''}`}
            type="button"
            onClick={() => journeyStore.toggleExplore()}
            aria-pressed={snapshot.explore}
            title={snapshot.explore ? '退出自由探索' : '暂停时间轴，自由旋转与缩放镜头'}
          >
            <CompassIcon width="15" height="15" />
            <span>{snapshot.explore ? '退出探索' : '自由探索'}</span>
          </button>

          <button
            className="tool-button tool-button--icon"
            type="button"
            onClick={() => journeyStore.resetCamera()}
            title="重置镜头"
            aria-label="重置镜头"
          >
            <CameraResetIcon width="15" height="15" />
          </button>
        </div>
      </div>
    </footer>
  );
}
