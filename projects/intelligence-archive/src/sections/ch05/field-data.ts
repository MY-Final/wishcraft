/**
 * CH05 星图的几何层。所有坐标都由 data/models.json 的 2023—2024 条目推导：
 * 半径 = 时间（2023-01 圆心 → 2025-01 外圈），角度 = 机构扇区。
 * 机构扇区按条目数分配角宽，并按国别分成两个半球（CN / 其他），
 * 于是「中美同等篇幅」不是文案承诺，而是图形本身的对称。
 * 没有任何手写的模型名或日期进入几何；连线只使用 predecessors 中真实存在的关系。
 */
import { getOrganization, modelsForChapter, type Model } from '../../data';

export const FIELD_MODELS: Model[] = modelsForChapter(5);

const SPAN_START = Date.UTC(2023, 0, 1);
const SPAN_END = Date.UTC(2025, 0, 1);
const RADIUS_MIN = 0.27;
const RADIUS_MAX = 0.95;
const SCALE = 43;
/** 两个半球之间的空白扇区，单位：度 */
const HEMISPHERE_GAP = 7;
const MIN_WEIGHT = 1.4;

function dayRatio(model: Model): number {
  const parsed = Date.parse(model.announcementDate);
  if (!Number.isFinite(parsed)) return 0.5;
  return Math.min(1, Math.max(0, (parsed - SPAN_START) / (SPAN_END - SPAN_START)));
}

/** 稳定伪随机：同一 id 永远得到同一偏移，避免每次渲染节点跳动。 */
function noise(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 997) / 997;
}

function shortLabel(orgId: string): string {
  const name = getOrganization(orgId)?.name ?? orgId;
  return name.toUpperCase().slice(0, 16);
}

interface OrgSlot {
  org: string;
  label: string;
  models: Model[];
  weight: number;
  cn: boolean;
  firstDate: string;
}

const slots: OrgSlot[] = [];
for (const model of FIELD_MODELS) {
  const existing = slots.find((slot) => slot.org === model.organization);
  if (existing) existing.models.push(model);
  else
    slots.push({
      org: model.organization,
      label: shortLabel(model.organization),
      models: [model],
      weight: 0,
      cn: model.countryOrRegion === 'CN',
      firstDate: model.announcementDate,
    });
}

for (const slot of slots) slot.weight = Math.max(MIN_WEIGHT, slot.models.length);

const CN_SLOTS = slots.filter((slot) => slot.cn);
const OTHER_SLOTS = slots.filter((slot) => !slot.cn);
const CN_WEIGHT = CN_SLOTS.reduce((sum, slot) => sum + slot.weight, 0);
const OTHER_WEIGHT = OTHER_SLOTS.reduce((sum, slot) => sum + slot.weight, 0);
const TOTAL_WEIGHT = CN_WEIGHT + OTHER_WEIGHT || 1;
const AVAILABLE = 360 - HEMISPHERE_GAP * 2;

/** CN 占左半球：从底部 90° 顺时针经西侧到顶部 270°。 */
const CN_START = 90;
const CN_SPAN = (AVAILABLE * CN_WEIGHT) / TOTAL_WEIGHT;
const OTHER_START = CN_START + CN_SPAN + HEMISPHERE_GAP;
const OTHER_SPAN = AVAILABLE - CN_SPAN;

export interface FieldNode {
  model: Model;
  x: number;
  y: number;
  ratio: number;
  open: boolean;
  reveal: number;
  slot: number;
  cn: boolean;
}

export interface FieldEdge {
  id: string;
  from: string;
  to: string;
  d: string;
  reveal: number;
}

export interface FieldSlot {
  org: string;
  label: string;
  count: number;
  open: number;
  cn: boolean;
  from: number;
  to: number;
  labelX: number;
  labelY: number;
  anchor: 'start' | 'middle' | 'end';
  showLabel: boolean;
}

