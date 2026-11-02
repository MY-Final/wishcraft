#!/usr/bin/env node
/**
 * merge-data.mjs — 将 research/*.json 合并为 src/data/{models,events,organizations}.json
 *
 * 职责：
 *  1. 读取 research 下 5 份研究员数据（缺文件不失败，在报告中标出）；
 *  2. 可推导字段补全：displayDate ← date + datePrecision；successors ← predecessors 反推；
 *     datePrecision ← 日期长度；chapter ← 事件年份；organization 缺失时按 id 前推断/建占位机构；
 *  3. 按 id 去重合并：保留更早 announcementDate 的条目为基座，合并 sources/capabilities/tags，
 *     文案取更长（更完整）的一版；同一 id 不同日期记为 conflict；
 *  4. 拒绝 announcementDate/date 晚于研究截止日 2026-11-02 的条目；
 *  5. 缺 id/name/date/sources 的条目写入 research/quarantine.json（不删除原始文件）；
 *  6. 输出排序后的三个 JSON，并在 stdout 打印合并统计（供 DATA_REPORT 使用）。
 *
 * 设计原则：不编造事实。无法核实的字段用中性占位并在 quarantine.json 的
 * normalizations/report 中登记，交由人工补充；绝不删除真实记录。
 *
 * 用法：node scripts/merge-data.mjs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const RESEARCH_DIR = resolve(ROOT, 'research');
const DATA_DIR = resolve(ROOT, 'src', 'data');
const CUTOFF = '2026-11-02';
const GENERATED_AT = new Date().toISOString();

const RESEARCH_FILES = [
  'foundations.json',
  'models-2018-2024.json',
  'china-2018-2024.json',
  'frontier-2025-2026.json',
  'china-2025-2026.json',
];

const DATE_TYPES = new Set([
  'paper',
  'announcement',
  'product',
  'api',
  'weights',
  'conference',
  'policy',
]);
const MODEL_CATEGORIES = new Set([
  'language',
  'reasoning',
  'multimodal',
  'coding',
  'agent',
  'image',
  'video',
  'audio',
  'science',
  'other',
]);
const EVENT_CATEGORIES = new Set([
  'theory',
  'breakthrough',
  'system',
  'product',
  'organization',
  'science',
  'policy',
  'hardware',
]);
const SOURCE_KINDS = new Set(['official', 'paper', 'docs', 'weights', 'press', 'archive']);
const VERIFICATIONS = new Set(['verified', 'partially-verified', 'unverified']);

/** 机构 id 白名单（docs/DATA_SCHEMA.md 第 4 节） */
const ORG_WHITELIST = new Set([
  // 美国/其他
  'openai', 'anthropic', 'google-deepmind', 'meta', 'xai', 'mistral', 'cohere', 'nvidia',
  'amazon', 'microsoft', 'apple', 'ibm', 'allen-ai', 'stability-ai', 'midjourney',
  'black-forest-labs', 'runway', 'elevenlabs', 'hugging-face', 'stanford', 'mit', 'cmu',
  'dartmouth-college', 'princeton', 'toronto', 'montreal', 'deepmind', 'openai-foundation',
  'ai21', 'reka', 'character-ai', 'perplexity',
  // 中国
  'deepseek', 'alibaba-qwen', 'zhipu', 'moonshot', 'minimax', 'bytedance', 'baidu', 'iflytek',
  'tencent', 'shanghai-ai-lab', 'stepfun', 'baichuan', '01ai', 'sensetime', 'huawei', 'xiaomi',
  'meituan', 'ant-group',
  // 政策/其他
  'eu', 'united-nations', 'nist', 'uk-government', 'white-house', 'china-government', 'oecd',
]);

/** 研究员可能使用的机构 id 变体 → 白名单 id（保守映射，未列出的原样保留）。 */
const ORG_ALIASES = new Map(Object.entries({
  'open-ai': 'openai',
  'openai-inc': 'openai',
  'openai-corp': 'openai',
  'anthropic-ai': 'anthropic',
  'anthropic-pbc': 'anthropic',
  google: 'google-deepmind',
  'google-ai': 'google-deepmind',
  'google-brain': 'google-deepmind',
  'google-research': 'google-deepmind',
  'google-deepmind-ai': 'google-deepmind',
  'google-bard': 'google-deepmind',
  'facebook': 'meta',
  'facebook-ai': 'meta',
  'meta-ai': 'meta',
  'meta-research': 'meta',
  'x-ai': 'xai',
  'x.ai': 'xai',
  'mistral-ai': 'mistral',
  mistralai: 'mistral',
  stability: 'stability-ai',
  stabilityai: 'stability-ai',
  bfl: 'black-forest-labs',
  'blackforestlabs': 'black-forest-labs',
  'microsoft-research': 'microsoft',
  'microsoft-ai': 'microsoft',
  azure: 'microsoft',
  aws: 'amazon',
  'amazon-aws': 'amazon',
  'amazon-web-services': 'amazon',
  'ibm-research': 'ibm',
  'allen-institute-for-ai': 'allen-ai',
  allenai: 'allen-ai',
  'allen-institute': 'allen-ai',
  alibaba: 'alibaba-qwen',
  'alibaba-cloud': 'alibaba-qwen',
  'alibaba-tongyi': 'alibaba-qwen',
  qwen: 'alibaba-qwen',
  tongyi: 'alibaba-qwen',
  'zhipu-ai': 'zhipu',
  zhipuai: 'zhipu',
  'moonshot-ai': 'moonshot',
  kimi: 'moonshot',
  'minimax-ai': 'minimax',
  'bytedance-seed': 'bytedance',
  'byte-dance': 'bytedance',
  doubao: 'bytedance',
  'baidu-ai': 'baidu',
  ernie: 'baidu',
  'iflytek-ai': 'iflytek',
  'tencent-ai': 'tencent',
  hunyuan: 'tencent',
  'shanghai-ailab': 'shanghai-ai-lab',
  'shanghai-ai-laboratory': 'shanghai-ai-lab',
  step: 'stepfun',
  '01-ai': '01ai',
  'zero-one-ai': '01ai',
  'ant': 'ant-group',
  'ant-financial': 'ant-group',
  'european-union': 'eu',
  'european-commission': 'eu',
  un: 'united-nations',
  'uk-gov': 'uk-government',
  'us-government': 'white-house',
  'prc-government': 'china-government',
  'chinese-government': 'china-government',
}));

/** 占位机构的展示信息（仅名称/中文名/地区这类公开事实；founded/summary 不臆造）。 */
const ORG_DISPLAY = {
  openai: ['OpenAI', 'OpenAI', 'US'],
  anthropic: ['Anthropic', 'Anthropic', 'US'],
  'google-deepmind': ['Google DeepMind', '谷歌 DeepMind', 'US'],
  deepmind: ['DeepMind', 'DeepMind', 'UK'],
  meta: ['Meta', 'Meta', 'US'],
  xai: ['xAI', 'xAI', 'US'],
  mistral: ['Mistral AI', 'Mistral AI', 'FR'],
  cohere: ['Cohere', 'Cohere', 'CA'],
  nvidia: ['NVIDIA', 'NVIDIA', 'US'],
  amazon: ['Amazon', '亚马逊', 'US'],
  microsoft: ['Microsoft', '微软', 'US'],
  apple: ['Apple', '苹果', 'US'],
  ibm: ['IBM', 'IBM', 'US'],
  'allen-ai': ['Allen Institute for AI', 'Allen AI 研究所', 'US'],
  'stability-ai': ['Stability AI', 'Stability AI', 'UK'],
  midjourney: ['Midjourney', 'Midjourney', 'US'],
  'black-forest-labs': ['Black Forest Labs', 'Black Forest Labs', 'DE'],
  runway: ['Runway', 'Runway', 'US'],
  elevenlabs: ['ElevenLabs', 'ElevenLabs', 'US'],
  'hugging-face': ['Hugging Face', 'Hugging Face', 'US'],
  stanford: ['Stanford University', '斯坦福大学', 'US'],
  mit: ['MIT', '麻省理工学院', 'US'],
  cmu: ['Carnegie Mellon University', '卡内基梅隆大学', 'US'],
  'dartmouth-college': ['Dartmouth College', '达特茅斯学院', 'US'],
  princeton: ['Princeton University', '普林斯顿大学', 'US'],
  toronto: ['University of Toronto', '多伦多大学', 'CA'],
  montreal: ['Université de Montréal', '蒙特利尔大学', 'CA'],
  'openai-foundation': ['OpenAI Foundation', 'OpenAI 基金会', 'US'],
  ai21: ['AI21 Labs', 'AI21 Labs', 'IL'],
  reka: ['Reka AI', 'Reka AI', 'US'],
  'character-ai': ['Character.AI', 'Character.AI', 'US'],
  perplexity: ['Perplexity', 'Perplexity', 'US'],
  deepseek: ['DeepSeek', '深度求索', 'CN'],
  'alibaba-qwen': ['Alibaba Qwen', '阿里云通义千问', 'CN'],
  zhipu: ['Zhipu AI', '智谱', 'CN'],
  moonshot: ['Moonshot AI', '月之暗面', 'CN'],
  minimax: ['MiniMax', 'MiniMax（稀宇科技）', 'CN'],
  bytedance: ['ByteDance', '字节跳动', 'CN'],
  baidu: ['Baidu', '百度', 'CN'],
  iflytek: ['iFlytek', '科大讯飞', 'CN'],
  tencent: ['Tencent', '腾讯', 'CN'],
  'shanghai-ai-lab': ['Shanghai AI Laboratory', '上海人工智能实验室', 'CN'],
  stepfun: ['StepFun', '阶跃星辰', 'CN'],
  baichuan: ['Baichuan', '百川智能', 'CN'],
  '01ai': ['01.AI', '零一万物', 'CN'],
  sensetime: ['SenseTime', '商汤科技', 'CN'],
  huawei: ['Huawei', '华为', 'CN'],
  xiaomi: ['Xiaomi', '小米', 'CN'],
  meituan: ['Meituan', '美团', 'CN'],
  'ant-group': ['Ant Group', '蚂蚁集团', 'CN'],
  eu: ['European Union', '欧盟', 'EU'],
  'united-nations': ['United Nations', '联合国', 'INT'],
  nist: ['NIST', '美国国家标准与技术研究院', 'US'],
  'uk-government': ['UK Government', '英国政府', 'UK'],
  'white-house': ['The White House', '白宫', 'US'],
  'china-government': ['Government of China', '中国政府', 'CN'],
  oecd: ['OECD', '经合组织', 'INT'],
};

