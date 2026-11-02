import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const dataDir = resolve('src/data');
const errors = [];
const warnings = [];

function load(name) {
  const file = resolve(dataDir, name);
  if (!existsSync(file)) {
    errors.push(`缺少数据文件 ${name}`);
    return [];
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`${name} 不是合法 JSON: ${error.message}`);
    return [];
  }
}

const models = load('models.json');
const events = load('events.json');
const organizations = load('organizations.json');

const ORG_IDS = new Set(organizations.map((org) => org.id));
const MODEL_IDS = new Set(models.map((model) => model.id));
const EVENT_IDS = new Set(events.map((event) => event.id));

const DATE_RE = /^\d{4}(-\d{2}(-\d{2})?)?$/;
const PRECISIONS = new Set(['day', 'month', 'year']);
const DATE_TYPES = new Set([
  'paper',
  'announcement',
  'product',
  'api',
  'weights',
  'conference',
  'policy',
]);
const CATEGORIES = new Set([
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
const VERIFICATIONS = new Set(['verified', 'partially-verified', 'unverified']);
const SOURCE_KINDS = new Set(['official', 'paper', 'docs', 'weights', 'press', 'archive']);
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

function checkDate(where, value, precision) {
  if (!value) return;
  if (!DATE_RE.test(value)) errors.push(`${where}: 日期格式错误「${value}」`);
  const expected = precision === 'year' ? 4 : precision === 'month' ? 7 : 10;
  if (value.length !== expected) {
    errors.push(`${where}: datePrecision=${precision} 与日期「${value}」长度不一致`);
  }
}

function checkDisplay(where, date, display, precision) {
  if (!display) {
    errors.push(`${where}: 缺少 displayDate`);
    return;
  }
  const expected = date.replaceAll('-', '.');
  if (display !== expected) {
    warnings.push(`${where}: displayDate「${display}」与日期「${date}」不一致`);
  }
  if (precision === 'day' && !/^\d{4}\.\d{2}\.\d{2}$/.test(display)) {
    errors.push(`${where}: day 精度 displayDate 格式应为 YYYY.MM.DD`);
  }
}

function checkSources(where, sources) {
  if (!Array.isArray(sources) || sources.length === 0) {
    errors.push(`${where}: 缺少 sources`);
    return;
  }
  for (const source of sources) {
    if (!source.label) errors.push(`${where}: source 缺少 label`);
    if (!SOURCE_KINDS.has(source.kind)) errors.push(`${where}: source.kind 非法「${source.kind}」`);
    if (!/^https?:\/\//.test(source.url || '')) errors.push(`${where}: source.url 非法「${source.url}」`);
  }
}

// ---------- models ----------
const seen = new Set();
for (const model of models) {
  const where = `model:${model.id || '(no-id)'}`;
  for (const field of [
    'id',
    'name',
    'organization',
    'countryOrRegion',
    'family',
    'generation',
    'announcementDate',
    'displayDate',
    'datePrecision',
    'dateType',
    'category',
    'architecture',
    'summary',
    'keyAdvancement',
    'significance',
    'verificationStatus',
  ]) {
    if (!model[field]) errors.push(`${where}: 缺少必填字段 ${field}`);
  }
  if (seen.has(model.id)) errors.push(`${where}: id 重复`);
  seen.add(model.id);
  if (!ORG_IDS.has(model.organization)) warnings.push(`${where}: organization「${model.organization}」不在 organizations.json`);
  if (!PRECISIONS.has(model.datePrecision)) errors.push(`${where}: datePrecision 非法`);
  if (!DATE_TYPES.has(model.dateType)) errors.push(`${where}: dateType 非法`);
  if (!CATEGORIES.has(model.category)) errors.push(`${where}: category 非法`);
  if (!VERIFICATIONS.has(model.verificationStatus)) errors.push(`${where}: verificationStatus 非法`);
  if (!Array.isArray(model.sources) || model.sources.length === 0) {
    errors.push(`${where}: 仍无来源`);
  } else if (
    model.verificationStatus === 'verified' &&
    !model.sources.some(
      (source) =>
        source.kind === 'official' ||
        source.kind === 'paper' ||
        source.kind === 'docs' ||
        source.kind === 'weights',
    )
  ) {
    warnings.push(`${where}: 标为 verified 但只有二手来源，应降级为 partially-verified`);
  }
  checkDate(where, model.announcementDate, model.datePrecision);
  checkDisplay(where, model.announcementDate, model.displayDate, model.datePrecision);
  checkSources(where, model.sources);
  if (model.availabilityDate) checkDate(`${where}:availability`, model.availabilityDate, model.availabilityDate.length === 4 ? 'year' : model.availabilityDate.length === 7 ? 'month' : 'day');
  for (const predecessor of model.predecessors || []) {
    if (!MODEL_IDS.has(predecessor)) warnings.push(`${where}: predecessor「${predecessor}」不存在`);
  }
  for (const successor of model.successors || []) {
    if (!MODEL_IDS.has(successor)) warnings.push(`${where}: successor「${successor}」不存在`);
  }
  if (model.announcementDate > '2026-11-02') errors.push(`${where}: 日期晚于研究截止日`);
}

// ---------- events ----------
const seenEvents = new Set();
for (const event of events) {
  const where = `event:${event.id || '(no-id)'}`;
  for (const field of [
    'id',
    'date',
    'displayDate',
    'datePrecision',
    'dateType',
    'title',
    'category',
    'summary',
    'significance',
    'chapter',
    'verificationStatus',
  ]) {
    if (!event[field]) errors.push(`${where}: 缺少必填字段 ${field}`);
  }
  if (seenEvents.has(event.id)) errors.push(`${where}: id 重复`);
  seenEvents.add(event.id);
  checkDate(where, event.date, event.datePrecision);
  checkDisplay(where, event.date, event.displayDate, event.datePrecision);
  checkSources(where, event.sources);
  if (!EVENT_CATEGORIES.has(event.category)) errors.push(`${where}: category 非法`);
  if (!VERIFICATIONS.has(event.verificationStatus)) errors.push(`${where}: verificationStatus 非法`);
  if (!Number.isInteger(event.chapter) || event.chapter < 0 || event.chapter > 8) {
    errors.push(`${where}: chapter 非法`);
  }
  for (const org of event.organizations || []) {
    if (!ORG_IDS.has(org)) warnings.push(`${where}: organization「${org}」不在 organizations.json`);
  }
  for (const modelId of event.relatedModels || []) {
    if (!MODEL_IDS.has(modelId)) warnings.push(`${where}: relatedModel「${modelId}」不存在`);
  }
  if (event.date > '2026-11-02') errors.push(`${where}: 日期晚于研究截止日`);
}

// ---------- organizations ----------
for (const org of organizations) {
  if (!org.id || !org.name) errors.push(`organization: 缺少 id/name`);
  if (!Array.isArray(org.sources) || org.sources.length === 0) {
    warnings.push(`organization:${org.id}: 缺少 sources`);
  }
}

const summary = {
  models: models.length,
  events: events.length,
  organizations: organizations.length,
  modelsByYear: models.reduce((acc, model) => {
    const year = model.announcementDate?.slice(0, 4);
    if (year) acc[year] = (acc[year] || 0) + 1;
    return acc;
  }, {}),
  verified: models.filter((model) => model.verificationStatus === 'verified').length,
  partial: models.filter((model) => model.verificationStatus === 'partially-verified').length,
};

console.log('数据校验摘要：');
console.log(JSON.stringify(summary, null, 2));
if (warnings.length) {
  console.log(`\n警告 ${warnings.length} 条：`);
  warnings.slice(0, 40).forEach((warning) => console.log(`  ! ${warning}`));
  if (warnings.length > 40) console.log(`  ... 其余 ${warnings.length - 40} 条省略`);
}
if (errors.length) {
  console.error(`\n错误 ${errors.length} 条：`);
  errors.slice(0, 60).forEach((error) => console.error(`  ✗ ${error}`));
  if (errors.length > 60) console.error(`  ... 其余 ${errors.length - 60} 条省略`);
  process.exit(1);
}
console.log('\n校验通过（无硬错误）。');