const nodeList: FieldNode[] = [];
const nodeById = new Map<string, FieldNode>();

function place(slot: OrgSlot, index: number, start: number, span: number) {
  const width = (span * slot.weight) / (slot.cn ? CN_WEIGHT : OTHER_WEIGHT);
  const center = start + width / 2;
  slot.models.forEach((model, modelIndex) => {
    const spread =
      slot.models.length === 1
        ? 0
        : (modelIndex / (slot.models.length - 1) - 0.5) * width * 0.72;
    const jitter = (noise(model.id) - 0.5) * Math.min(2.6, width * 0.18);
    const angle = ((center + spread + jitter) * Math.PI) / 180;
    const ratio = dayRatio(model);
    const radius =
      RADIUS_MIN + ratio * (RADIUS_MAX - RADIUS_MIN) + (noise(`${model.id}:r`) - 0.5) * 0.03;

    const node: FieldNode = {
      model,
      x: 50 + Math.cos(angle) * radius * SCALE,
      y: 50 + Math.sin(angle) * radius * SCALE,
      ratio,
      open: model.openWeights === true,
      reveal: 0.09 + ratio * 0.24,
      slot: index,
      cn: slot.cn,
    };
    nodeList.push(node);
    nodeById.set(model.id, node);
  });
}

let cursor = CN_START;
CN_SLOTS.forEach((slot, index) => {
  place(slot, index, cursor, CN_SPAN);
  cursor += (CN_SPAN * slot.weight) / CN_WEIGHT;
});
cursor = OTHER_START;
OTHER_SLOTS.forEach((slot, index) => {
  place(slot, index + CN_SLOTS.length, cursor, OTHER_SPAN);
  cursor += (OTHER_SPAN * slot.weight) / OTHER_WEIGHT;
});

export const FIELD_NODES: FieldNode[] = nodeList;
export const FIELD_NODE_BY_ID = nodeById;

export const FIELD_EDGES: FieldEdge[] = [];
for (const node of FIELD_NODES) {
  for (const predecessorId of node.model.predecessors) {
    const from = nodeById.get(predecessorId);
    if (!from) continue;
    const midX = (from.x + node.x) / 2;
    const midY = (from.y + node.y) / 2;
    const controlX = midX + (50 - midX) * 0.34;
    const controlY = midY + (50 - midY) * 0.34;
    FIELD_EDGES.push({
      id: `${predecessorId}->${node.model.id}`,
      from: predecessorId,
      to: node.model.id,
      d: `M ${from.x.toFixed(2)} ${from.y.toFixed(2)} Q ${controlX.toFixed(2)} ${controlY.toFixed(
        2,
      )} ${node.x.toFixed(2)} ${node.y.toFixed(2)}`,
      reveal: from.reveal + 0.03,
    });
  }
}

export const FIELD_SLOTS: FieldSlot[] = (() => {
  const list: FieldSlot[] = [];
  let cnCursor = CN_START;
  CN_SLOTS.forEach((slot) => {
    const from = cnCursor;
    const to = from + (CN_SPAN * slot.weight) / CN_WEIGHT;
    cnCursor = to;
    list.push(buildSlot(slot, from, to));
  });
  let otherCursor = OTHER_START;
  OTHER_SLOTS.forEach((slot) => {
    const from = otherCursor;
    const to = from + (OTHER_SPAN * slot.weight) / OTHER_WEIGHT;
    otherCursor = to;
    list.push(buildSlot(slot, from, to));
  });
  return list;
})();

function buildSlot(slot: OrgSlot, from: number, to: number): FieldSlot {
  const center = ((from + to) / 2) * (Math.PI / 180);
  const cos = Math.cos(center);
  return {
    org: slot.org,
    label: slot.label,
    count: slot.models.length,
    open: slot.models.filter((model) => model.openWeights === true).length,
    cn: slot.cn,
    from,
    to,
    labelX: 50 + cos * 1.035 * SCALE,
    labelY: 50 + Math.sin(center) * 1.035 * SCALE,
    anchor: cos > 0.32 ? 'start' : cos < -0.32 ? 'end' : 'middle',
    showLabel: slot.models.length >= 4,
  };
}

