import Provenance from '../../components/common/Provenance';
import {
  ATTENTION_LINES,
  ATTENTION_LINES_SM,
  FRAME,
  TOKENS,
  TOKENS_SM,
  transformerEvent,
  transformerYear,
} from './ch03-data';
import type { AttentionLine } from './ch03-data';
import { vars } from './vars';
import './Transformer.css';

function LineLayer({ lines, className }: { lines: AttentionLine[]; className: string }) {
  return (
    <svg
      className={`tx__svg ${className}`}
      viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <g className="tx__links">
        {lines.map((line) => (
          <path
            key={line.id}
            className="tx__link"
            d={`M${line.x1} ${line.y1}L${line.x2} ${line.y2}`}
            pathLength={1}
            style={vars({
              '--lw': line.weight,
              '--t0': line.start,
              '--len': line.length.toFixed(3),
            })}
          />
        ))}
      </g>
    </svg>
  );
}

export default function TransformerAct() {
  return (
    <div className="tx">
      <p className="sr-only">THE MACHINE READS THE SENTENCE.</p>

      <div className="tx__steps" aria-hidden="true">
        <p className="tx__step tx__step--1 u-mono">01 / TOKENIZE</p>
        <p className="tx__step tx__step--2 u-mono">02 / ATTEND</p>
        <p className="tx__step tx__step--3 u-mono">03 / TRANSFORMER</p>
      </div>

      <div className="tx__field" aria-hidden="true">
        <div className="tx__plane" />
        <div className="tx__frame" style={vars({ '--fw': FRAME.width, '--fh': FRAME.height })}>
          <div className="tx__plate" />
          <div className="tx__baseline" />

          <LineLayer lines={ATTENTION_LINES} className="tx__svg--lg" />
          <LineLayer lines={ATTENTION_LINES_SM} className="tx__svg--sm" />

          {TOKENS.map((token, index) => {
            const narrow = TOKENS_SM[index] ?? token;
            return (
              <span
                key={token.id}
                className="tx__token"
                style={vars({
                  '--x': token.x,
                  '--y': token.y,
                  '--dx': token.dx,
                  '--dy': token.dy,
                  '--s': token.scale,
                  '--mx': narrow.x,
                  '--my': narrow.y,
                  '--mdx': narrow.dx,
                  '--mdy': narrow.dy,
                  '--ms': narrow.scale,
                })}
              >
                {token.text}
              </span>
            );
          })}
        </div>
      </div>

      <div className="tx__final">
        <div className="tx__final-head">
          <p className="u-meta">FIG. 02 · SELF-ATTENTION</p>
          <p className="u-meta">{transformerEvent?.displayDate}</p>
        </div>

        <div className="tx__final-main">
          <h3 className="tx__final-title">
            <span>ATTENTION</span>
            <span>IS ALL YOU</span>
            <span>NEED</span>
          </h3>
          <p className="tx__final-year u-year" aria-hidden="true">
            {transformerYear}
          </p>
        </div>

        <div className="tx__final-foot">
          <p className="tx__final-cn u-cn">一种架构，改变了此后语言模型的发展。</p>
          <div className="tx__final-meta">
            <p className="tx__final-note u-cn">概念性可视化，并非真实模型内部注意力数据。</p>
            {transformerEvent && (
              <Provenance
                source={transformerEvent.sources[0]}
                status={transformerEvent.verificationStatus}
                date={transformerEvent.displayDate}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
