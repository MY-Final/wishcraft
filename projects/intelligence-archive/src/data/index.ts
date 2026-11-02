import type {
  FacetOption,
  HistoryEvent,
  Model,
  ModelCategory,
  Organization,
  SearchHit,
  VerificationStatus,
} from './types';
import modelsRaw from './models.json';
import eventsRaw from './events.json';
import organizationsRaw from './organizations.json';

export type { ChapterMeta, HistoryEvent, Model, Organization } from './types';
export { chapters, ARCHIVE_CUTOFF } from './chapters';

export const organizations = organizationsRaw as unknown as Organization[];

const organizationMap = new Map(organizations.map((org) => [org.id, org]));

export function padDate(value: string): string {
  if (!value) return '9999-99-99';
  if (value.length === 4) return `${value}-01-01`;
  if (value.length === 7) return `${value}-01`;
  return value;
}

function byDate<T extends { announcementDate?: string; date?: string }>(a: T, b: T): number {
  const da = a.announcementDate ?? a.date ?? '';
  const db = b.announcementDate ?? b.date ?? '';
  return padDate(da).localeCompare(padDate(db));
}

const rawModels = modelsRaw as unknown as Model[];

export const models: Model[] = rawModels
  .map((model) => ({
    ...model,
    predecessors: model.predecessors ?? [],
    successors: model.successors ?? [],
  }))
  .sort(byDate);

const modelMap = new Map(models.map((model) => [model.id, model]));

const derivedSuccessors = new Map<string, string[]>();
for (const model of models) {
  for (const predecessorId of model.predecessors) {
    const list = derivedSuccessors.get(predecessorId) ?? [];
    if (!list.includes(model.id)) list.push(model.id);
    derivedSuccessors.set(predecessorId, list);
  }
}

for (const model of models) {
  const derived = derivedSuccessors.get(model.id) ?? [];
  model.successors = Array.from(new Set([...model.successors, ...derived]));
}

export const events: HistoryEvent[] = (eventsRaw as unknown as HistoryEvent[])
  .map((event) => ({
    ...event,
    organizations: event.organizations ?? [],
    relatedModels: event.relatedModels ?? [],
  }))
  .sort(byDate);

const eventMap = new Map(events.map((event) => [event.id, event]));

export function getModel(id: string): Model | undefined {
  return modelMap.get(id);
}

export function getEvent(id: string): HistoryEvent | undefined {
  return eventMap.get(id);
}

export function getOrganization(id: string): Organization | undefined {
  return organizationMap.get(id);
}

export function getOrgName(id: string): string {
  return organizationMap.get(id)?.nameZh || organizationMap.get(id)?.name || id;
}

export function eventsForChapter(chapter: number): HistoryEvent[] {
  return events.filter((event) => event.chapter === chapter);
}

export function modelsBetween(from: string, to: string): Model[] {
  const start = padDate(from);
  const end = padDate(to);
  return models.filter((model) => {
    const key = padDate(model.announcementDate);
    return key >= start && key <= end;
  });
}

export function modelsInYear(year: number): Model[] {
  return models.filter((model) => Number(model.announcementDate.slice(0, 4)) === year);
}

export function modelsForChapter(chapter: number): Model[] {
  const ranges: Record<number, [string, string]> = {
    4: ['2018-01-01', '2022-12-31'],
    5: ['2023-01-01', '2024-12-31'],
    6: ['2025-01-01', '2025-12-31'],
    7: ['2026-01-01', '2026-11-02'],
  };
  const range = ranges[chapter];
  if (!range) return [];
  return modelsBetween(range[0], range[1]);
}

export function findModel(name: string): Model | undefined {
  const needle = name.toLowerCase().trim();
  return (
    models.find((model) => model.name.toLowerCase() === needle) ??
    models.find((model) => model.name.toLowerCase().startsWith(needle)) ??
    models.find((model) => model.name.toLowerCase().includes(needle))
  );
}

export function findModelStrict(name: string): Model | undefined {
  const needle = name.toLowerCase().trim();
  return models.find((model) => model.name.toLowerCase() === needle);
}

export function findEvent(title: string): HistoryEvent | undefined {
  const needle = title.toLowerCase().trim();
  return (
    events.find((event) => event.title.toLowerCase() === needle) ??
    events.find((event) => event.titleEn?.toLowerCase().startsWith(needle)) ??
    events.find((event) => event.title.toLowerCase().includes(needle))
  );
}

export function modelsByFamily(family: string): Model[] {
  return models.filter((model) => model.family === family);
}

export function modelsByOrganization(organizationId: string): Model[] {
  return models.filter((model) => model.organization === organizationId);
}

export function modelEdges(model: Model): { predecessors: Model[]; successors: Model[] } {
  return {
    predecessors: model.predecessors.map(getModel).filter(Boolean) as Model[],
    successors: model.successors.map(getModel).filter(Boolean) as Model[],
  };
}

export interface TimelineEntry {
  kind: 'model' | 'event';
  id: string;
  date: string;
  displayDate: string;
  title: string;
  subtitle: string;
  status: VerificationStatus;
  chapter: number;
}

