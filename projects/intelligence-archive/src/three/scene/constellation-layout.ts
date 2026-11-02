/**
 * OWNER: three
 * 第五章模型星图布局。
 *
 * 机构 → 同心轨道（半径 = 空间区分），轨道线型分三档（实线 / 虚线 / 点线）。
 * 时间统一方向：2023-01 在正上方，顺时针走到 2024-12（角度按真实天数插值，
 * 不能用 YYYYMMDD 数字差，否则跨年会折叠）。
 * 机构过多时（本项目 2024 有 24 家），只为模型最多的 8 家各建一条轨道，
 * 其余合并为一条 "其他机构" 聚合轨道——聚合是显式的，筛选按钮会写明数量。
 */
import { getOrgName, type Model } from '../../data';

const RANGE_START = '2023-01-01';
const RANGE_END = '2024-12-31';
const INNER_RADIUS = 0.5;
const OUTER_RADIUS = 1.05;
const START_ANGLE = Math.PI / 2;
const MAX_ORBITS = 9;
const AGGREGATE_ID = '__other__';

export interface ConstellationNode {
  modelId: string;
  name: string;
  displayDate: string;
  organizationId: string;
  organizationName: string;
  orbitIndex: number;
  /** 每条轨道最早的一个模型：默认显示标签，作为星图的锚点 */
  anchor: boolean;
  position: [number, number, number];
}

export interface ConstellationOrbit {
  organizationId: string;
  name: string;
  radius: number;
  tier: 0 | 1 | 2;
  nodes: ConstellationNode[];
}

export interface ConstellationLayout {
  orbits: ConstellationOrbit[];
  nodes: ConstellationNode[];
  ticks: Float32Array;
  maxRadius: number;
  orgOptions: Array<{ id: string; label: string; count: number }>;
}

/** 把 YYYY[-MM[-DD]] 变成真正的“天序号”，用于跨年线性插值。 */
function dayNumber(value: string): number {
  const [year = '2023', month = '1', day = '1'] = value.split('-');
  return Date.UTC(Number(year), Number(month) - 1, Number(day)) / 86400000;
}

function angleFor(date: string, start: number, end: number): number {
  const t = Math.max(0, Math.min(1, (dayNumber(date) - start) / Math.max(end - start, 1)));
  return START_ANGLE - t * Math.PI * 2;
}

function buildTicks(maxRadius: number, start: number, end: number): Float32Array {
  const out: number[] = [];
  const outer = maxRadius + 0.06;
  for (let month = 0; month < 24; month += 1) {
    const year = 2023 + Math.floor(month / 12);
    const monthInYear = (month % 12) + 1;
    const key = `${year}-${String(monthInYear).padStart(2, '0')}-01`;
    const angle = angleFor(key, start, end);
    const length = monthInYear === 1 ? 0.1 : 0.045;
    out.push(
      Math.cos(angle) * outer,
      Math.sin(angle) * outer,
      0,
      Math.cos(angle) * (outer + length),
      Math.sin(angle) * (outer + length),
      0,
    );
  }
  return new Float32Array(out);
}

function buildOrbitRadius(index: number, total: number): number {
  if (total <= 1) return 1.0;
  return INNER_RADIUS + (index / (total - 1)) * (OUTER_RADIUS - INNER_RADIUS);
}

export function buildConstellationLayout(models: Model[]): ConstellationLayout {
  const start = dayNumber(RANGE_START);
  const end = dayNumber(RANGE_END);
  const inRange = models
    .filter((model) => {
      const day = dayNumber(model.announcementDate);
      return day >= start && day <= end;
    })
    .sort((a, b) => dayNumber(a.announcementDate) - dayNumber(b.announcementDate));

  const groups = new Map<string, Model[]>();
  for (const model of inRange) {
    const list = groups.get(model.organization);
    if (list) list.push(model);
    else groups.set(model.organization, [model]);
  }

  const ranked = [...groups.entries()].sort((a, b) => {
    if (b[1].length !== a[1].length) return b[1].length - a[1].length;
    return dayNumber(a[1][0]?.announcementDate ?? RANGE_START) - dayNumber(b[1][0]?.announcementDate ?? RANGE_START);
  });

  const useAggregate = ranked.length > MAX_ORBITS;
  const individual = useAggregate ? ranked.slice(0, MAX_ORBITS - 1) : ranked;
  const rest = useAggregate ? ranked.slice(MAX_ORBITS - 1) : [];

  const orbitEntries: Array<{ id: string; name: string; tier: 0 | 1 | 2; models: Model[] }> =
    individual.map(([organizationId, orgModels], index) => ({
      id: organizationId,
      name: getOrgName(organizationId),
      tier: (index % 3) as 0 | 1 | 2,
      models: orgModels,
    }));

  if (rest.length > 0) {
    const restModels = rest
      .flatMap(([, orgModels]) => orgModels)
      .sort((a, b) => dayNumber(a.announcementDate) - dayNumber(b.announcementDate));
    orbitEntries.push({
      id: AGGREGATE_ID,
      name: `其他 ${rest.length} 家`,
      tier: 2,
      models: restModels,
    });
  }

  const orbits: ConstellationOrbit[] = orbitEntries.map((entry, index) => {
    const radius = buildOrbitRadius(index, orbitEntries.length);
    const nodes = entry.models.map((model, modelIndex) => {
      const angle = angleFor(model.announcementDate, start, end);
      return {
        modelId: model.id,
        name: model.name,
        displayDate: model.displayDate,
        organizationId: model.organization,
        organizationName: getOrgName(model.organization),
        orbitIndex: index,
        anchor: modelIndex === 0,
        position: [Math.cos(angle) * radius, Math.sin(angle) * radius, 0] as [number, number, number],
      };
    });
    return { organizationId: entry.id, name: entry.name, radius, tier: entry.tier, nodes };
  });

  const nodes = orbits.flatMap((orbit) => orbit.nodes);
  const maxRadius = orbits.reduce((max, orbit) => Math.max(max, orbit.radius), INNER_RADIUS);

  return {
    orbits,
    nodes,
    ticks: buildTicks(maxRadius, start, end),
    maxRadius,
    orgOptions: orbits.map((orbit) => ({
      id: orbit.organizationId,
      label: orbit.name,
      count: orbit.nodes.length,
    })),
  };
}