const FAMILY_PATTERNS = [
  [/deepseek-?r/i, 'DeepSeek-R'],
  [/deepseek/i, 'DeepSeek-V'],
  [/qwq/i, 'QwQ'],
  [/qwen/i, 'Qwen'],
  [/claude/i, 'Claude'],
  [/gemini/i, 'Gemini'],
  [/gemma/i, 'Gemma'],
  [/llama/i, 'Llama'],
  [/grok/i, 'Grok'],
  [/mixtral|mistral/i, 'Mistral'],
  [/chatglm|glm/i, 'GLM'],
  [/kimi/i, 'Kimi'],
  [/minimax/i, 'MiniMax-M'],
  [/doubao|seed-|skylark/i, 'Doubao'],
  [/ernie/i, 'ERNIE'],
  [/spark|xinghuo|星火/i, 'Spark'],
  [/hunyuan|混元/i, 'Hunyuan'],
  [/dall[·\-]?e/i, 'DALL·E'],
  [/sora/i, 'Sora'],
  [/stable-?diffusion/i, 'Stable Diffusion'],
  [/\bveo\b/i, 'Veo'],
  [/imagen/i, 'Imagen'],
  [/whisper/i, 'Whisper'],
  [/internlm|internvl|intern-s/i, 'InternLM'],
  [/step-/i, 'Step'],
  [/yi-/i, 'Yi'],
  [/^o\d/i, 'o-series'],
  [/gpt/i, 'GPT'],
  [/phi-/i, 'Phi'],
  [/nova/i, 'Nova'],
  [/nemotron/i, 'Nemotron'],
];

/**
 * 机构档案兜底：research 未提供时，用公开事实补齐组织页基础字段（不臆造）。
 * research/*.json 里已有的字段永远优先，这里只填空缺。
 */
const ORG_PROFILES = {
  openai: { founded: '2015', focus: ['前沿 LLM', '多模态', 'Agent'], summary: 'OpenAI 成立于 2015 年，总部位于美国旧金山，开发 GPT、o 系列与 DALL·E 等模型。' },
  anthropic: { founded: '2021', focus: ['前沿 LLM', 'AI 安全', 'Agent'], summary: 'Anthropic 成立于 2021 年，总部位于美国旧金山，开发 Claude 系列模型，强调可解释性与安全研究。' },
  'google-deepmind': { founded: '2023', focus: ['前沿 LLM', '多模态', '科学计算'], summary: 'Google DeepMind 由 Google Brain 与 DeepMind 于 2023 年合并而成，开发 Gemini、Gemma 与 AlphaFold 等成果。' },
  deepmind: { founded: '2010', focus: ['强化学习', '科学计算', '深度学习'], summary: 'DeepMind 成立于 2010 年，2014 年被 Google 收购，2023 年与 Google Brain 合并为 Google DeepMind。' },
  meta: { founded: '2004', focus: ['开源权重', '前沿 LLM'], summary: 'Meta 是美国科技公司，其 AI 研究部门开发 Llama 系列开源权重模型。' },
  xai: { founded: '2023', focus: ['前沿 LLM', '推理'], summary: 'xAI 成立于 2023 年，开发 Grok 系列模型。' },
  mistral: { founded: '2023', focus: ['开源权重', '高效推理'], summary: 'Mistral AI 成立于 2023 年，总部位于法国巴黎，发布 Mistral、Mixtral 与 Large 系列模型。' },
  cohere: { founded: '2019', focus: ['企业 LLM', '检索增强'], summary: 'Cohere 成立于 2019 年，主营企业级语言模型与检索增强工具。' },
  nvidia: { founded: '1993', focus: ['GPU', 'AI 基础设施', '模型'], summary: 'NVIDIA 是美国半导体与 AI 计算公司，同时发布 Nemotron 等模型与推理硬件。' },
  amazon: { founded: '1994', focus: ['云服务', '模型'], summary: 'Amazon 通过 AWS 提供 AI 基础设施，并发布 Nova 等自研模型。' },
  microsoft: { founded: '1975', focus: ['云服务', '模型', 'Agent'], summary: 'Microsoft 通过 Azure 与 Microsoft Research 提供 AI 基础设施并发布 Phi 等模型。' },
  apple: { founded: '1976', focus: ['端侧模型', '多模态'], summary: 'Apple 开发端侧与云端基础模型，用于其操作系统与开发者工具。' },
  ibm: { founded: '1911', focus: ['企业 AI', '系统'], summary: 'IBM 是老牌计算机与 AI 公司，曾开发 Deep Blue、Watson 等系统。' },
  'allen-ai': { founded: '2014', focus: ['开放研究', '语言模型'], summary: 'Allen Institute for AI（AI2）成立于 2014 年，从事开放 AI 研究与开源模型。' },
  'stability-ai': { founded: '2019', focus: ['图像生成', '开源权重'], summary: 'Stability AI 成立于 2019 年，发布 Stable Diffusion 系列开源图像生成模型。' },
  midjourney: { founded: '2022', focus: ['图像生成'], summary: 'Midjourney 成立于 2022 年，提供以图像生成为主的生成式产品。' },
  'black-forest-labs': { founded: '2024', focus: ['图像生成'], summary: 'Black Forest Labs 成立于 2024 年，由 Stable Diffusion 原团队创建，开发 FLUX 系列图像模型。' },
  runway: { founded: '2018', focus: ['视频生成'], summary: 'Runway 是美国生成式视频公司，开发 Gen 系列视频模型。' },
  elevenlabs: { founded: '2022', focus: ['语音合成'], summary: 'ElevenLabs 成立于 2022 年，主营语音合成与语音克隆。' },
  'hugging-face': { founded: '2016', focus: ['开源生态', '模型托管'], summary: 'Hugging Face 成立于 2016 年，是开源模型与数据集的托管平台。' },
  stanford: { founded: '1885', focus: ['学术研究', 'NLP'], summary: '斯坦福大学是美国研究型大学，在 NLP、视觉与 AI 伦理方向有长期研究积累。' },
  mit: { founded: '1861', focus: ['学术研究', 'AI 基础'], summary: '麻省理工学院是美国研究型大学，AI 相关研究分布于 CSAIL 等机构。' },
  cmu: { founded: '1900', focus: ['学术研究', 'AI 基础'], summary: '卡内基梅隆大学是美国研究型大学，拥有历史悠久的 AI 与机器人研究。' },
  'dartmouth-college': { founded: '1769', focus: ['学术研究', 'AI 起源'], summary: '达特茅斯学院是美国文理学院，1956 年达特茅斯会议在此提出「人工智能」名称。' },
  princeton: { founded: '1746', focus: ['学术研究', 'AI 理论'], summary: '普林斯顿大学是美国研究型大学，在机器学习理论与 AI 基础研究方面有长期积累。' },
  toronto: { founded: '1827', focus: ['学术研究', '深度学习'], summary: '多伦多大学是加拿大研究型大学，深度学习复兴的重要研究基地之一。' },
  montreal: { founded: '1878', focus: ['学术研究', '深度学习'], summary: '蒙特利尔大学是加拿大研究型大学，MILA 研究所所在地，深度学习研究重镇。' },
  'openai-foundation': { founded: '', focus: ['AI 治理', '公益'], summary: 'OpenAI Foundation 是 OpenAI 重组后设立的非营利基金会，负责公益与治理相关事务。' },
  ai21: { founded: '2017', focus: ['语言模型'], summary: 'AI21 Labs 成立于 2017 年，总部位于以色列，开发 Jurassic 与 Jamba 系列模型。' },
  reka: { founded: '2022', focus: ['多模态'], summary: 'Reka AI 成立于 2022 年，开发多模态 Reka 系列模型。' },
  'character-ai': { founded: '2021', focus: ['对话', '角色'], summary: 'Character.AI 成立于 2021 年，提供角色对话产品并开发自有语言模型。' },
  perplexity: { founded: '2022', focus: ['搜索', '检索增强'], summary: 'Perplexity 成立于 2022 年，提供基于检索增强的 AI 搜索产品。' },
  deepseek: { founded: '2023', focus: ['前沿 LLM', 'MoE', '开源权重'], summary: 'DeepSeek（深度求索）成立于 2023 年，总部位于中国杭州，以 MoE 架构与开源权重模型著称。' },
  'alibaba-qwen': { founded: '2023', focus: ['开源权重', '多模态', 'Agent'], summary: '阿里巴巴通义千问（Qwen）团队自 2023 年起发布 Qwen 系列模型，覆盖语言、代码、视觉与音频。' },
  zhipu: { founded: '2019', focus: ['LLM', 'Agent'], summary: '智谱（Zhipu AI）成立于 2019 年，源自清华大学技术团队，开发 GLM 系列模型。' },
  moonshot: { founded: '2023', focus: ['长上下文', 'LLM'], summary: '月之暗面（Moonshot AI）成立于 2023 年，开发 Kimi 系列模型与产品。' },
  minimax: { founded: '2021', focus: ['LLM', '多模态'], summary: 'MiniMax（稀宇科技）成立于 2021 年，开发 MiniMax-M 系列模型与多模态产品。' },
  bytedance: { founded: '2012', focus: ['LLM', '多模态', '应用'], summary: '字节跳动是中国科技公司，旗下 Seed 团队开发豆包（Doubao）系列模型。' },
  baidu: { founded: '2000', focus: ['LLM', '搜索'], summary: '百度是中国科技公司，开发文心（ERNIE）系列模型与搜索产品。' },
  iflytek: { founded: '1999', focus: ['语音', 'LLM'], summary: '科大讯飞是中国语音与 AI 公司，开发星火（Spark）系列模型。' },
  tencent: { founded: '1998', focus: ['LLM', '多模态'], summary: '腾讯是中国科技公司，开发混元（Hunyuan）系列模型。' },
  'shanghai-ai-lab': { founded: '2020', focus: ['开源研究', '多模态'], summary: '上海人工智能实验室成立于 2020 年，是从事 AI 研究的机构，发布 InternLM 等开源成果。' },
  stepfun: { founded: '2023', focus: ['多模态', 'LLM'], summary: '阶跃星辰（StepFun）成立于 2023 年，开发 Step 系列多模态模型。' },
  baichuan: { founded: '2023', focus: ['LLM', '医疗'], summary: '百川智能成立于 2023 年，开发 Baichuan 系列模型并聚焦医疗等垂直方向。' },
  '01ai': { founded: '2023', focus: ['LLM'], summary: '零一万物（01.AI）成立于 2023 年，开发 Yi 系列模型。' },
  sensetime: { founded: '2014', focus: ['视觉', '多模态'], summary: '商汤科技成立于 2014 年，是中国计算机视觉与多模态 AI 公司。' },
  huawei: { founded: '1987', focus: ['AI 基础设施', '模型'], summary: '华为是中国科技公司，提供昇腾 AI 算力并开发盘古等大模型。' },
  xiaomi: { founded: '2010', focus: ['端侧模型', '多模态'], summary: '小米是中国消费电子公司，开发 MiMo 等自研大模型。' },
  meituan: { founded: '2010', focus: ['LLM', '本地生活'], summary: '美团是中国本地生活平台，其研究团队开发 LongCat 等模型。' },
  'ant-group': { founded: '2014', focus: ['LLM', '金融科技'], summary: '蚂蚁集团是中国金融科技公司，百灵团队发布 Ling 系列模型。' },
  eu: { founded: '1993', focus: ['AI 监管', '政策'], summary: '欧盟是欧洲政治经济联盟，其 AI Act 是全球首部综合性 AI 监管法规。' },
  'united-nations': { founded: '1945', focus: ['AI 治理', '政策'], summary: '联合国是国际组织，其框架下设有 AI 治理相关机制与咨询机构。' },
  nist: { founded: '1901', focus: ['AI 标准', '评测'], summary: 'NIST 是美国国家标准与技术研究院，发布 AI 风险管理框架等标准文件。' },
  'uk-government': { founded: '', focus: ['AI 监管', '政策'], summary: '英国政府发布 AI 安全与监管相关政策，并主办 AI Safety Summit 等会议。' },
  'white-house': { founded: '', focus: ['AI 政策', '行政令'], summary: '美国白宫通过行政令与政策文件影响美国 AI 研发、安全与出口管制。' },
  'china-government': { founded: '', focus: ['AI 监管', '政策'], summary: '中国政府通过网信办、工信部等部门发布生成式 AI 服务管理与算法备案等政策。' },
  oecd: { founded: '1961', focus: ['AI 政策', '治理'], summary: 'OECD 是经济合作与发展组织，发布 AI 原则等国际治理建议。' },
};

