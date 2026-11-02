import { modelsForChapter } from '../../data';
import type { Model } from '../../data';

/**
 * 2026 年的真实发布记录。modelsForChapter(7) 已按 announcementDate 升序返回，
 * 版面上不再重排：档案墙的顺序就是时间顺序。
 *
 * 注：GPT-6.1 Sol 一度被误判为不存在而排除；经 AWS Bedrock 官方模型卡与独立核查确认
 * （launch date 2026-09-29），已补入数据，此处不再做任何排除。
 */
export const RELEASES: Model[] = modelsForChapter(7);

export interface YearStats {
  total: number;
  agent: number;
  open: number;
  orgs: number;
}

export const STATS: YearStats = {
  total: RELEASES.length,
  agent: RELEASES.filter((model) => model.category === 'agent').length,
  open: RELEASES.filter((model) => model.openWeights === true).length,
  orgs: new Set(RELEASES.map((model) => model.organization)).size,
};

/**
 * 叙事上必须点名的条目：代际切换（Astra）、计算机使用下放（Terra）、
 * 成本陡降（Opus 5.5）、开源长上下文（DeepSeek-V4 系列）。
 */
export const PRIORITY_IDS = [
  'gpt-6-astra',
  'gpt-6-1-terra',
  'claude-opus-5-5',
  'deepseek-v4-pro',
  'deepseek-v4-1-flash',
  'gpt-5-6-sol',
];

export interface AgentStage {
  id: string;
  index: string;
  name: string;
  en: string;
  note: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 该模块在 --p 上开始展开的位置 */
  at: number;
}

const VIEW_W = 1240;
export const BOARD_VIEW = { w: VIEW_W, h: 760 } as const;

const FIRST = 0.338;
const STEP = 0.021;

function stage(
  id: string,
  index: string,
  name: string,
  en: string,
  note: string,
  x: number,
  y: number,
  w: number,
  h: number,
  order: number,
): AgentStage {
  return { id, index, name, en, note, x, y, w, h, at: FIRST + order * STEP };
}

/** 一条蛇形产线：上排向右，中排向左，最后由一条宽交付条收口。 */
export const AGENT_STAGES: AgentStage[] = [
  stage('intent', '01', '需求理解', 'INTENT', '意图 · 约束 · 目标', 70, 80, 250, 92, 0),
  stage('search', '02', '信息检索', 'RETRIEVAL', '文档 · 代码 · 环境', 470, 80, 250, 92, 1),
  stage('plan', '03', '任务规划', 'PLANNING', '步骤 · 依赖 · 预算', 870, 80, 250, 92, 2),
  stage('code', '04', '代码编写', 'CODE', '生成 · 修改 · 迁移', 870, 310, 250, 92, 3),
  stage('tools', '05', '工具使用', 'TOOLS', '终端 · 浏览器 · API', 470, 310, 250, 92, 4),
  stage('verify', '06', '结果验证', 'VERIFY', '测试 · 复核 · 回滚', 70, 310, 250, 92, 5),
  stage('deliver', '07', '工作交付', 'DELIVERY', '产出 · 记录 · 交接', 70, 560, 1050, 112, 6),
];

export const STAGE_ORDER = AGENT_STAGES.map((item) => item.name).join(' / ');

export const COPY = {
  year: '2026',
  titleEn: 'THE AGE OF ACTION',
  titleZh: '行动时代',
  theme: '从生成答案，到执行任务。',
  manifesto: ['回答问题，只需要一次推理。', '执行任务，需要一整套系统。'],
  manifestoBody:
    '从需求理解到工作交付，七个环节被接进同一条工作链。模型不再只是被提问的对象，而是被委派任务的一方。',
  actTwoKicker: 'FROM CHAT TO ACTION',
  actTwoTitle: '从对话，到行动。',
  actTwoSub: '一次指令，被拆成七个可以执行的步骤。',
  prompt: '帮我完成一个复杂项目。',
  climaxMeta: ['CHAPTER 07', 'THE AGE OF ACTION'],
  climax: ['WE TAUGHT', 'MACHINES TO ANSWER.'],
  climaxTwo: ['NOW WE ASK', 'THEM TO ACT.'],
  climaxCn: ['我们曾教机器回答问题。', '如今，我们开始让它们执行任务。'],
  sourceLabel: '2026 · AGENT RELEASES',
} as const;
