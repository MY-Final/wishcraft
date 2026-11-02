import { useEffect, useRef } from 'react';
import { QUESTION_TEXT } from '../data/tokenization';
import { ArrowRightIcon } from './icons';

interface LandingProps {
  onStart: () => void;
  leaving: boolean;
}

export default function Landing({ onStart, leaving }: LandingProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (leaving) return;
      if (event.key === 'Enter' && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [leaving, onStart]);

  return (
    <main
      ref={panelRef}
      className={`landing ${leaving ? 'is-leaving' : ''}`}
      aria-labelledby="landing-title"
    >
      <div className="landing__veil" aria-hidden="true" />

      <div className="landing__grid">
        <section className="landing__copy">
          <p className="eyebrow landing__eyebrow">
            <span className="eyebrow__tick" aria-hidden="true" />
            AN ANATOMY OF ONE INFERENCE
            <span className="eyebrow__cn">一次推理的解剖</span>
          </p>

          <h1 className="landing__title" id="landing-title">
            <span className="landing__title-line">当你按下发送，</span>
            <span className="landing__title-line">
              <em>AI 的世界</em>
              <span className="landing__title-tail">发生了什么？</span>
            </span>
          </h1>

          <p className="landing__lede">
            一句十个字符的问题，离开输入框，穿过网络、分词器、嵌入空间与
            Transformer 的层层计算，再以流的形式回到你的屏幕。
          </p>

          <div className="landing__facts" aria-label="作品信息">
            <span>
              <b>09</b> CHAPTERS
            </span>
            <span>
              <b>06</b> REAL TOKENS
            </span>
            <span>
              <b>≈120</b> SEC
            </span>
          </div>
        </section>

        <aside className="landing__console" aria-label="模拟聊天窗口">
          <div className="console__head">
            <span className="console__title">
              <i aria-hidden="true" />
              CONVERSATION / 模拟对话
            </span>
            <span className="console__status mono">LOCAL · READY</span>
          </div>

          <div className="console__body">
            <div className="console__message">
              <span className="console__role mono">YOU · 17:58</span>
              <p>{QUESTION_TEXT}</p>
            </div>
            <div className="console__thinking" aria-hidden="true">
              <span />
              <span />
              <span />
              <em>等待一次完整的计算旅程</em>
            </div>
          </div>

          <button
            className="console__composer"
            type="button"
            onClick={onStart}
            disabled={leaving}
            aria-label="用「为什么天空是蓝色的？」这个问题开始探索"
          >
            <span className="console__input-text">{QUESTION_TEXT}</span>
            <span className="console__send" aria-hidden="true">
              <ArrowRightIcon width="18" height="18" />
            </span>
          </button>

          <div className="console__foot">
            <span className="mono">DEMO REQUEST · 不连接真实模型服务</span>
            <span className="console__stream mono">STREAM: ON</span>
          </div>
        </aside>

        <div className="landing__start">
          <button className="start-button" type="button" onClick={onStart} disabled={leaving}>
            <span className="start-button__index mono">01 — 09</span>
            <span className="start-button__label">开始探索</span>
            <span className="start-button__arrow" aria-hidden="true">
              <ArrowRightIcon width="20" height="20" />
            </span>
          </button>
          <p className="landing__note">
            这是一段可交互的模拟演示。没有付费 API，没有真实监控；所有数字都标明了它们的来源。
          </p>
        </div>
      </div>

      <footer className="landing__footer" aria-hidden="true">
        <span className="mono">CLIENT → NETWORK → TOKENS → VECTORS → TRANSFORMER → STREAM → CLIENT</span>
        <span className="mono">WISHCRAFT · 2026</span>
      </footer>
    </main>
  );
}