/** 用户点名要求逐一核验的名称（在统计/报告中输出是否真实存在）。 */
const WATCHLIST = [  ['GPT-6', /gpt-?6(?!\.\d)/i],
  ['GPT-6 Astra', /gpt-?6(?:\.\d)?[\s-]*astra/i],
  ['GPT-6.1 Terra', /gpt-?6\.1[\s-]*terra/i],
  ['GPT-6.1 Sol', /gpt-?6\.1[\s-]*sol/i],
  ['GPT-6.1', /gpt-?6\.1/i],
  ['Claude Opus 5', /claude[\s-]*(?:opus[\s-]*)?5(?:\.0)?(?![\d.])/i],
  ['Claude Opus 5.5', /claude[\s-]*opus[\s-]*5\.5/i],
  ['DeepSeek-V4', /deepseek[\s-]*v4(?![\d.])/i],
  ['DeepSeek-V4.1 Flash', /deepseek[\s-]*v4\.1[\s-]*flash/i],
  ['DeepSeek-V4.1', /deepseek[\s-]*v4\.1/i],
];

/**
 * 死链替换：scripts/check-links.mjs 确认 404 的 URL，替换为可访问的官方页面（2026-11-02 核验）。
 * 只在整合层替换，不改研究员的 research/*.json 原始文件。
 * key = 原 URL，value = { url, label?, reason }
 */
const SOURCE_URL_REPLACEMENTS = new Map([
  [
    'https://openai.com/index/sam-altman-returns-as-ceo/',
    {
      url: 'https://openai.com/index/sam-altman-returns-as-ceo-openai-has-a-new-initial-board/',
      label: 'OpenAI — Sam Altman returns as CEO, OpenAI has a new initial board',
      reason: '原 URL 404，替换为 OpenAI 官方同主题公告页',
    },
  ],
  [
    'https://www.aboutamazon.com/news/aws/amazon-aws-anthropic-ai',
    {
      url: 'https://press.aboutamazon.com/2023/9/amazon-and-anthropic-announce-strategic-collaboration-to-advance-generative-ai',
      label: 'Amazon — Amazon and Anthropic Announce Strategic Collaboration to Advance Generative AI',
      reason: '原 URL 404，替换为 Amazon 官方新闻稿（press.aboutamazon.com，HTTP 200）',
    },
  ],
  [
    'https://www.whitehouse.gov/briefing-room/presidential-actions/2023/10/30/executive-order-on-the-safe-secure-and-trustworthy-development-and-use-of-artificial-intelligence/',
    {
      url: 'https://www.federalregister.gov/documents/2023/11/01/2023-24283/safe-secure-and-trustworthy-development-and-use-of-artificial-intelligence',
      label: 'Federal Register — Executive Order 14110: Safe, Secure, and Trustworthy Development and Use of AI',
      reason: '原 whitehouse.gov 页面 404，替换为美国联邦公报官方文本（HTTP 200）',
    },
  ],
  [
    'https://www.whitehouse.gov/ostp/ai-bill-of-rights/',
    {
      url: 'https://bidenwhitehouse.archives.gov/ostp/ai-bill-of-rights/',
      label: 'The White House (archive) — Blueprint for an AI Bill of Rights',
      reason: '原 whitehouse.gov 页面 404，替换为白宫官方存档页（HTTP 200）',
    },
  ],
]);

/**
 * 事件 id 修正：研究员笔误的 id 前缀在整合层改正（保留原始 research 文件不动）。
 * 格式：原 id → { id, reason }
 */
const EVENT_ID_OVERRIDES = new Map([
  [
    'anthropic-model-spec-2026-10-29',
    {
      id: 'openai-model-spec-2026-10-29',
      reason: '该事件的 organizations / title / 来源均为 OpenAI（model-spec.openai.com），原 id 前缀误写为 anthropic',
    },
  ],
]);

