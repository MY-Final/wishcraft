import { useCallback, useEffect, useRef, useState } from 'react';
import ChapterPanel from './components/ChapterPanel';
import Experience from './components/Experience';
import FinaleOverlay from './components/FinaleOverlay';
import Landing from './components/Landing';
import MetricsPanel from './components/MetricsPanel';
import OverlayHost from './components/OverlayHost';
import PlayerBar from './components/PlayerBar';
import SamplingPanel from './components/SamplingPanel';
import StageRail from './components/StageRail';
import StageSheet from './components/StageSheet';
import TopBar from './components/TopBar';
import { STAGES } from './data/journey';
import { journeyStore, useJourney } from './lib/journey-store';

export default function App() {
  const snapshot = useJourney();
  const [landingLeaving, setLandingLeaving] = useState(false);
  const [landingGone, setLandingGone] = useState(false);
  const [worldReady, setWorldReady] = useState(false);
  const [webglError, setWebglError] = useState(false);
  const [stagesOpen, setStagesOpen] = useState(false);
  const [exploreHint, setExploreHint] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const hintTimeoutRef = useRef<number | null>(null);

  const stage = STAGES[snapshot.stageIndex] ?? STAGES[0];
  const finaleVisible =
    snapshot.phase === 'ended' &&
    !snapshot.finaleDismissed &&
    !snapshot.notesOpen &&
    snapshot.deepDiveStage === null &&
    snapshot.infoId === null &&
    snapshot.tokenInspect === null;
  const showChrome = snapshot.phase !== 'landing' && !finaleVisible;

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      if (hintTimeoutRef.current !== null) window.clearTimeout(hintTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!snapshot.explore) {
      setExploreHint(false);
      return;
    }
    setExploreHint(true);
    if (hintTimeoutRef.current !== null) window.clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = window.setTimeout(() => setExploreHint(false), 6200);
    return () => {
      if (hintTimeoutRef.current !== null) window.clearTimeout(hintTimeoutRef.current);
    };
  }, [snapshot.explore]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = (target?.tagName ?? '').toLowerCase();
      if (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        tag === 'button' ||
        tag === 'a' ||
        target?.isContentEditable
      ) {
        return;
      }
      if (document.querySelector('dialog[open]')) return;
      if (snapshot.phase === 'landing') return;

      if (event.code === 'Space') {
        event.preventDefault();
        journeyStore.togglePlay();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        journeyStore.nextStage();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        journeyStore.previousStage();
      } else if (event.key.toLowerCase() === 'e') {
        journeyStore.toggleExplore();
      } else if (event.key.toLowerCase() === 'm') {
        journeyStore.toggleMetrics();
      } else if (event.key === '?') {
        journeyStore.openNotes();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [snapshot.phase]);

  const handleStart = useCallback(() => {
    if (landingLeaving || !worldReady) return;
    setLandingLeaving(true);
    journeyStore.start();
    timeoutRef.current = window.setTimeout(() => setLandingGone(true), 1050);
  }, [landingLeaving, worldReady]);

  const handleReady = useCallback(() => {
    setWorldReady(true);
  }, []);

  const handleUnsupported = useCallback(() => {
    setWorldReady(false);
    setWebglError(true);
  }, []);

  const rootClasses = [
    'app',
    snapshot.phase === 'landing' ? 'is-landing' : 'is-journey',
    snapshot.stageIndex === 6 ? 'is-decode' : '',
    finaleVisible ? 'is-finale' : '',
    snapshot.explore ? 'is-exploring' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div id="experience" className={rootClasses} data-stage={stage.index + 1}>
      {!webglError ? (
        <Experience onReady={handleReady} onUnsupported={handleUnsupported} />
      ) : (
        <div className="scene-fallback-field" aria-hidden="true" />
      )}

      <div className="ui-layer">
        <TopBar onOpenStages={() => setStagesOpen(true)} />

        {!landingGone && (snapshot.phase === 'landing' || landingLeaving) ? (
          <Landing onStart={handleStart} leaving={landingLeaving} />
        ) : null}

        {showChrome ? (
          <>
            <StageRail />
            <ChapterPanel />
            <MetricsPanel />
            {snapshot.stageIndex === 6 ? <SamplingPanel /> : null}

            {snapshot.explore && exploreHint ? (
              <div className="explore-hint" role="status">
                <i aria-hidden="true" />
                拖拽旋转 · 滚轮 / 双指缩放 · 点击结构查看解释
              </div>
            ) : null}

            <PlayerBar />
          </>
        ) : null}

        {finaleVisible ? <FinaleOverlay /> : null}
        <StageSheet open={stagesOpen} onClose={() => setStagesOpen(false)} />
      </div>

      <OverlayHost />

      {!webglError ? (
        <div className={`loading-screen ${worldReady ? 'is-done' : ''}`} aria-hidden={worldReady}>
          <div className="loading-screen__mark" aria-hidden="true" />
          <p className="loading-screen__text">INITIALISING INFERENCE FIELD / 正在构建推理现场</p>
          <div className="loading-screen__bar" aria-hidden="true">
            <span />
          </div>
        </div>
      ) : (
        <section className="webgl-fallback" role="alert" aria-labelledby="webgl-title">
          <div className="webgl-fallback__inner">
            <p className="eyebrow">
              <span className="eyebrow__tick" aria-hidden="true" />
              THE INFERENCE / FIELD NOTE 00
            </p>
            <h1 id="webgl-title">这台设备暂时无法进入三维现场。</h1>
            <p>
              本作品的核心场景需要 WebGL 与现代浏览器的硬件加速。请尝试更新浏览器、启用硬件加速，或换一台支持
              WebGL 2 的设备。你仍然可以阅读完整的技术档案。
            </p>
            <div className="webgl-fallback__actions">
              <button type="button" onClick={() => journeyStore.openNotes()}>
                打开技术档案
              </button>
              <a href="./">重新载入</a>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
