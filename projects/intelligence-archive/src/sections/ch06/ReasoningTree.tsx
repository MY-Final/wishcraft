import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { CONVERGENCE, ROOT, TREE_CAPTION, TREE_EDGES, TREE_NODES } from './reasoning-tree';

function vars(values: Record<string, string | number>): CSSProperties {
  return values as CSSProperties;
}

/**
 * 中央推理树。线段用 stroke-dashoffset 生长，剪枝分支在 --p 越过阈值后淡出，
 * 存活路径在末端收束到结果节点。结构是概念性的，标注写在 caption 里。
 */
export default function ReasoningTree() {
  const svgRef = useRef<SVGSVGElement>(null);

  // pathLength 在不同浏览器里对 dash 的归一化并不一致，这里直接量出每条线的长度，
  // 写成 --len，让 stroke-dashoffset 在任何尺寸下都能精确地“画出来”。
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    for (const path of Array.from(svg.querySelectorAll<SVGPathElement>('.ch06__edge'))) {
      const length = path.getTotalLength();
      if (Number.isFinite(length) && length > 0) {
        path.style.setProperty('--len', length.toFixed(3));
      }
    }
  }, []);

  return (
    <div className="ch06__tree">
      <svg
        ref={svgRef}
        className="ch06__tree-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        <g className="ch06__root">
          <line x1={ROOT.from} y1={ROOT.y} x2={ROOT.to} y2={ROOT.y} />
          <line x1={50} y1={ROOT.y} x2={50} y2={ROOT.y + 2.4} className="ch06__root-stem" />
        </g>

        <g className="ch06__edges">
          {TREE_EDGES.map((edge) => (
            <path
              key={edge.id}
              className={`ch06__edge${edge.pruned ? ' is-pruned' : ''}${
                edge.spine ? ' is-spine' : ''
              }`}
              d={edge.d}
              pathLength={1}
              style={vars({ '--t': edge.reveal })}
            />
          ))}
        </g>

        <g className="ch06__converge">
          {CONVERGENCE.map((edge) => (
            <path
              key={edge.id}
              className="ch06__edge ch06__edge--result"
              d={edge.d}
              pathLength={1}
              style={vars({ '--t': edge.reveal })}
            />
          ))}
        </g>

        <g className="ch06__nodes">
          {TREE_NODES.map((node) => {
            const isResult = node.kind === 'result';
            return (
              <g
                key={node.id}
                className={`ch06__node${node.pruned ? ' is-pruned' : ''}${
                  node.spine ? ' is-spine' : ''
                }${isResult ? ' is-result' : ''}`}
                style={vars({ '--t': node.reveal })}
              >
                {isResult ? (
                  <>
                    <circle className="ch06__result-ring" cx={node.x} cy={node.y} r={3.6} />
                    <circle className="ch06__result-dot" cx={node.x} cy={node.y} r={1.5} />
                    <text
                      className="ch06__node-label is-result-label"
                      x={node.x}
                      y={node.y - 5.4}
                      textAnchor="middle"
                    >
                      {node.label}
                    </text>
                  </>
                ) : (
                  <>
                    {node.kind === 'tool' ? (
                      <rect
                        className="ch06__node-mark"
                        x={node.x - 1.1}
                        y={node.y - 1.1}
                        width={2.2}
                        height={2.2}
                      />
                    ) : (
                      <circle className="ch06__node-mark" cx={node.x} cy={node.y} r={1.05} />
                    )}
                    <text
                      className="ch06__node-label"
                      x={node.x}
                      y={node.y + 4.1}
                      textAnchor="middle"
                    >
                      {node.label}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <p className="ch06__tree-caption u-mono">{TREE_CAPTION}</p>
    </div>
  );
}