/**
 * 跨文件继承关系补全：研究员按分工不跨文件互连，notes 里明确要求整合员接线的关系登记在此。
 * 只登记研究员明确指出的关系，不凭名称相似臆造。
 * 格式：[模型 id, 要补上的 predecessors id 数组, 依据说明]
 */
const PREDECESSOR_OVERRIDES = [
  // research/china-2025-2026-notes.md §7.2：「deepseek-v3-0324 的 predecessors 留空，
  // 因为 2024-12-26 的 DeepSeek-V3 由 models-2018-2024 研究员负责，整合时请手工接上」。
  ['deepseek-v3-0324', ['deepseek-v3'], 'research/china-2025-2026-notes.md §7.2'],
];

// ---------------------------------------------------------------------------
// 基础工具
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values) {
  const out = [];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (!out.includes(trimmed)) out.push(trimmed);
  }
  return out;
}

function padKey(date) {
  if (!date) return '9999-99-99';
  if (date.length === 4) return `${date}-01-01`;
  if (date.length === 7) return `${date}-01`;
  return date;
}

function isValidDay(year, month, day) {
  const dt = new Date(Date.UTC(year, month - 1, day));
  return dt.getUTCFullYear() === year && dt.getUTCMonth() === month - 1 && dt.getUTCDate() === day;
}

/**
 * 把各种常见写法归一化为 `YYYY` / `YYYY-MM` / `YYYY-MM-DD`。
 * 解析失败返回 null（由调用方决定隔离）。
 */
function normalizeDate(raw) {
  if (raw == null) return null;
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  let value = String(raw).trim();
  if (!value) return null;
  const original = value;

  // 去掉 ISO 时间部分与常见中文/斜杠/点写法
  value = value.replace(/[Tt]\s*\d{1,2}:\d{2}.*$/, '');
  value = value.replace(/[年月]/g, '-').replace(/日/g, '').replace(/[./、]/g, '-');
  value = value.replace(/-+/g, '-').replace(/^-/, '').replace(/-$/, '').trim();

  let match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31 || !isValidDay(year, month, day)) return null;
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { date, precision: 'day', changed: date !== original.trim(), original };
  }

  match = value.match(/^(\d{4})-(\d{1,2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month < 1 || month > 12) return null;
    const date = `${year}-${String(month).padStart(2, '0')}`;
    return { date, precision: 'month', changed: date !== original.trim(), original };
  }

  match = value.match(/^(\d{4})$/);
  if (match) {
    const date = match[1];
    return { date, precision: 'year', changed: date !== original.trim(), original };
  }

  return null;
}

function displayOf(date) {
  return date.replaceAll('-', '.');
}

function chapterForYear(year) {
  if (year <= 1979) return 1;
  if (year <= 2011) return 2;
  if (year <= 2017) return 3;
  if (year <= 2022) return 4;
  if (year <= 2024) return 5;
  if (year <= 2025) return 6;
  return 7;
}

const CHAPTER_RANGES = [
  [0, 1950, 1955], // 序章（1950 图灵之问）
  [1, 1950, 1979],
  [2, 1980, 2011],
  [3, 2012, 2017],
  [4, 2018, 2022],
  [5, 2023, 2024],
  [6, 2025, 2025],
  [7, 2026, 2026],
  [8, 2026, 2026],
];

function chapterFitsRange(chapter, year) {
  const range = CHAPTER_RANGES.find(([index]) => index === chapter);
  if (!range) return false;
  return year >= range[1] && year <= range[2];
}

function guessSourceKind(url) {
  const value = url.toLowerCase();
  if (/arxiv\.org|doi\.org|openreview\.net|aclanthology\.org|nature\.com|science\.org|jmlr\.org|ieee\.org|dl\.acm\.org|papers\.|proceedings\.|biorxiv|medrxiv|semanticscholar/.test(value)) {
    return 'paper';
  }
  if (/huggingface\.co/.test(value)) return 'weights';
  if (/github\.com|github\.io/.test(value)) return 'official';
  if (/techcrunch|theverge|reuters|bloomberg|nytimes|wired|venturebeat|36kr|jiqizhixin|infoq|apnews|ft\.com|wsj\.com|caixin/.test(value)) {
    return 'press';
  }
  return 'official';
}

function normalizeSources(raw, { record } = {}) {
  const list = [];
  for (const item of asArray(raw)) {
    let url = '';
    let label = '';
    let kind = '';
    if (typeof item === 'string') {
      url = item.trim();
      label = item.trim();
    } else if (item && typeof item === 'object') {
      url = cleanString(item.url);
      label = cleanString(item.label);
      kind = cleanString(item.kind);
    }
    if (!/^https?:\/\//i.test(url)) continue;
    const replacement = SOURCE_URL_REPLACEMENTS.get(url);
    if (replacement) {
      if (record) {
        record.sourceReplaced += 1;
        record.sourceReplacements.push({ from: url, to: replacement.url, reason: replacement.reason });
      }
      url = replacement.url;
      if (replacement.label) label = replacement.label;
    }
    if (!label) label = url;
    if (!SOURCE_KINDS.has(kind)) {
      const guessed = guessSourceKind(url);
      if (record) record.sourceKindGuessed = (record.sourceKindGuessed || 0) + 1;
      kind = guessed;
    }
    const normalizedLabel = label.length > 160 ? `${label.slice(0, 157)}...` : label;
    const existing = list.find((source) => source.url === url);
    if (existing) {
      if (normalizedLabel.length > existing.label.length) existing.label = normalizedLabel;
      if (existing.kind !== 'official' && kind === 'official') existing.kind = kind;
      continue;
    }
    list.push({ label: normalizedLabel, url, kind });
  }
  return list;
}

function mergeSources(primary, secondary) {
  const merged = primary.map((source) => ({ ...source }));
  for (const source of secondary) {
    const existing = merged.find((item) => item.url === source.url);
    if (!existing) {
      merged.push({ ...source });
      continue;
    }
    if (source.label.length > existing.label.length) existing.label = source.label;
    if (existing.kind !== 'official' && source.kind === 'official') existing.kind = source.kind;
  }
  return merged;
}

function richerText(a, b) {
  const left = cleanString(a);
  const right = cleanString(b);
  if (!left) return right;
  if (!right) return left;
  return right.length > left.length ? right : left;
}

function sleepSync() {
  // 同步阻塞仅在 JSON 重试时使用少量次数，避免引入异步主流程复杂度。
  const until = Date.now() + 800;
  while (Date.now() < until) {
    // busy wait，最多 0.8s
  }
}

function loadResearchFiles() {
  const files = [];
  for (const name of RESEARCH_FILES) {
    const path = resolve(RESEARCH_DIR, name);
    const record = {
      file: name,
      exists: existsSync(path),
      parsed: false,
      models: 0,
      events: 0,
      organizations: 0,
      meta: null,
      error: null,
    };
    if (!record.exists) {
      files.push(record);
      continue;
    }
    let lastError = null;
    let data = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        data = JSON.parse(readFileSync(path, 'utf8'));
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < 3) sleepSync();
      }
    }
    if (lastError || data == null) {
      record.error = lastError ? lastError.message : '空文件';
      files.push(record);
      continue;
    }
    if (Array.isArray(data)) {
      // 兼容误把顶层写成数组的情况：无法判断条目类型，跳过并记录。
      record.error = '顶层是数组而非 {models,events,organizations,meta} 对象，已跳过';
      files.push(record);
      continue;
    }
    record.parsed = true;
    record.meta = data.meta ?? null;
    record.models = asArray(data.models).length;
    record.events = asArray(data.events).length;
    record.organizations = asArray(data.organizations).length;
    record.data = data;
    files.push(record);
  }
  return files;
}

function canonicalOrgId(raw) {
  const id = cleanString(raw).toLowerCase();
  if (!id) return '';
  const alias = ORG_ALIASES.get(id);
  return alias ?? id;
}

