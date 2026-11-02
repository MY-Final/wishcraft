import { eventsForChapter, getEvent, getOrgName } from '../../data';
import type { HistoryEvent } from '../../data';

const chapterEvents = eventsForChapter(3);

/**
 * 叙事选材：五个技术节点（Seq2Seq 与注意力是同一年的两步，各自成板）。
 * 只挑 id，日期、标题、机构、出处全部来自数据模块。
 */
const RECORD_IDS = [
  'alexnet-2012',
  'gan-2014',
  'bahdanau-attention-2014',
  'seq2seq-2014',
  'resnet-2015',
  'alphago-nature-2016',
];

/** 排版用的短代号（装饰），对应事件本身，不引入任何新事实。 */
const MARKS: Record<string, string> = {
  'alexnet-2012': 'ALEXNET',
  'gan-2014': 'GAN',
  'bahdanau-attention-2014': 'ATTENTION',
  'seq2seq-2014': 'SEQ2SEQ',
  'resnet-2015': 'RESNET',
  'alphago-nature-2016': 'ALPHAGO',
};

export interface LedgerRecord {
  id: string;
  event: HistoryEvent;
  mark: string;
  year: string;
  orgs: string;
}

export const ledgerRecords: LedgerRecord[] = RECORD_IDS.map((id) =>
  chapterEvents.find((event) => event.id === id),
)
  .filter((event): event is HistoryEvent => Boolean(event))
  .sort((a, b) => a.date.localeCompare(b.date))
  .map((event) => ({
    id: event.id,
    event,
    mark: MARKS[event.id] ?? (event.titleEn ?? event.title).toUpperCase(),
    year: event.date.slice(0, 4),
    orgs: event.organizations.map(getOrgName).join(' · '),
  }));

/** 2017 高潮：Transformer。日期与出处一律取数据对象。 */
export const transformerEvent = getEvent('transformer-2017');
export const transformerYear = transformerEvent?.displayDate.split('.')[0] ?? '';

/* ------------------------------------------------------------------ *
 * Transformer 舞台的坐标系
 *
 * 画框 24em × 14em。桌面版把句子写在一行里：等宽字体每字符 0.6em，
 * 所以每个 token 的位置都能精确算出 —— SVG 细线的端点就是 token 的中心，
 * 线不是「大概连对」，而是真的连在字上。
 * 移动端屏幕太窄，句子改排两行，token 放大，另给一套坐标与连线。
 * 两套坐标都进入同一个 viewBox，因此线永远贴着字。
 * ------------------------------------------------------------------ */

export const FRAME = {
  width: 24,
  height: 14,
  /** 桌面句子左端（居中后两侧各留 2.4em） */
  baseX: 2.4,
  /** 桌面句子的基线行（token 盒子的上沿） */
  lineY: 8.4,
  /** 等宽字符宽度，单位 em */
  advance: 0.6,
} as const;

export interface TokenSpec {
  id: string;
  text: string;
  /** token 盒子左上角（em） */
  x: number;
  y: number;
  /** 散开后的位移（em） */
  dx: number;
  dy: number;
  /** 散开后的缩放，用来伪造景深 */
  scale: number;
}

interface RawToken {
  id: string;
  text: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  scale: number;
}

/** 桌面：一行句子（字符偏移 × 0.6em 得到 x）。 */
const DESKTOP_RAW: Array<RawToken & { offset: number }> = [
  { id: 'the-1', text: 'THE', offset: 0, x: 0, y: 0, dx: -2.0, dy: -3.9, scale: 1.3 },
  { id: 'machine', text: 'MACHINE', offset: 4, x: 0, y: 0, dx: 0.5, dy: 2.7, scale: 0.84 },
  { id: 'reads', text: 'READS', offset: 12, x: 0, y: 0, dx: 2.7, dy: -4.6, scale: 1.06 },
  { id: 'the-2', text: 'THE', offset: 18, x: 0, y: 0, dx: -3.5, dy: 3.9, scale: 0.9 },
  { id: 'sentence', text: 'SENTENCE', offset: 22, x: 0, y: 0, dx: 2.3, dy: -1.5, scale: 1.55 },
  { id: 'period', text: '.', offset: 30, x: 0, y: 0, dx: -5.2, dy: 2.9, scale: 0.78 },
];

/** 移动端：句子排两行，散开后在整幅画框里撑满。 */
const MOBILE_RAW: RawToken[] = [
  { id: 'the-1', text: 'THE', x: 5.1, y: 6.2, dx: -2.4, dy: -2.1, scale: 1.55 },
  { id: 'machine', text: 'MACHINE', x: 8.3, y: 6.2, dx: -1.2, dy: 3.9, scale: 1.0 },
  { id: 'reads', text: 'READS', x: 15.5, y: 6.2, dx: -2.4, dy: -2.7, scale: 1.5 },
  { id: 'the-2', text: 'THE', x: 6.3, y: 9.4, dx: -1.8, dy: 2.3, scale: 1.15 },
  { id: 'sentence', text: 'SENTENCE', x: 9.1, y: 9.4, dx: 4.7, dy: -1.5, scale: 1.9 },
  { id: 'period', text: '.', x: 18.5, y: 9.4, dx: 1.4, dy: 2.7, scale: 1.2 },
];

function strip(token: RawToken): TokenSpec {
  return {
    id: token.id,
    text: token.text,
    x: token.x,
    y: token.y,
    dx: token.dx,
    dy: token.dy,
    scale: token.scale,
  };
}

export const TOKENS: TokenSpec[] = DESKTOP_RAW.map((token) =>
  strip({
    ...token,
    x: FRAME.baseX + token.offset * FRAME.advance,
    y: FRAME.lineY,
  }),
);

export const TOKENS_SM: TokenSpec[] = MOBILE_RAW.map(strip);

/** token 中心点（散开之后），SVG 线端点用的就是它。 */
function centerOf(token: TokenSpec): { x: number; y: number } {
  return {
    x: token.x + (token.text.length * FRAME.advance) / 2 + token.dx,
    y: token.y + 0.5 + token.dy,
  };
}

export interface AttentionLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** 线长（用户单位 = em），用于描边生长动画 */
  length: number;
  /** 权重 0..1，决定线宽、透明度与出场顺序 */
  weight: number;
  start: number;
}

/** [from, to, weight] —— 概念性的注意力示意，不是真实权重。 */
const LINK_SPEC: Array<[number, number, number]> = [
  [4, 0, 0.95],
  [4, 1, 0.7],
  [3, 4, 0.85],
  [1, 3, 0.6],
  [4, 5, 0.55],
  [2, 5, 0.5],
  [0, 2, 0.45],
  [1, 5, 0.4],
  [2, 3, 0.35],
  [0, 1, 0.3],
  [0, 4, 0.25],
];

function buildLines(tokens: TokenSpec[]): AttentionLine[] {
  return LINK_SPEC.map(([from, to, weight], index) => {
    const a = centerOf(tokens[from]);
    const b = centerOf(tokens[to]);
    return {
      id: `${tokens[from].id}--${tokens[to].id}`,
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
      length: Math.hypot(b.x - a.x, b.y - a.y),
      weight,
      start: 0.34 + index * 0.024,
    };
  });
}

export const ATTENTION_LINES = buildLines(TOKENS);
export const ATTENTION_LINES_SM = buildLines(TOKENS_SM);
