import type { HistoryEvent, Model } from '../data/types';
import type {
  ModelFilterState,
  RelationEdge,
  RelationGraphData,
  RelationNode,
  SortOrder,
} from './types';

const STRIP = /[\s\u3000·・,，、/|—–\-_.]+/g;

const MAX_GRAPH_DEPTH = 3;
const MAX_GRAPH_PER_LEVEL = 4;

/** 折叠空白与分隔符后的检索用文本（"GPT-4o" 与 "gpt4o" 等价）。 */
export function normalizeText(value: string): string {
  return value.toLowerCase().replace(STRIP, '');
}

export function tokenize(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/[\s\u3000]+/)
    .filter(Boolean);
}

function modelHaystack(model: Model, orgText: (id: string) => string): string {
  return normalizeText(
    [
      model.name,
      model.family,
      model.generation,
      model.countryOrRegion,
      model.category,
      model.architecture,
      model.parameters ?? '',
      model.contextWindow ?? '',
      model.tags.join(' '),
      model.capabilities.join(' '),
      model.summary,
      model.keyAdvancement,
      model.displayDate,
      orgText(model.organization),
    ].join(' '),
  );
}

export function modelMatchesQuery(
  model: Model,
  query: string,
  orgText: (id: string) => string,
): boolean {
  const tokens = tokenize(query);
  if (!tokens.length) return true;
  const haystack = modelHaystack(model, orgText);
  return tokens.every((token) => haystack.includes(normalizeText(token)));
}

export function eventMatchesQuery(
  event: HistoryEvent,
  query: string,
  orgText: (id: string) => string,
): boolean {
  const tokens = tokenize(query);
  if (!tokens.length) return true;
  const haystack = normalizeText(
    [
      event.title,
      event.titleEn ?? '',
      event.category,
      event.displayDate,
      event.summary,
      event.significance,
      (event.people ?? []).join(' '),
      event.organizations.map((id) => orgText(id)).join(' '),
    ].join(' '),
  );
  return tokens.every((token) => haystack.includes(normalizeText(token)));
}

export function applyModelFilters(
  models: Model[],
  filters: ModelFilterState,
  orgText: (id: string) => string,
): Model[] {
  return models.filter((model) => {
    if (filters.year && model.announcementDate.slice(0, 4) !== filters.year) return false;
    if (filters.organization && model.organization !== filters.organization) return false;
    if (filters.family && model.family !== filters.family) return false;
    if (filters.category && model.category !== filters.category) return false;
    if (filters.country && model.countryOrRegion !== filters.country) return false;
    if (filters.status && model.verificationStatus !== filters.status) return false;
    return modelMatchesQuery(model, filters.query, orgText);
  });
}

export function countActiveFilters(filters: ModelFilterState): number {
  return Object.values(filters).filter((value) => value.trim() !== '').length;
}

export function dateScore(value: string): number {
  const [year = '', month = '', day = ''] = value.split('-');
  return Number(year || 0) * 10000 + Number(month || 0) * 100 + Number(day || 0);
}

export function sortModelsByDate(models: Model[], order: SortOrder): Model[] {
  const factor = order === 'asc' ? 1 : -1;
  return [...models].sort((a, b) => {
    const diff = dateScore(a.announcementDate) - dateScore(b.announcementDate);
    if (diff !== 0) return diff * factor;
    return a.name.localeCompare(b.name) * factor;
  });
}

export interface YearGroup {
  year: string;
  models: Model[];
}

export function groupModelsByYear(models: Model[]): YearGroup[] {
  const map = new Map<string, Model[]>();
  const order: string[] = [];
  for (const model of models) {
    const year = model.announcementDate.slice(0, 4) || '——';
    if (!map.has(year)) {
      map.set(year, []);
      order.push(year);
    }
    map.get(year)?.push(model);
  }
  return order.map((year) => ({ year, models: map.get(year) ?? [] }));
}

export function dateParts(displayDate: string): { year: string; month: string; day: string } {
  const [year = '', month = '', day = ''] = displayDate.split('.');
  return { year, month, day };
}

export function sameFamilyModels(root: Model, all: Model[]): Model[] {
  return all
    .filter((model) => model.family === root.family && model.id !== root.id)
    .sort((a, b) => dateScore(a.announcementDate) - dateScore(b.announcementDate));
}

/**
 * 去重并排除已在其他分组出现的词条（标签与能力常常互相重复）。
 * 比较键使用 normalizeText，因此大小写、空格与分隔符差异不会造成重复。
 */
export function dedupeLabels(items: string[], exclude: string[] = []): string[] {
  const excluded = new Set(exclude.map(normalizeText).filter(Boolean));
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const key = normalizeText(item);
    if (!key || excluded.has(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(item.trim());
  }
  return result;
}

/**
 * 只根据 predecessors / successors 真实边构建上下最多 3 层的图谱。
 * 同一机构不会被自动连边。
 */
export function buildRelationGraph(
  root: Model,
  resolve: (id: string) => Model | undefined,
): RelationGraphData {
  const depths = new Map<string, number>([[root.id, 0]]);
  const included = new Map<string, Model>([[root.id, root]]);
  let truncated = false;

  const walk = (direction: 'up' | 'down') => {
    let frontier: Model[] = [root];
    for (let level = 1; level <= MAX_GRAPH_DEPTH; level += 1) {
      const next: Model[] = [];
      for (const node of frontier) {
        const ids = direction === 'up' ? node.predecessors : node.successors;
        for (const id of ids) {
          const target = resolve(id);
          if (!target || depths.has(target.id)) continue;
          if (next.length >= MAX_GRAPH_PER_LEVEL) {
            truncated = true;
            continue;
          }
          depths.set(target.id, direction === 'up' ? -level : level);
          included.set(target.id, target);
          next.push(target);
        }
      }
      if (!next.length) break;
      frontier = next;
    }
  };

  walk('up');
  walk('down');

  const nodes: RelationNode[] = Array.from(included.values()).map((model) => ({
    model,
    depth: depths.get(model.id) ?? 0,
    row: 0,
  }));
  const byDepth = new Map<number, RelationNode[]>();
  for (const node of nodes) {
    const list = byDepth.get(node.depth) ?? [];
    list.push(node);
    byDepth.set(node.depth, list);
  }
  for (const list of byDepth.values()) {
    list.sort((a, b) => dateScore(a.model.announcementDate) - dateScore(b.model.announcementDate));
    list.forEach((node, index) => {
      node.row = index;
    });
  }
  nodes.sort((a, b) => a.depth - b.depth || a.row - b.row);

  const edges: RelationEdge[] = [];
  for (const source of nodes) {
    for (const target of nodes) {
      if (source.depth >= target.depth) continue;
      if (target.depth - source.depth !== 1) continue;
      const linked =
        source.model.successors.includes(target.model.id) ||
        target.model.predecessors.includes(source.model.id);
      if (linked) edges.push({ from: source.model.id, to: target.model.id });
    }
  }

  return {
    nodes,
    edges,
    hasEdges: edges.length > 0,
    truncated,
    columns: byDepth.size,
  };
}