function displayNameForOrgId(id) {
  const known = ORG_DISPLAY[id];
  if (known) return { name: known[0], nameZh: known[1], country: known[2] };
  const fallback = id
    .split('-')
    .filter(Boolean)
    .map((part) => (/^[a-z]/.test(part) ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
  return { name: fallback || id, nameZh: fallback || id, country: '' };
}

function inferOrgIdFromModelId(modelId) {
  const id = cleanString(modelId).toLowerCase();
  if (!id) return '';
  const candidates = [];
  for (const orgId of ORG_WHITELIST) candidates.push(orgId);
  candidates.push('deepseek', 'qwen', 'kimi', 'glm', 'minimax', 'doubao');
  candidates.sort((a, b) => b.length - a.length);
  for (const orgId of candidates) {
    const normalizedOrg = orgId.replace(/-/g, '');
    const normalizedId = id.replace(/-/g, '');
    if (normalizedId.startsWith(normalizedOrg)) {
      return canonicalOrgId(orgId === 'qwen' ? 'alibaba-qwen' : orgId === 'kimi' ? 'moonshot' : orgId === 'glm' ? 'zhipu' : orgId === 'doubao' ? 'bytedance' : orgId);
    }
  }
  return '';
}

function inferFamily(name, id) {
  const haystack = `${name} ${id}`;
  for (const [pattern, family] of FAMILY_PATTERNS) {
    if (pattern.test(haystack)) return family;
  }
  return '未标注';
}

function normalizeVerification(raw, sources) {
  const value = cleanString(raw);
  if (VERIFICATIONS.has(value) && value !== 'unverified') return value;
  // 推断：有官方/论文/文档/权重来源时仍保守给 partially-verified，等待人工确认日期可读性。
  return 'partially-verified';
}

/**
 * 规范要求 verified 至少要有 1 个一手来源（官方公告/文档/论文/权重）。
 * 只有二手来源却标 verified 的条目由整合脚本降级为 partially-verified（修数据，不修校验器）。
 */
function enforceVerifiedNeedsPrimary(modelOrEvent, record) {
  if (modelOrEvent.verificationStatus !== 'verified') return;
  const hasPrimary = modelOrEvent.sources.some(
    (source) => source.kind === 'official' || source.kind === 'paper' || source.kind === 'docs' || source.kind === 'weights',
  );
  if (hasPrimary) return;
  modelOrEvent.verificationStatus = 'partially-verified';
  if (record) record.partialDowngraded = (record.partialDowngraded || 0) + 1;
}

// ---------------------------------------------------------------------------
// 读取
// ---------------------------------------------------------------------------

mkdirSync(DATA_DIR, { recursive: true });

const researchFiles = loadResearchFiles();
const loadedData = researchFiles.filter((file) => file.parsed);

const ctx = {
  rejected: [],
  conflicts: [],
  danglingReferences: [],
  normalizations: {
    displayDateFixed: 0,
    datePrecisionFixed: 0,
    chapterFixed: 0,
    availabilityDateDropped: 0,
    nameMismatch: 0,
    textPlaceholders: 0,
    orgInferred: 0,
    orgPlaceholder: 0,
    sourceKindGuessed: 0,
    nonWhitelistOrg: 0,
    missingOptionalField: 0,
    orgProfileFilled: 0,
    partialDowngraded: 0,
    sourceReplaced: 0,
    sourceReplacements: [],
    eventIdFixed: 0,
  },
  notes: [],
};

const orgMap = new Map();

function ensureOrganization(rawId, { model, event, reasons } = {}) {
  let id = canonicalOrgId(rawId);
  if (!id) return '';
  if (!ORG_WHITELIST.has(id)) ctx.normalizations.nonWhitelistOrg += 1;
  const existing = orgMap.get(id);
  if (existing) {
    if (existing.__placeholder) {
      // 占位机构在后续获得更多上下文时补充来源/地区
      const source = model?.sources?.[0] ?? event?.sources?.[0];
      if (source && !existing.sources.some((item) => item.url === source.url)) {
        existing.sources.push({
          label: `${existing.name} — 相关条目来源（整合脚本补充）`,
          url: source.url,
          kind: source.kind,
        });
      }
      if (!existing.countryOrRegion) {
        existing.countryOrRegion = model?.countryOrRegion || '';
      }
    }
    return id;
  }
  const display = displayNameForOrgId(id);
  const source = model?.sources?.[0] ?? event?.sources?.[0];
  const record = {
    id,
    name: display.name,
    nameZh: display.nameZh,
    countryOrRegion: model?.countryOrRegion || display.country || '',
    founded: '',
    focus: [],
    summary: '',
    sources: source
      ? [{ label: `${display.name} — 相关条目来源（整合脚本补充）`, url: source.url, kind: source.kind }]
      : [],
    __placeholder: true,
    __refs: 1,
  };
  orgMap.set(id, record);
  ctx.normalizations.orgPlaceholder += 1;
  if (reasons) reasons.push(`机构「${id}」不在 research 的 organizations 中，已生成占位记录`);
  return id;
}

// ---- 先注册研究员提供的机构定义 ----
for (const file of loadedData) {
  for (const rawOrg of asArray(file.data.organizations)) {
    if (!rawOrg || typeof rawOrg !== 'object') continue;
    const id = canonicalOrgId(rawOrg.id);
    if (!id) {
      ctx.rejected.push({
        kind: 'organization',
        file: file.file,
        reasons: ['缺少 id'],
        entry: rawOrg,
      });
      continue;
    }
    const sources = normalizeSources(rawOrg.sources, { record: ctx.normalizations });
    const name = cleanString(rawOrg.name) || displayNameForOrgId(id).name;
    const nameZh = cleanString(rawOrg.nameZh) || name;
    const country = cleanString(rawOrg.countryOrRegion) || displayNameForOrgId(id).country || '';
    const founded = cleanString(rawOrg.founded);
    const focus = uniqueStrings(asArray(rawOrg.focus));
    const summary = cleanString(rawOrg.summary);
    const existing = orgMap.get(id);
    if (existing) {
      existing.name = existing.name || name;
      existing.nameZh = existing.nameZh || nameZh;
      existing.countryOrRegion = existing.countryOrRegion || country;
      existing.founded = existing.founded || founded;
      existing.focus = uniqueStrings([...existing.focus, ...focus]);
      existing.summary = richerText(existing.summary, summary);
      existing.sources = mergeSources(existing.sources, sources);
      if (existing.__placeholder) {
        delete existing.__placeholder;
        ctx.normalizations.orgPlaceholder = Math.max(0, ctx.normalizations.orgPlaceholder - 1);
      }
    } else {
      orgMap.set(id, {
        id,
        name,
        nameZh,
        countryOrRegion: country,
        founded,
        focus,
        summary,
        sources,
      });
    }
  }
}

// ---- 归一化模型 ----
function normalizeModel(raw, file) {
  const reasons = [];
  const id = cleanString(raw.id).toLowerCase();
  const name = cleanString(raw.name);
  if (!id) reasons.push('缺少 id');
  if (!name) reasons.push('缺少 name');

  const dateInfo = normalizeDate(raw.announcementDate ?? raw.date);
  if (!dateInfo) reasons.push('缺少或无法解析 announcementDate');

  const sources = normalizeSources(raw.sources, { record: ctx.normalizations });
  if (!sources.length) reasons.push('缺少可用的 sources（至少 1 条 http(s) 来源）');

  if (dateInfo && dateInfo.date > CUTOFF) {
    reasons.push(`announcementDate ${dateInfo.date} 晚于研究截止日 ${CUTOFF}`);
  }

  if (cleanString(raw.verificationStatus) === 'unverified') {
    reasons.push('verificationStatus=unverified（规范要求 unverified 条目不入库，仅留待查）');
  }

  if (reasons.length) {
    ctx.rejected.push({ kind: 'model', file: file.file, id: id || null, name: name || null, reasons, entry: raw });
    return null;
  }

  const date = dateInfo.date;
  if (dateInfo.precision !== cleanString(raw.datePrecision)) {
    ctx.normalizations.datePrecisionFixed += 1;
  }
  if (cleanString(raw.displayDate) !== displayOf(date)) {
    ctx.normalizations.displayDateFixed += 1;
  }

  // availabilityDate 只保留合法日期，精度允许与主日期不同
  let availabilityDate = null;
  if (raw.availabilityDate != null && raw.availabilityDate !== '') {
    const availability = normalizeDate(raw.availabilityDate);
    if (availability) availabilityDate = availability.date;
    else ctx.normalizations.availabilityDateDropped += 1;
  }

  const rawOrgId = canonicalOrgId(raw.organization);
  const orgId = rawOrgId || inferOrgIdFromModelId(id);
  if (!rawOrgId && orgId) ctx.normalizations.orgInferred += 1;
  if (!orgId) {
    ctx.rejected.push({
      kind: 'model',
      file: file.file,
      id,
      name,
      reasons: ['缺少 organization 且无法从 id 推断机构'],
      entry: raw,
    });
    return null;
  }
  ensureOrganization(orgId, { model: { sources, countryOrRegion: cleanString(raw.countryOrRegion) } });
  const org = orgMap.get(orgId);

  const countryOrRegion = cleanString(raw.countryOrRegion) || org?.countryOrRegion || '未知';
  if (!cleanString(raw.countryOrRegion)) {
    ctx.normalizations.missingOptionalField += 1;
    ctx.notes.push(`model:${id}: 缺少 countryOrRegion，已从机构「${orgId}」推导为「${countryOrRegion}」`);
  }

  const family = cleanString(raw.family) || inferFamily(name, id);
  if (!cleanString(raw.family)) {
    ctx.notes.push(`model:${id}: 缺少 family，按名称推断为「${family}」`);
    ctx.normalizations.missingOptionalField += 1;
  }
  let generation = cleanString(raw.generation);
  if (!generation) {
    generation = '未标注';
    ctx.notes.push(`model:${id}: 缺少 generation，已填「未标注」`);
    ctx.normalizations.missingOptionalField += 1;
  }

  const dateType = DATE_TYPES.has(cleanString(raw.dateType)) ? cleanString(raw.dateType) : 'announcement';
  const category = MODEL_CATEGORIES.has(cleanString(raw.category)) ? cleanString(raw.category) : 'language';
  if (dateType !== cleanString(raw.dateType) || category !== cleanString(raw.category)) {
    ctx.notes.push(`model:${id}: dateType/category 缺失或非法，已分别回退为「${dateType}」「${category}」`);
  }

  const summary = cleanString(raw.summary);
  const keyAdvancement = cleanString(raw.keyAdvancement);
  const significance = cleanString(raw.significance);
  let textPlaceholder = false;
  const finalSummary = summary || `${name} 由${org?.nameZh || org?.name || orgId}于 ${displayOf(date)} 发布。`;
  const finalKeyAdvancement = keyAdvancement || '相对前代的具体技术变化尚待从一手来源确认。';
  const finalSignificance = significance || '该发布的长期影响尚待进一步核实。';
  if (!summary || !keyAdvancement || !significance) {
    textPlaceholder = true;
    ctx.normalizations.textPlaceholders += 1;
    ctx.notes.push(`model:${id}: 缺少 summary/keyAdvancement/significance 中的一项或多项，已生成中性占位文案（未编造事实）`);
  }

  const verificationStatus = normalizeVerification(raw.verificationStatus, sources);

  const model = {
    id,
    name,
    organization: orgId,
    countryOrRegion,
    family,
    generation,
    announcementDate: date,
    availabilityDate,
    displayDate: displayOf(date),
    datePrecision: dateInfo.precision,
    dateType,
    category,
    tags: uniqueStrings(asArray(raw.tags)),
    openWeights: typeof raw.openWeights === 'boolean' ? raw.openWeights : null,
    architecture: cleanString(raw.architecture) || '未公开（闭源）',
    parameters: cleanString(raw.parameters) || null,
    contextWindow: cleanString(raw.contextWindow) || null,
    capabilities: uniqueStrings(asArray(raw.capabilities)),
    summary: finalSummary,
    keyAdvancement: finalKeyAdvancement,
    significance: finalSignificance,
    predecessors: uniqueStrings(asArray(raw.predecessors)),
    successors: uniqueStrings(asArray(raw.successors)),
    sources,
    verificationStatus,
    notes: cleanString(raw.notes) || null,
  };

  return {
    model,
    meta: {
      file: file.file,
      textPlaceholder,
      sourceKindGuessed: ctx.normalizations.sourceKindGuessed,
      originalPrecision: cleanString(raw.datePrecision),
      originalDisplay: cleanString(raw.displayDate),
    },
  };
}

// ---- 归一化事件 ----
function normalizeEvent(raw, file) {
  const reasons = [];
  let id = cleanString(raw.id).toLowerCase();
  const idOverride = EVENT_ID_OVERRIDES.get(id);
  if (idOverride) {
    ctx.notes.push(`event:${id}: event id 修正为「${idOverride.id}」（${idOverride.reason}）`);
    ctx.normalizations.eventIdFixed += 1;
    id = idOverride.id;
  }
  const title = cleanString(raw.title);
  if (!id) reasons.push('缺少 id');
  if (!title) reasons.push('缺少 title');

  const dateInfo = normalizeDate(raw.date);
  if (!dateInfo) reasons.push('缺少或无法解析 date');

  const sources = normalizeSources(raw.sources, { record: ctx.normalizations });
  if (!sources.length) reasons.push('缺少可用的 sources（至少 1 条 http(s) 来源）');

  if (dateInfo && dateInfo.date > CUTOFF) {
    reasons.push(`date ${dateInfo.date} 晚于研究截止日 ${CUTOFF}`);
  }

  if (cleanString(raw.verificationStatus) === 'unverified') {
    reasons.push('verificationStatus=unverified（规范要求 unverified 条目不入库，仅留待查）');
  }

  if (reasons.length) {
    ctx.rejected.push({ kind: 'event', file: file.file, id: id || null, title: title || null, reasons, entry: raw });
    return null;
  }

  const date = dateInfo.date;
  if (dateInfo.precision !== cleanString(raw.datePrecision)) ctx.normalizations.datePrecisionFixed += 1;
  if (cleanString(raw.displayDate) !== displayOf(date)) ctx.normalizations.displayDateFixed += 1;

  const year = Number(date.slice(0, 4));
  let chapter = Number.isInteger(raw.chapter) ? raw.chapter : NaN;
  if (!Number.isInteger(chapter) || chapter < 0 || chapter > 8 || !chapterFitsRange(chapter, year)) {
    if (Number.isInteger(chapter) && chapter >= 0 && chapter <= 8) {
      ctx.notes.push(`event:${id}: 原 chapter=${chapter} 与年份 ${year} 不匹配，已按年份修正为 ${chapterForYear(year)}`);
      ctx.normalizations.chapterFixed += 1;
    }
    chapter = chapterForYear(year);
  }

  const category = EVENT_CATEGORIES.has(cleanString(raw.category)) ? cleanString(raw.category) : 'breakthrough';
  if (category !== cleanString(raw.category)) {
    ctx.notes.push(`event:${id}: category 缺失或非法，已回退为「${category}」`);
  }
  let dateType = cleanString(raw.dateType);
  if (!DATE_TYPES.has(dateType)) {
    dateType = category === 'theory' || category === 'science'
      ? 'paper'
      : category === 'policy'
        ? 'policy'
        : category === 'product'
          ? 'product'
          : 'announcement';
    ctx.notes.push(`event:${id}: dateType 缺失或非法，已按 category 推断为「${dateType}」`);
  }

  const organizationIds = uniqueStrings(
    asArray(raw.organizations)
      .map((orgId) => canonicalOrgId(orgId))
      .filter(Boolean),
  ).filter((orgId) => Boolean(ensureOrganization(orgId, { event: { sources, countryOrRegion: '' } })));

  const event = {
    id,
    date,
    displayDate: displayOf(date),
    datePrecision: dateInfo.precision,
    dateType,
    title,
    titleEn: cleanString(raw.titleEn) || undefined,
    category,
    summary: cleanString(raw.summary) || `${title} 发生于 ${displayOf(date)}。`,
    significance: cleanString(raw.significance) || '该事件的历史影响尚待进一步核实。',
    organizations: organizationIds,
    people: uniqueStrings(asArray(raw.people)),
    relatedModels: uniqueStrings(asArray(raw.relatedModels)),
    chapter,
    sources,
    verificationStatus: normalizeVerification(raw.verificationStatus, sources),
    notes: cleanString(raw.notes) || null,
  };
  if (!cleanString(raw.summary) || !cleanString(raw.significance)) {
    ctx.normalizations.textPlaceholders += 1;
    ctx.notes.push(`event:${id}: 缺少 summary/significance，已生成中性占位文案（未编造事实）`);
  }
  return { event, meta: { file: file.file } };
}

const modelCandidates = [];
const eventCandidates = [];

for (const file of loadedData) {
  for (const raw of asArray(file.data.models)) {
    if (!raw || typeof raw !== 'object') continue;
    const normalized = normalizeModel(raw, file);
    if (normalized) modelCandidates.push(normalized);
  }
  for (const raw of asArray(file.data.events)) {
    if (!raw || typeof raw !== 'object') continue;
    const normalized = normalizeEvent(raw, file);
    if (normalized) eventCandidates.push(normalized);
  }
}

// ---------------------------------------------------------------------------
// 按 id 去重合并（保留更早公告日期，合并来源/能力，文案取更完整）
// ---------------------------------------------------------------------------

function groupById(items, getDate) {
  const groups = new Map();
  for (const item of items) {
    const id = item.data.id;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(item);
  }
  for (const [id, list] of groups) {
    if (list.length <= 1) continue;
    list.sort((a, b) => padKey(getDate(a.data)).localeCompare(padKey(getDate(b.data))));
    const dates = [...new Set(list.map((item) => getDate(item.data)))];
    if (dates.length > 1) {
      ctx.conflicts.push({
        kind: list[0].kind,
        id,
        dates,
        keptDate: getDate(list[0].data),
        files: [...new Set(list.map((item) => item.meta.file))],
        note: '同一 id 多个日期，按规则保留更早日期为基座，其余日期见 quarantine 冲突记录',
      });
    }
  }
  return groups;
}

const mergedModels = [];
{
  const groups = groupById(modelCandidates.map((candidate) => ({ ...candidate, kind: 'model', data: candidate.model })), (model) => model.announcementDate);
  for (const [, list] of groups) {
    const base = list[0];
    const model = base.model;
    const meta = base.meta;
    for (const other of list.slice(1)) {
      const next = other.model;
      // 文案取更长（更完整）的一版
      for (const field of ['summary', 'keyAdvancement', 'significance', 'architecture', 'notes']) {
        if (field === 'notes') {
          if (next.notes && next.notes !== model.notes) {
            model.notes = model.notes ? `${model.notes}；${next.notes}` : next.notes;
          }
          continue;
        }
        model[field] = richerText(model[field], next[field]);
      }
      model.sources = mergeSources(model.sources, next.sources);
      model.capabilities = uniqueStrings([...model.capabilities, ...next.capabilities]);
      model.tags = uniqueStrings([...model.tags, ...next.tags]);
      model.predecessors = uniqueStrings([...model.predecessors, ...next.predecessors]);
      model.successors = uniqueStrings([...model.successors, ...next.successors]);
      for (const field of ['availabilityDate', 'parameters', 'contextWindow']) {
        if (!model[field] && next[field]) model[field] = next[field];
      }
      if (model.openWeights === null && next.openWeights !== null) model.openWeights = next.openWeights;
      if (next.verificationStatus === 'verified' && model.verificationStatus !== 'verified') {
        // 只有另一个文件明确给出 verified 才升级（不反向降级）
        model.verificationStatus = 'verified';
      }
      meta.files = uniqueStrings([...(meta.files || [meta.file]), other.meta.file]);
      meta.textPlaceholder = meta.textPlaceholder || other.meta.textPlaceholder;
      ctx.notes.push(`model:${model.id}: 跨文件重复 id，已合并（基座日期 ${model.announcementDate}）`);
    }
    mergedModels.push({ model, meta });
  }
}

const mergedEvents = [];
{
  const groups = groupById(eventCandidates.map((candidate) => ({ ...candidate, kind: 'event', data: candidate.event })), (event) => event.date);
  for (const [, list] of groups) {
    const base = list[0];
    const event = base.event;
    const meta = base.meta;
    for (const other of list.slice(1)) {
      const next = other.event;
      event.summary = richerText(event.summary, next.summary);
      event.significance = richerText(event.significance, next.significance);
      if (!event.titleEn && next.titleEn) event.titleEn = next.titleEn;
      if (!event.notes && next.notes) event.notes = next.notes;
      event.sources = mergeSources(event.sources, next.sources);
      event.organizations = uniqueStrings([...event.organizations, ...next.organizations]);
      event.people = uniqueStrings([...event.people, ...next.people]);
      event.relatedModels = uniqueStrings([...event.relatedModels, ...next.relatedModels]);
      if (next.verificationStatus === 'verified' && event.verificationStatus !== 'verified') {
        event.verificationStatus = 'verified';
      }
      meta.files = uniqueStrings([...(meta.files || [meta.file]), other.meta.file]);
      ctx.notes.push(`event:${event.id}: 跨文件重复 id，已合并（基座日期 ${event.date}）`);
    }
    mergedEvents.push({ event, meta });
  }
}

// ---------------------------------------------------------------------------
// 引用完整性：去掉悬空 predecessors/successors/relatedModels，补全 successors
// ---------------------------------------------------------------------------

// verified 必须有一手来源（合并完成后再判定一次，避免单文件判断过早）：
for (const { model } of mergedModels) {
  const before = model.verificationStatus;
  enforceVerifiedNeedsPrimary(model, ctx.normalizations);
  if (before === 'verified' && model.verificationStatus === 'partially-verified') {
    ctx.notes.push(`model:${model.id}: 只有二手来源，verificationStatus 由 verified 降级为 partially-verified（规范要求一手来源）`);
  }
}
for (const { event } of mergedEvents) {
  const before = event.verificationStatus;
  enforceVerifiedNeedsPrimary(event, ctx.normalizations);
  if (before === 'verified' && event.verificationStatus === 'partially-verified') {
    ctx.notes.push(`event:${event.id}: 只有二手来源，verificationStatus 由 verified 降级为 partially-verified（规范要求一手来源）`);
  }
}

const modelIdSet = new Set(mergedModels.map(({ model }) => model.id));

// 按研究员 notes 明示的关系补全跨文件 predecessors，再由下方的 successors 反推自动建立后向边
for (const [modelId, predecessorIds, basis] of PREDECESSOR_OVERRIDES) {
  const target = mergedModels.find(({ model }) => model.id === modelId);
  if (!target) {
    ctx.notes.push(`跨文件继承补全跳过：找不到 model:${modelId}（依据：${basis}）`);
    continue;
  }
  for (const predecessorId of predecessorIds) {
    if (!modelIdSet.has(predecessorId)) {
      ctx.notes.push(`跨文件继承补全跳过：model:${modelId} 的 predecessor「${predecessorId}」不存在（依据：${basis}）`);
      continue;
    }
    if (target.model.predecessors.includes(predecessorId)) continue;
    target.model.predecessors.push(predecessorId);
    ctx.notes.push(`model:${modelId}: 按研究员 notes 补上跨文件 predecessor「${predecessorId}」（依据：${basis}）`);
  }
}

for (const { model } of mergedModels) {
  const keptPredecessors = [];
  for (const id of model.predecessors) {
    if (id === model.id) continue;
    if (!modelIdSet.has(id)) {
      ctx.danglingReferences.push({ kind: 'model', id: model.id, field: 'predecessors', target: id });
      continue;
    }
    keptPredecessors.push(id);
  }
  model.predecessors = uniqueStrings(keptPredecessors);
  const keptSuccessors = [];
  for (const id of model.successors) {
    if (id === model.id) continue;
    if (!modelIdSet.has(id)) {
      ctx.danglingReferences.push({ kind: 'model', id: model.id, field: 'successors', target: id });
      continue;
    }
    keptSuccessors.push(id);
  }
  model.successors = uniqueStrings(keptSuccessors);
}

// successors 由 predecessors 反推
const derivedSuccessors = new Map();
for (const { model } of mergedModels) {
  for (const predecessorId of model.predecessors) {
    if (!derivedSuccessors.has(predecessorId)) derivedSuccessors.set(predecessorId, []);
    derivedSuccessors.get(predecessorId).push(model.id);
  }
}
for (const { model } of mergedModels) {
  const derived = derivedSuccessors.get(model.id) ?? [];
  model.successors = uniqueStrings([...model.successors, ...derived]);
}

for (const { event } of mergedEvents) {
  const keptModels = [];
  for (const id of event.relatedModels) {
    if (!modelIdSet.has(id)) {
      ctx.danglingReferences.push({ kind: 'event', id: event.id, field: 'relatedModels', target: id });
      continue;
    }
    keptModels.push(id);
  }
  event.relatedModels = uniqueStrings(keptModels);
  if (event.organizations.length === 0) {
    // 事件允许无机构，但登记以便报告提示
    ctx.notes.push(`event:${event.id}: 未关联任何机构`);
  }
}

// ---------------------------------------------------------------------------
// 机构收尾：补齐字段 + 从相关模型/事件补来源
// ---------------------------------------------------------------------------

const referencedOrgSources = new Map();
for (const { model } of mergedModels) {
  const list = referencedOrgSources.get(model.organization) ?? [];
  list.push(...model.sources);
  referencedOrgSources.set(model.organization, list);
}
for (const { event } of mergedEvents) {
  for (const orgId of event.organizations) {
    const list = referencedOrgSources.get(orgId) ?? [];
    list.push(...event.sources);
    referencedOrgSources.set(orgId, list);
  }
}

const finalOrganizations = [];
for (const org of orgMap.values()) {
  const display = displayNameForOrgId(org.id);
  const profile = ORG_PROFILES[org.id] ?? {};
  let sources = normalizeSources(org.sources, { record: ctx.normalizations });
  if (sources.length === 0) {
    const fallback = (referencedOrgSources.get(org.id) ?? []).slice(0, 1);
    sources = fallback.map((source) => ({
      label: `${org.name || display.name} — 相关模型或事件来源（整合脚本补充）`,
      url: source.url,
      kind: source.kind,
    }));
    ctx.notes.push(`organization:${org.id}: 缺少 sources，已用关联条目来源补充（需人工替换为机构官方页）`);
  }
  const orgSummary = cleanString(org.summary);
  const summary = orgSummary || profile.summary || `${org.nameZh || display.nameZh}，简介待补充。`;
  if (!orgSummary) {
    if (profile.summary) ctx.normalizations.orgProfileFilled += 1;
    else ctx.notes.push(`organization:${org.id}: 缺少 summary，已生成中性占位`);
  }
  const focus = uniqueStrings([...(org.focus ?? []), ...(profile.focus ?? [])]);
  if (focus.length === 0) ctx.notes.push(`organization:${org.id}: 缺少 focus`);
  const founded = org.founded || profile.founded || '';
  if (!org.founded && profile.founded) ctx.normalizations.orgProfileFilled += 1;
  finalOrganizations.push({
    id: org.id,
    name: org.name || display.name,
    nameZh: org.nameZh || org.name || display.nameZh,
    countryOrRegion: org.countryOrRegion || display.country || '未知',
    founded,
    focus,
    summary,
    sources,
  });
}
finalOrganizations.sort((a, b) => a.id.localeCompare(b.id));

// ---------------------------------------------------------------------------
// 疑似重复（保守判重：只报告，不删除）
// ---------------------------------------------------------------------------

/**
 * 保守判重键：名称小写、去括号、去完整日期、去 3–8 位独立数字（如 1106 / 20241017 这类
 * 版本快照后缀），再去掉所有标点。只在键完全相同时才提示「疑似重复」，
 * 避免把 GPT-5 与 GPT-5.1、Claude Opus 5 与 Opus 5.5 这种正常版本序列误报。
 */
function normalizeNameForDuplicate(name) {
  return cleanString(name)
    .toLowerCase()
    .replace(/[（(][^)）]*[)）]/g, ' ')
    .replace(/\+/g, 'plus')
    .replace(/[·•]/g, '')
    .replace(/\b(19|20)\d{2}[-/.]\d{1,2}([-/.]\d{1,2})?\b/g, ' ')
    .replace(/\b\d{3,8}\b/g, ' ')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '');
}

