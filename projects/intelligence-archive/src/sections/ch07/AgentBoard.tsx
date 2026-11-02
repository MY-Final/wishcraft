import type { CSSProperties } from 'react';
import { AGENT_STAGES, BOARD_VIEW } from './content';

const [intent, search, plan, code, tools, verify, deliver] = AGENT_STAGES;

/** 交接线：全部由模块坐标推导，改坐标时连线自动跟随。 */
const FLOWS = [
  {
    d: `M${intent.x + intent.w} ${intent.y + intent.h / 2} H${search.x}`,
    at: search.at - 0.012,
  },
  {
    d: `M${search.x + search.w} ${search.y + search.h / 2} H${plan.x}`,
    at: plan.at - 0.012,
  },
  {
    d: `M${plan.x + plan.w / 2} ${plan.y + plan.h} V${code.y}`,
    at: code.at - 0.012,
  },
  {
    d: `M${code.x} ${code.y + code.h / 2} H${tools.x + tools.w}`,
    at: tools.at - 0.012,
  },
  {
    d: `M${tools.x} ${tools.y + tools.h / 2} H${verify.x + verify.w}`,
    at: verify.at - 0.012,
  },
  {
    d: `M${verify.x + verify.w / 2} ${verify.y + verify.h} V${deliver.y}`,
    at: deliver.at - 0.012,
  },
];

const LOOP = `M${verify.x + verify.w / 2} ${verify.y} V40 H${plan.x + plan.w / 2} V${plan.y}`;
const INPUT_STUB = `M24 ${intent.y + intent.h / 2} H${intent.x}`;
const OUTPUT_STUB = `M${deliver.x + deliver.w} ${deliver.y + deliver.h / 2} H1218`;

export default function AgentBoard() {
  return (
    <div className="ch07__board">
      <div className="ch07__board-plane">
        <svg
          className="ch07__flow"
          viewBox={`0 0 ${BOARD_VIEW.w} ${BOARD_VIEW.h}`}
          role="presentation"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="ch07-loop-tip"
              viewBox="0 0 6 6"
              refX="5"
              refY="3"
              markerWidth="5"
              markerHeight="5"
              orient="auto"
            >
              <path d="M0 0 L6 3 L0 6 Z" className="ch07__loop-tip" />
            </marker>
          </defs>

          <path className="ch07__stub" d={INPUT_STUB} />
          <path className="ch07__stub ch07__stub--out" d={OUTPUT_STUB} />
          <path className="ch07__loop" d={LOOP} markerEnd="url(#ch07-loop-tip)" />

          {FLOWS.map((flow) => (
            <path key={flow.d} className="ch07__line" d={flow.d} />
          ))}
          {FLOWS.map((flow) => (
            <path
              key={`fill-${flow.d}`}
              className="ch07__line-fill"
              d={flow.d}
              pathLength={1}
              style={{ '--at': flow.at } as CSSProperties}
            />
          ))}
        </svg>

        <span className="ch07__board-label ch07__board-label--in u-mono">INPUT</span>
        <span className="ch07__board-label ch07__board-label--loop u-mono">REVISION LOOP</span>
        <span className="ch07__board-label ch07__board-label--out u-mono">DELIVERED</span>

        {AGENT_STAGES.map((item) => (
          <div
            key={item.id}
            className={`ch07__module ch07__module--${item.id}`}
            style={
              {
                '--x': item.x,
                '--y': item.y,
                '--w': item.w,
                '--h': item.h,
                '--at': item.at,
              } as CSSProperties
            }
          >
            <div className="ch07__module-top">
              <span className="ch07__module-index u-mono">{item.index}</span>
              <span className="ch07__module-dot" aria-hidden="true" />
            </div>
            <div className="ch07__module-body">
              <span className="ch07__module-name">{item.name}</span>
              <span className="ch07__module-meta u-mono">{item.en}</span>
              <span className="ch07__module-note">{item.note}</span>
            </div>
            {item.id === 'deliver' && (
              <span className="ch07__module-tag u-mono">HANDOFF</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