export const HEMISPHERE_LINES = [
  { id: 'cn', angle: CN_START },
  { id: 'other', angle: OTHER_START - HEMISPHERE_GAP },
];

export interface FieldRing {
  t: number;
  r: number;
  label: string;
  reveal: number;
}

function ringLabel(t: number): string {
  const date = new Date(SPAN_START + (SPAN_END - SPAN_START) * t);
  return `${date.getUTCFullYear()}.${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export const FIELD_RINGS: FieldRing[] = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
  t,
  r: (RADIUS_MIN + t * (RADIUS_MAX - RADIUS_MIN)) * SCALE,
  label: ringLabel(t),
  reveal: 0.02 + t * 0.05,
}));

export const FIELD_STATS = (() => {
  const cn = FIELD_MODELS.filter((model) => model.countryOrRegion === 'CN');
  const open = FIELD_MODELS.filter((model) => model.openWeights === true);
  const inYear = (list: Model[], year: string) =>
    list.filter((model) => model.announcementDate.startsWith(year)).length;
  return {
    models: FIELD_MODELS.length,
    orgs: slots.length,
    cn: cn.length,
    other: FIELD_MODELS.length - cn.length,
    cnOrgs: CN_SLOTS.length,
    otherOrgs: OTHER_SLOTS.length,
    open: open.length,
    closed: FIELD_MODELS.length - open.length,
    openFromCn: open.filter((model) => model.countryOrRegion === 'CN').length,
    edges: FIELD_EDGES.length,
    cn2023: inYear(cn, '2023'),
    cn2024: inYear(cn, '2024'),
    other2023: inYear(FIELD_MODELS, '2023') - inYear(cn, '2023'),
    other2024: inYear(FIELD_MODELS, '2024') - inYear(cn, '2024'),
  };
})();

/** 档案里同一天发布最集中的那一天：用来把「线断成面」写成可核实的事实。 */
export const PEAK_DAY = (() => {
  const byDate = new Map<string, Model[]>();
  for (const model of FIELD_MODELS) {
    const list = byDate.get(model.announcementDate) ?? [];
    list.push(model);
    byDate.set(model.announcementDate, list);
  }
  const ranked = Array.from(byDate.entries())
    .map(([date, models]) => ({
      date,
      models,
      orgs: new Set(models.map((model) => model.organization)).size,
    }))
    .sort(
      (a, b) => b.orgs - a.orgs || b.models.length - a.models.length || a.date.localeCompare(b.date),
    );
  const best = ranked[0];
  return {
    date: best?.date ?? '',
    displayDate: best?.models[0]?.displayDate ?? '',
    models: best?.models ?? [],
    orgs: best?.orgs ?? 0,
  };
})();

/** 默认选中：一个有代表性的 2024 模型；数据缺失时退回最后一条。 */
export const DEFAULT_MODEL_ID: string = (() => {
  const preferred = FIELD_MODELS.find((model) => model.id === 'gpt-4o');
  const from2024 = FIELD_MODELS.filter((model) => model.announcementDate.startsWith('2024'));
  const fallback = from2024.at(-1) ?? FIELD_MODELS.at(-1);
  return (preferred ?? fallback)?.id ?? '';
})();

export function groupByOrg(list: Model[]): Array<{ org: string; label: string; models: Model[] }> {
  const groups: Array<{ org: string; label: string; models: Model[] }> = [];
  for (const model of list) {
    const existing = groups.find((group) => group.org === model.organization);
    if (existing) existing.models.push(model);
    else
      groups.push({
        org: model.organization,
        label: shortLabel(model.organization),
        models: [model],
      });
  }
  return groups;
}