function detectDuplicates(items, { kind, getName, getDate, getOrg }) {
  const groups = new Map();
  for (const item of items) {
    const key = normalizeNameForDuplicate(getName(item));
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  const results = [];
  for (const [, list] of groups) {
    if (list.length < 2) continue;
    const dates = uniqueStrings(list.map(getDate));
    results.push({
      signal: '名称（去除日期/快照后缀后）相同',
      confidence:
        dates.length === 1
          ? '高（名称与日期都一致，强烈疑似同一条目的不同写法）'
          : '中高（名称一致但日期不同，可能是同一模型的不同快照版本，需人工确认后决定是否合并）',
      kind,
      ids: list.map((item) => item.id),
      names: uniqueStrings(list.map(getName)),
      dates,
      organizations: getOrg ? uniqueStrings(list.map(getOrg)) : undefined,
    });
  }
  return results;
}

const suspectedDuplicates = {
  models: detectDuplicates(
    mergedModels.map(({ model }) => model),
    {
      kind: 'model',
      getName: (model) => model.name,
      getDate: (model) => model.announcementDate,
      getOrg: (model) => model.organization,
    },
  ),
  events: detectDuplicates(
    mergedEvents.map(({ event }) => event),
    {
      kind: 'event',
      getName: (event) => event.title,
      getDate: (event) => event.date,
    },
  ),
};

// ---------------------------------------------------------------------------
// 时间顺序排序 + 输出
// ---------------------------------------------------------------------------

const finalModels = mergedModels.map(({ model }) => model);
const finalEvents = mergedEvents.map(({ event }) => event);

finalModels.sort((a, b) => padKey(a.announcementDate).localeCompare(padKey(b.announcementDate)) || a.id.localeCompare(b.id));
finalEvents.sort((a, b) => padKey(a.date).localeCompare(padKey(b.date)) || a.id.localeCompare(b.id));

function writeJson(relativePath, value) {
  const path = resolve(ROOT, relativePath);
  mkdirSync(resolve(path, '..'), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return path;
}

writeJson('src/data/models.json', finalModels);
writeJson('src/data/events.json', finalEvents);
writeJson('src/data/organizations.json', finalOrganizations);

// ---------------------------------------------------------------------------
// 统计 + 隔离文件
// ---------------------------------------------------------------------------

function countBy(items, getKey) {
  const map = {};
  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    map[key] = (map[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(map).sort(([a], [b]) => String(a).localeCompare(String(b))));
}

function textLengthOutliers() {
  const outliers = [];
  for (const model of finalModels) {
    const summaryLength = model.summary.length;
    if (summaryLength < 60 || summaryLength > 140) {
      outliers.push({ kind: 'model', id: model.id, field: 'summary', length: summaryLength, expect: '60–140' });
    }
  }
  for (const event of finalEvents) {
    if (event.summary.length < 60 || event.summary.length > 140) {
      outliers.push({ kind: 'event', id: event.id, field: 'summary', length: event.summary.length, expect: '60–140' });
    }
  }
  return outliers;
}

const stats = {
  generatedAt: GENERATED_AT,
  cutoff: CUTOFF,
  researchFiles: researchFiles.map((file) => ({
    file: file.file,
    exists: file.exists,
    parsed: file.parsed,
    models: file.models,
    events: file.events,
    organizations: file.organizations,
    error: file.error,
    researcher: file.meta?.researcher ?? null,
  })),
  missingFiles: researchFiles.filter((file) => !file.exists).map((file) => file.file),
  brokenResearchFiles: researchFiles.filter((file) => file.exists && !file.parsed).map((file) => file.file),
  counts: {
    models: finalModels.length,
    events: finalEvents.length,
    organizations: finalOrganizations.length,
    sources: {
      models: finalModels.reduce((sum, model) => sum + model.sources.length, 0),
      events: finalEvents.reduce((sum, event) => sum + event.sources.length, 0),
      organizations: finalOrganizations.reduce((sum, org) => sum + org.sources.length, 0),
    },
  },
  modelsByYear: countBy(finalModels, (model) => model.announcementDate.slice(0, 4)),
  modelsByOrganization: countBy(finalModels, (model) => model.organization),
  modelsByFamily: countBy(finalModels, (model) => model.family),
  modelsByCategory: countBy(finalModels, (model) => model.category),
  modelsByPrecision: countBy(finalModels, (model) => model.datePrecision),
  modelsByDateType: countBy(finalModels, (model) => model.dateType),
  eventsByChapter: countBy(finalEvents, (event) => String(event.chapter)),
  eventsByCategory: countBy(finalEvents, (event) => event.category),
  eventsByYear: countBy(finalEvents, (event) => event.date.slice(0, 4)),
  verification: {
    models: countBy(finalModels, (model) => model.verificationStatus),
    events: countBy(finalEvents, (event) => event.verificationStatus),
    verifiedRatioModels: finalModels.length
      ? Number((finalModels.filter((model) => model.verificationStatus === 'verified').length / finalModels.length).toFixed(4))
      : 0,
    verifiedRatioEvents: finalEvents.length
      ? Number((finalEvents.filter((event) => event.verificationStatus === 'verified').length / finalEvents.length).toFixed(4))
      : 0,
  },
  duplicates: {
    mergedModelIds: modelCandidates.length - finalModels.length,
    mergedEventIds: eventCandidates.length - finalEvents.length,
    suspectedModels: suspectedDuplicates.models.length,
    suspectedEvents: suspectedDuplicates.events.length,
  },
  conflicts: ctx.conflicts,
  rejected: {
    total: ctx.rejected.length,
    byKind: countBy(ctx.rejected, (item) => item.kind),
    byReason: countBy(ctx.rejected.flatMap((item) => item.reasons), (reason) => reason.replace(/「[^」]*」/g, '「…」').replace(/\d{4}-\d{2}-\d{2}/g, '<date>')),
  },
  danglingReferences: ctx.danglingReferences.length,
  normalizations: ctx.normalizations,
  textLengthOutliers: textLengthOutliers(),
  organizationsWithoutSources: finalOrganizations.filter((org) => org.sources.length === 0).map((org) => org.id),
  organizationsNonWhitelist: finalOrganizations.filter((org) => !ORG_WHITELIST.has(org.id)).map((org) => org.id),
  organizationsNeedingEnrichment: finalOrganizations
    .filter((org) => (org.focus?.length ?? 0) === 0 || !org.founded || !org.sources.length)
    .map((org) => org.id),
  notes: ctx.notes,
  watchlist: WATCHLIST.map(([label, pattern]) => ({
    label,
    models: finalModels.filter((model) => pattern.test(`${model.name} ${model.id}`)).map((model) => ({
      id: model.id,
      name: model.name,
      date: model.announcementDate,
      verificationStatus: model.verificationStatus,
      sources: model.sources.length,
    })),
    events: finalEvents.filter((event) => pattern.test(`${event.title} ${event.titleEn || ''}`)).map((event) => event.id),
  })),
  quarantine: {
    file: 'research/quarantine.json',
    rejected: ctx.rejected.length,
    conflicts: ctx.conflicts.length,
    suspectedDuplicates: suspectedDuplicates.models.length + suspectedDuplicates.events.length,
  },
};

const quarantine = {
  meta: {
    generatedAt: GENERATED_AT,
    cutoff: CUTOFF,
    description:
      '整合脚本隔离区：被拒绝的条目保留原始内容（未删除研究员文件），疑似重复与冲突仅作报告，不自动删除真实记录。',
    researchFiles: stats.researchFiles,
    missingFiles: stats.missingFiles,
    brokenResearchFiles: stats.brokenResearchFiles,
    counts: stats.counts,
    verification: stats.verification,
    rejectedByKind: stats.rejected.byKind,
    rejectedByReason: stats.rejected.byReason,
    normalizations: ctx.normalizations,
    danglingReferences: ctx.danglingReferences,
    organizationsWithoutSources: stats.organizationsWithoutSources,
    organizationsNonWhitelist: stats.organizationsNonWhitelist,
    organizationsNeedingEnrichment: stats.organizationsNeedingEnrichment,
  },
  rejected: ctx.rejected,
  conflicts: ctx.conflicts,
  suspectedDuplicates,
  normalizations: {
    notes: ctx.notes,
    textLengthOutliers: stats.textLengthOutliers,
  },
};

writeJson('research/quarantine.json', quarantine);

// stdout：人类可读摘要 + 机器可读统计（供数据报告引用）
console.log('合并完成：');
console.log(JSON.stringify(stats, null, 2));
