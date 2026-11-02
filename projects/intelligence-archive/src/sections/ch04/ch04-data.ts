import { categoryLabel, eventsForChapter, getOrgName, modelsForChapter } from '../../data';
import type { HistoryEvent, Model } from '../../data';
import type { Source, VerificationStatus } from '../../data/types';

const chapterModels = modelsForChapter(4);
const chapterEvents = eventsForChapter(4);

/**
 * 叙事选材：语言模型的主线 + 三次外部转折（搜索落地、缩放定律/API、AlphaFold、Chinchilla）。
 * 只挑 id；名称、日期、机构、出处全部来自数据模块，并按日期排序。
 */
const MODEL_IDS = [
  'gpt-1',
  'bert',
  'gpt-2',
  'dall-e',
  'gpt-3',
  'codex',
  'instructgpt',
  'stable-diffusion',
  'chatgpt',
];

const EVENT_IDS = [
  'bert-search-rollout',
  'scaling-laws-2020',
  'openai-api-launch',
  'alphafold-2-2020',
  'chinchilla-2022',
];

export interface TrackNode {
  id: string;
  kind: 'model' | 'event';
  /** 排序用的完整日期（不渲染） */
  sortKey: string;
  /** 展示用日期，点分格式，来自 displayDate */
  date: string;
  name: string;
  subtitle: string;
  org: string;
  kindLabel: string;
  body: string;
  source?: Source;
  status: VerificationStatus;
}

function fromModel(model: Model): TrackNode {
  return {
    id: model.id,
    kind: 'model',
    sortKey: model.announcementDate,
    date: model.displayDate,
    name: model.name,
    subtitle: model.family,
    org: getOrgName(model.organization),
    kindLabel: categoryLabel(model.category),
    body: model.significance,
    source: model.sources[0],
    status: model.verificationStatus,
  };
}

function fromEvent(event: HistoryEvent): TrackNode {
  return {
    id: event.id,
    kind: 'event',
    sortKey: event.date,
    date: event.displayDate,
    name: event.title,
    subtitle: event.titleEn ?? event.category,
    org: event.organizations.map(getOrgName).join(' · '),
    kindLabel: 'EVENT',
    body: event.significance,
    source: event.sources[0],
    status: event.verificationStatus,
  };
}

export const trackNodes: TrackNode[] = [
  ...chapterModels.filter((model) => MODEL_IDS.includes(model.id)).map(fromModel),
  ...chapterEvents.filter((event) => EVENT_IDS.includes(event.id)).map(fromEvent),
].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

/** 2022.11.30 的高潮：数据里的 ChatGPT 条目。 */
export const chatGpt = chapterModels.find((model) => model.id === 'chatgpt');
export const chatGptDate = chatGpt?.displayDate ?? '';
