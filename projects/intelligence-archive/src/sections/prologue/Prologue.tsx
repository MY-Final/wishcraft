import { useEffect, useState } from 'react';
import { useNarrative } from '../../lib/narrative-store';
import { clamp } from '../../lib/format';
import './Prologue.css';

const QUESTION_CN = '「机器能够思考吗？」';
const QUESTION_EN = 'CAN MACHINES THINK?';

export default function Prologue() {
  const progress = useNarrative((state) => state.chapterProgress);
  const reducedMotion = useNarrative((state) => state.reducedMotion);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (reducedMotion) {
      setStage(3);
      return;
    }
    setStage(0);
    const timers = [
      window.setTimeout(() => setStage(1), 420),
      window.setTimeout(() => setStage(2), 980),
      window.setTimeout(() => setStage(3), 3100),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [reducedMotion]);

  const camera = clamp((progress - 0.16) / 0.34);
  const questionOpacity = 1 - clamp((progress - 0.1) / 0.14);
  const titleOpacity = clamp((progress - 0.28) / 0.16);
  const cueOpacity = 1 - clamp(progress / 0.05);
  const lineLeft = 50 + camera * 16;
  const lineTop = 50 - camera * 50;
  const lineHeight = 4 + camera * 96;

  return (
    <section
      className="scene scene--prologue"
      data-scene
      data-chapter="0"
      data-year-start="1950"
      data-year-end="1950"
      aria-label="序章：第一个问题"
    >
      <div className="scene__stage prologue__stage">
        <div className="prologue__corner prologue__corner--tl u-meta">
          <span>ARCHIVE 001</span>
          <span className="prologue__corner-sub">AN INTERACTIVE RECORD</span>
        </div>
        <div className="prologue__corner prologue__corner--br u-meta">
          <span>WHITE MIRROR EDITION</span>
          <span className="prologue__corner-sub">1950 — 2026</span>
        </div>

        <div
          className="prologue__question"
          style={{
            opacity: questionOpacity,
            visibility: questionOpacity < 0.02 ? 'hidden' : 'visible',
          }}
        >
          <p className={`prologue__question-cn u-cn${stage >= 2 ? ' is-typed' : ''}`}>
            {Array.from(QUESTION_CN).map((character, index) => (
              <span key={`${character}-${index}`} style={{ animationDelay: `${640 + index * 88}ms` }}>
                {character}
              </span>
            ))}
          </p>
          <p className={`prologue__question-en u-mono${stage >= 2 ? ' is-typed' : ''}`}>
            {QUESTION_EN}
          </p>
          <p className="prologue__attribution" style={{ opacity: stage >= 3 ? 1 : 0 }}>
            <span className="u-mono">1950</span>
            <span className="prologue__attribution-dash" aria-hidden="true" />
            <span className="u-mono">ALAN TURING</span>
          </p>
        </div>

        <span
          className={`prologue__line${stage >= 1 ? ' is-visible' : ''}`}
          aria-hidden="true"
          style={{
            left: `${lineLeft}%`,
            top: `${lineTop}%`,
            height: `${lineHeight}vh`,
            transform: `scaleY(${reducedMotion ? 1 : clamp((progress + 0.06) / 0.2)})`,
          }}
        />

        <div className="prologue__title" style={{ opacity: titleOpacity }}>
          <p className="prologue__title-meta u-meta">AN INTERACTIVE RECORD OF MACHINE INTELLIGENCE</p>
          <h1 className="prologue__title-en">
            THE
            <br />
            INTELLIGENCE
            <br />
            ARCHIVE
          </h1>
          <div className="prologue__title-cn">
            <p className="prologue__title-zh u-cn">智能编年史</p>
            <p className="prologue__subtitle u-cn">从一个问题开始的智能革命。</p>
          </div>
        </div>

        <div className="prologue__vertical-meta u-mono" aria-hidden="true">
          <span>1950</span>
          <span>—</span>
          <span>2026.11.02</span>
        </div>

        <div className="prologue__cue" style={{ opacity: cueOpacity }}>
          <span className="prologue__cue-label u-meta">SCROLL TO BEGIN</span>
          <span className="prologue__cue-line" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