export const timeline: TimelineEntry[] = [
  ...models.map((model) => ({
    kind: 'model' as const,
    id: model.id,
    date: model.announcementDate,
    displayDate: model.displayDate,
    title: model.name,
    subtitle: `${getOrgName(model.organization)} · ${model.family}`,
    status: model.verificationStatus,
    chapter: chapterForYear(Number(model.announcementDate.slice(0, 4))),
  })),
  ...events.map((event) => ({
    kind: 'event' as const,
    id: event.id,
    date: event.date,
    displayDate: event.displayDate,
    title: event.title,
    subtitle: event.titleEn || event.category,
    status: event.verificationStatus,
    chapter: event.chapter,
  })),
].sort((a, b) => padDate(a.date).localeCompare(padDate(b.date)));

export function chapterForYear(year: number): number {
  if (year <= 1979) return 1;
  if (year <= 2011) return 2;
  if (year <= 2017) return 3;
  if (year <= 2022) return 4;
  if (year <= 2024) return 5;
  if (year === 2025) return 6;
  return 7;
}

export function dateKey(value: string): number {
  return Number(padDate(value).replaceAll('-', ''));
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '');
}

function scoreHit(query: string, model: Model): number {
  const q = normalize(query);
  const name = normalize(model.name);
  const org = normalize(getOrgName(model.organization));
  const family = normalize(model.family);
  const tags = normalize(model.tags.join(' '));
  if (name === q) return 120;
  if (name.startsWith(q)) return 100;
  if (name.includes(q)) return 80;
  if (family.includes(q)) return 60;
  if (org.includes(q)) return 55;
  if (tags.includes(q)) return 40;
  if (normalize(model.summary).includes(q)) return 15;
  return 0;
}

export function searchArchive(query: string, limit = 60): SearchHit[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const hits: Array<SearchHit & { score: number }> = [];
  for (const model of models) {
    const score = scoreHit(trimmed, model);
    if (score > 0) {
      hits.push({
        kind: 'model',
        id: model.id,
        title: model.name,
        subtitle: `${getOrgName(model.organization)} · ${model.family}`,
        date: model.announcementDate,
        displayDate: model.displayDate,
        verificationStatus: model.verificationStatus,
        score,
      });
    }
  }
  const q = normalize(trimmed);
  for (const event of events) {
    const title = normalize(`${event.title} ${event.titleEn ?? ''}`);
    const orgs = normalize(event.organizations.map(getOrgName).join(' '));
    let score = 0;
    if (title.includes(q)) score = 65;
    else if (orgs.includes(q)) score = 35;
    if (score > 0) {
      hits.push({
        kind: 'event',
        id: event.id,
        title: event.title,
        subtitle: event.titleEn || '历史事件',
        date: event.date,
        displayDate: event.displayDate,
        verificationStatus: event.verificationStatus,
        score,
      });
    }
  }
  return hits
    .sort((a, b) => b.score - a.score || padDate(a.date).localeCompare(padDate(b.date)))
    .slice(0, limit)
    .map(({ score: _score, ...hit }) => hit);
}

function countFacet<T>(items: T[], getKey: (item: T) => string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    for (const key of getKey(item)) {
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return map;
}

function toOptions(map: Map<string, number>, label: (value: string) => string): FacetOption[] {
  return Array.from(map.entries())
    .map(([value, count]) => ({ value, label: label(value), count }))
    .sort((a, b) => a.value.localeCompare(b.value));
}

export interface ArchiveFacets {
  years: FacetOption[];
  organizations: FacetOption[];
  families: FacetOption[];
  categories: FacetOption[];
  countries: FacetOption[];
  tags: FacetOption[];
}

const categoryLabels: Record<ModelCategory, string> = {
  language: '语言模型',
  reasoning: '推理模型',
  multimodal: '多模态',
  coding: '代码模型',
  agent: 'Agent / 工具调用',
  image: '图像生成',
  video: '视频生成',
  audio: '语音 / 音频',
  science: '科学模型',
  other: '其他',
};

export function categoryLabel(category: string): string {
  return categoryLabels[category as ModelCategory] ?? category;
}

export function archiveFacets(): ArchiveFacets {
  const yearMap = countFacet(models, (model) => [model.announcementDate.slice(0, 4)]);
  const orgMap = countFacet(models, (model) => [model.organization]);
  const familyMap = countFacet(models, (model) => [model.family]);
  const categoryMap = countFacet(models, (model) => [model.category]);
  const countryMap = countFacet(models, (model) => [model.countryOrRegion]);
  const tagMap = countFacet(models, (model) => model.tags.slice(0, 3));
  return {
    years: toOptions(yearMap, (value) => value),
    organizations: toOptions(orgMap, (value) => getOrgName(value)),
    families: toOptions(familyMap, (value) => value),
    categories: toOptions(categoryMap, (value) => categoryLabel(value)),
    countries: toOptions(countryMap, (value) => value),
    tags: toOptions(tagMap, (value) => value).filter((tag) => tag.count > 1),
  };
}
