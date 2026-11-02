import { getModel, models as allModels } from '../data';
import type { Model } from '../data/types';
import { orgName } from './data-utils';
import { buildRelationGraph, dateScore, sameFamilyModels } from './logic';
import type { RelationNode } from './types';
import './RelationGraph.css';

const NODE_W = 142;
const NODE_H = 48;
const GAP_X = 46;
const GAP_Y = 14;
const PAD_X = 8;
const TOP = 28;
const BOTTOM = 8;

interface RelationGraphProps {
  model: Model;
  onNavigate: (id: string) => void;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function columnLabel(depth: number): string {
  if (depth === 0) return '当前模型';
  if (depth === -1) return '直接前代';
  if (depth === 1) return '直接后续';
  return depth < 0 ? `前代 ${-depth} 层` : `后续 ${depth} 层`;
}

export function RelationGraph({ model, onNavigate }: RelationGraphProps) {
  const graph = buildRelationGraph(model, getModel);
  const family = sameFamilyModels(model, allModels);
  const predecessors = model.predecessors
    .map((id) => getModel(id))
    .filter((item): item is Model => Boolean(item));
  const successors = model.successors
    .map((id) => getModel(id))
    .filter((item): item is Model => Boolean(item));

  const columns = new Map<number, RelationNode[]>();
  for (const node of graph.nodes) {
    const list = columns.get(node.depth) ?? [];
    list.push(node);
    columns.set(node.depth, list);
  }
  const depths = Array.from(columns.keys()).sort((a, b) => a - b);
  const rows = Math.max(1, ...depths.map((depth) => columns.get(depth)?.length ?? 0));
  const width = PAD_X * 2 + depths.length * NODE_W + Math.max(depths.length - 1, 0) * GAP_X;
  const height = TOP + BOTTOM + rows * NODE_H + Math.max(rows - 1, 0) * GAP_Y;

  const positions = new Map<string, { x: number; y: number }>();
  const labels: Array<{ depth: number; x: number }> = [];
  depths.forEach((depth, columnIndex) => {
    const list = columns.get(depth) ?? [];
    const columnHeight = list.length * NODE_H + Math.max(list.length - 1, 0) * GAP_Y;
    const startY = TOP + (height - TOP - BOTTOM - columnHeight) / 2;
    const x = PAD_X + columnIndex * (NODE_W + GAP_X);
    labels.push({ depth, x });
    list.forEach((node, row) => {
      positions.set(node.model.id, { x, y: startY + row * (NODE_H + GAP_Y) });
    });
  });

  const familyList = [...family, model].sort(
    (a, b) => dateScore(a.announcementDate) - dateScore(b.announcementDate),
  );

  return (
    <div className="arch-graph">
      <div className="arch-graph__links">
        <div className="arch-graph__link-group">
          <p className="arch-graph__link-label u-meta">PREDECESSORS / 前代</p>
          {predecessors.length ? (
            <ul className="arch-graph__link-list">
              {predecessors.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="arch-graph__link"
                    onClick={() => onNavigate(item.id)}
                    aria-label={`打开前代模型 ${item.name} 档案`}
                  >
                    <span>{item.name}</span>
                    <span className="u-mono">{item.displayDate}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="arch-graph__none">未记录</p>
          )}
        </div>
        <div className="arch-graph__link-group">
          <p className="arch-graph__link-label u-meta">SUCCESSORS / 后续</p>
          {successors.length ? (
            <ul className="arch-graph__link-list">
              {successors.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="arch-graph__link"
                    onClick={() => onNavigate(item.id)}
                    aria-label={`打开后续模型 ${item.name} 档案`}
                  >
                    <span>{item.name}</span>
                    <span className="u-mono">{item.displayDate}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="arch-graph__none">未记录</p>
          )}
        </div>
      </div>

      {graph.hasEdges ? (
        <div className="arch-graph__canvas-wrap">
          <div className="arch-graph__scroll">
            <svg
              className="arch-graph__canvas"
              viewBox={`0 0 ${width} ${height}`}
              width={width}
              height={height}
              role="group"
              aria-label="模型继承关系图，可用 Tab 键遍历节点"
            >
              {labels.map((label) => (
                <text key={label.depth} className="arch-graph__col-label" x={label.x} y={11}>
                  {columnLabel(label.depth)}
                </text>
              ))}
              {graph.edges.map((edge) => {
                const from = positions.get(edge.from);
                const to = positions.get(edge.to);
                if (!from || !to) return null;
                const x1 = from.x + NODE_W;
                const y1 = from.y + NODE_H / 2;
                const x2 = to.x;
                const y2 = to.y + NODE_H / 2;
                const mid = (x1 + x2) / 2;
                return (
                  <path
                    key={`${edge.from}->${edge.to}`}
                    className="arch-graph__edge"
                    d={`M ${x1} ${y1} C ${mid} ${y1} ${mid} ${y2} ${x2} ${y2}`}
                  />
                );
              })}
              {graph.nodes.map((node) => {
                const position = positions.get(node.model.id);
                if (!position) return null;
                const isCurrent = node.model.id === model.id;
                return (
                  <g
                    key={node.model.id}
                    className={`arch-graph__node${isCurrent ? ' is-current' : ''}`}
                    transform={`translate(${position.x} ${position.y})`}
                    tabIndex={0}
                    role="button"
                    aria-current={isCurrent ? 'true' : undefined}
                    aria-label={
                      isCurrent
                        ? `${node.model.name}（当前查看）`
                        : `打开 ${node.model.name} 档案，${node.model.displayDate}`
                    }
                    onClick={() => {
                      if (!isCurrent) onNavigate(node.model.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      if (!isCurrent) onNavigate(node.model.id);
                    }}
                  >
                    <rect width={NODE_W} height={NODE_H} />
                    <text className="arch-graph__name" x={10} y={20}>
                      {truncate(node.model.name, 18)}
                    </text>
                    <text className="arch-graph__meta" x={10} y={35}>
                      {node.model.displayDate} · {truncate(orgName(node.model.organization), 8)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <p className="arch-graph__hint u-meta">
            图谱按真实 predecessors / successors 边展开，最多上下 3 层、每层 4 个节点
            {graph.truncated ? ' · 已截断' : ''}
          </p>
        </div>
      ) : (
        <div className="arch-graph__empty" role="status">
          <p className="arch-graph__empty-title">未记录直接继承关系</p>
          <p className="arch-graph__empty-body u-caption">
            档案只连接有依据的技术继承或同家族直接前代。同一机构不会被推测为继承关系。
          </p>
        </div>
      )}

      {familyList.length > 1 ? (
        <div className="arch-graph__family">
          <p className="arch-graph__link-label u-meta">
            SAME FAMILY / 同家族版本 · {model.family} · {familyList.length} RECORDS
          </p>
          <ul className="arch-graph__family-list">
            {familyList.map((item) =>
              item.id === model.id ? (
                <li key={item.id}>
                  <span className="arch-graph__family-item is-current u-mono" aria-current="true">
                    {item.displayDate} · {item.name}
                  </span>
                </li>
              ) : (
                <li key={item.id}>
                  <button
                    type="button"
                    className="arch-graph__family-item u-mono"
                    onClick={() => onNavigate(item.id)}
                  >
                    {item.displayDate} · {item.name}
                  </button>
                </li>
              ),
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
