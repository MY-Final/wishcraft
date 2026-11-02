import type { CSSProperties } from 'react';
import {
  FIELD_EDGES,
  FIELD_NODES,
  FIELD_NODE_BY_ID,
  FIELD_RINGS,
  FIELD_SLOTS,
  FIELD_STATS,
} from './field-data';

interface FieldChartProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

function vars(values: Record<string, string | number>): CSSProperties {
  return values as CSSProperties;
}

/**
 * 二维星图（ConstellationStage 缺失时的降级实现）：
 * 半径 = 时间，扇区 = 机构，左半球 = 中国机构，右半球 = 其他机构，
 * 实心 = 权重未公开，空心 = 开放权重；选中节点会点亮它自己的前代/后续连线。
 */
export default function FieldChart({ selectedId, onSelect }: FieldChartProps) {
  const selected = FIELD_NODE_BY_ID.get(selectedId) ?? null;

  return (
    <div
      className="ch05__field"
      role="group"
      aria-label={`2023 至 2024 年模型星图：${FIELD_STATS.models} 个模型，${FIELD_STATS.orgs} 家机构，其中中国 ${FIELD_STATS.cn} 个模型。半径表示时间，左半球为中国机构。`}
    >
      <svg className="ch05__field-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <g className="ch05__halves" aria-hidden="true">
          <line x1={50} y1={50 - 45.6} x2={50} y2={50 + 45.6} />
        </g>

        <g className="ch05__spokes">
          {FIELD_SLOTS.map((slot) => {
            const radians = (slot.from * Math.PI) / 180;
            return (
              <line
                key={slot.org}
                x1={50 + Math.cos(radians) * 8}
                y1={50 + Math.sin(radians) * 8}
                x2={50 + Math.cos(radians) * 43}
                y2={50 + Math.sin(radians) * 43}
              />
            );
          })}
        </g>

        <g className="ch05__rings">
          {FIELD_RINGS.map((ring) => (
            <circle
              key={ring.label}
              className="ch05__ring"
              cx={50}
              cy={50}
              r={ring.r}
              style={vars({ '--t': ring.reveal })}
            />
          ))}
        </g>

        <g className="ch05__edges">
          {FIELD_EDGES.map((edge) => {
            const active = edge.from === selectedId || edge.to === selectedId;
            return (
              <path
                key={edge.id}
                className={`ch05__edge${active ? ' is-active' : ''}`}
                d={edge.d}
                style={vars({ '--t': edge.reveal })}
              />
            );
          })}
        </g>

        <g className="ch05__rim">
          {FIELD_SLOTS.filter((slot) => slot.showLabel).map((slot) => (
            <text
              key={slot.org}
              className={`ch05__rim-label${slot.cn ? ' is-cn' : ''}`}
              x={slot.labelX}
              y={slot.labelY}
              textAnchor={slot.anchor}
              dominantBaseline="middle"
            >
              {slot.label}
            </text>
          ))}
        </g>
      </svg>

      <div className="ch05__ring-labels" aria-hidden="true">
        {FIELD_RINGS.map((ring) => (
          <span
            key={ring.label}
            className="ch05__ring-label u-mono"
            style={vars({ '--t': ring.reveal, '--y': `${50 - ring.r}%` })}
          >
            {ring.label}
          </span>
        ))}
      </div>

      <div className="ch05__nodes">
        {FIELD_NODES.map((node) => {
          const isSelected = node.model.id === selectedId;
          return (
            <button
              key={node.model.id}
              type="button"
              className={`ch05__node${node.open ? ' is-open' : ''}${isSelected ? ' is-selected' : ''}`}
              style={vars({ '--x': `${node.x}%`, '--y': `${node.y}%`, '--t': node.reveal })}
              aria-pressed={isSelected}
              aria-label={`${node.model.name}，${node.model.displayDate}，${node.model.family}，${
                node.open ? '开放权重' : '权重未公开'
              }`}
              onClick={() => onSelect(node.model.id)}
              onFocus={() => onSelect(node.model.id)}
            >
              <span className="sr-only">{node.model.name}</span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div
          className={`ch05__pick${selected.x > 55 ? ' is-flipped' : ''}`}
          style={vars({ '--x': `${selected.x}%`, '--y': `${selected.y}%` })}
          aria-hidden="true"
        >
          <span className="ch05__pick-line" />
          <span className="ch05__pick-name">{selected.model.name}</span>
          <span className="ch05__pick-date u-mono">
            {selected.model.displayDate} · {selected.open ? '开放权重' : '权重未公开'}
          </span>
        </div>
      )}

      <p className="ch05__field-mark u-meta" aria-hidden="true">
        FIELD / {FIELD_STATS.models} MODELS · {FIELD_STATS.orgs} INSTITUTIONS
      </p>
      <p className="ch05__field-halves u-mono" aria-hidden="true">
        <span>CN {FIELD_STATS.cn}</span>
        <span>US &amp; OTHER {FIELD_STATS.other}</span>
      </p>
      <p className="ch05__field-key u-mono" aria-hidden="true">
        <span className="ch05__key-dot is-closed" /> 权重未公开
        <span className="ch05__key-dot is-open" /> 开放权重
      </p>
    </div>
  );
}
