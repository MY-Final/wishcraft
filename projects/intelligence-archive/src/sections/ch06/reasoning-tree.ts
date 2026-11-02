/**
 * CH06 推理树的手绘图结构（概念性可视化）。
 * 分支数量、剪枝位置、深度都是示意，不对应任何一次真实推理；
 * 页面上的每一个模型名与日期仍然来自 data/models.json。
 */

export type TreeNodeKind = 'branch' | 'tool' | 'result';

export interface TreeNode {
  id: string;
  x: number;
  y: number;
  label: string;
  kind: TreeNodeKind;
  /** 0..1：该节点开始生长的进度阈值 */
  reveal: number;
  pruned: boolean;
  /** 留在最终路径上的节点，会被加粗并保留到最后 */
  spine: boolean;
}

export interface TreeEdge {
  id: string;
  d: string;
  reveal: number;
  pruned: boolean;
  spine: boolean;
}

interface RawNode {
  id: string;
  x: number;
  y: number;
  label: string;
  parent?: string;
  kind?: TreeNodeKind;
  pruned?: boolean;
  spine?: boolean;
}

export const ROOT = { y: 5, from: 14, to: 86 };
const ROOT_X = 50;

const REVEAL_BY_ROW: Array<[number, number]> = [
  [30, 0.1],
  [50, 0.23],
  [68, 0.37],
  [85, 0.51],
  [999, 0.64],
];

function revealFor(y: number): number {
  for (const [limit, value] of REVEAL_BY_ROW) {
    if (y < limit) return value;
  }
  return 0.64;
}

const RAW: RawNode[] = [
  // 根：一个复杂问题被拆成五条并行的尝试
  { id: 'n1', x: 18, y: 20, label: '拆解', parent: 'root' },
  { id: 'n2', x: 34, y: 20, label: '查证', parent: 'root' },
  { id: 'n3', x: 50, y: 20, label: '反例', parent: 'root', spine: true },
  { id: 'n4', x: 66, y: 20, label: '试算', parent: 'root' },
  { id: 'n5', x: 82, y: 20, label: '边界', parent: 'root', pruned: true },

  { id: 'n11', x: 9, y: 39, label: '前提', parent: 'n1', pruned: true },
  { id: 'n12', x: 24, y: 39, label: '依赖', parent: 'n1', spine: true },
  { id: 'n21', x: 29, y: 39, label: '版本', parent: 'n2', pruned: true },
  { id: 'n22', x: 39, y: 39, label: '冲突', parent: 'n2' },
  { id: 'n31', x: 45, y: 39, label: '假设', parent: 'n3', spine: true },
  { id: 'n32', x: 56, y: 39, label: '日志', parent: 'n3', pruned: true },
  { id: 'n41', x: 63, y: 39, label: '试跑', parent: 'n4', spine: true },
  { id: 'n42', x: 73, y: 39, label: '基准', parent: 'n4', pruned: true },
  { id: 'n51', x: 80, y: 39, label: '时区', parent: 'n5', pruned: true },
  { id: 'n52', x: 90, y: 39, label: '权限', parent: 'n5', pruned: true },

  { id: 'n121', x: 19, y: 58, label: '排序', parent: 'n12', pruned: true },
  { id: 'n122', x: 31, y: 58, label: '迁移序列', parent: 'n12', spine: true },
  { id: 'n311', x: 41, y: 58, label: 'Python', parent: 'n31', kind: 'tool', spine: true },
  { id: 'n312', x: 52, y: 58, label: '回滚', parent: 'n31', pruned: true },
  { id: 'n411', x: 61, y: 58, label: '压测', parent: 'n41', spine: true },
  { id: 'n412', x: 70, y: 58, label: '并发', parent: 'n41', pruned: true },

  { id: 'n1221', x: 29, y: 76, label: '结论 A', parent: 'n122', spine: true },
  { id: 'n3111', x: 40, y: 76, label: '结论 B', parent: 'n311', spine: true },
  { id: 'n4111', x: 59, y: 76, label: '结论 C', parent: 'n411', pruned: true },

  { id: 'n0', x: ROOT_X, y: 91, label: '结果', parent: 'n1221', kind: 'result', spine: true },
];

function curve(fromX: number, fromY: number, toX: number, toY: number): string {
  const midY = fromY + (toY - fromY) * 0.52;
  return `M ${fromX.toFixed(2)} ${fromY.toFixed(2)} C ${fromX.toFixed(2)} ${midY.toFixed(
    2,
  )}, ${toX.toFixed(2)} ${(toY - (toY - fromY) * 0.42).toFixed(2)}, ${toX.toFixed(2)} ${toY.toFixed(
    2,
  )}`;
}

const byId = new Map(RAW.map((node) => [node.id, node]));

export const TREE_NODES: TreeNode[] = RAW.map((node) => {
  const pruned = node.pruned === true;
  return {
    id: node.id,
    x: node.x,
    y: node.y,
    label: node.label,
    kind: node.kind ?? 'branch',
    reveal: node.kind === 'result' ? 0.84 : revealFor(node.y),
    pruned,
    spine: node.spine === true && !pruned,
  };
});

export const TREE_EDGES: TreeEdge[] = [];
for (const node of RAW) {
  const base = revealFor(node.y) - 0.04;
  const pruned = node.pruned === true || Boolean(node.parent && byId.get(node.parent)?.pruned);
  if (node.parent === 'root') {
    TREE_EDGES.push({
      id: `root->${node.id}`,
      d: curve(node.x, ROOT.y, node.x, node.y),
      reveal: base,
      pruned,
      spine: node.spine === true,
    });
    continue;
  }
  const parent = node.parent ? byId.get(node.parent) : undefined;
  if (!parent) continue;
  TREE_EDGES.push({
    id: `${parent.id}->${node.id}`,
    d: curve(parent.x, parent.y, node.x, node.y),
    reveal: base,
    pruned,
    spine: node.spine === true && !pruned,
  });
}

/** 收束：存活叶子汇入结果节点 */
export const CONVERGENCE: TreeEdge[] = TREE_NODES.filter(
  (node) => node.kind !== 'result' && node.y >= 70 && !node.pruned,
).map((node) => ({
  id: `${node.id}->result`,
  d: curve(node.x, node.y, ROOT_X, 91),
  reveal: 0.8,
  pruned: false,
  spine: true,
}));

export const TREE_CAPTION = '概念性可视化 · 分支数量、剪枝位置与深度为示意，不对应任何一次真实推理';
