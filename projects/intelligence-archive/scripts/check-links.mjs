#!/usr/bin/env node
/**
 * check-links.mjs — 核验 src/data/*.json 中所有 sources.url 的可访问性
 *
 * 规则（与 docs/BUILD_BRIEF.md 的数据真实性要求一致）：
 *  - 汇总 models / events / organizations 的 sources.url，按 URL 去重；
 *  - 并发 6；单请求超时 15s；每个 URL 先 HEAD，失败后回退 GET（即「失败重试 1 次」）；
 *  - 结果分类：OK / BLOCKED（401/403/405/429 等反爬，需人工确认）/ DEAD（404/410/5xx/DNS）
 *    / TIMEOUT / ERROR；
 *  - 状态码与死链清单写入 docs/DATA_REPORT.md 的「附录 · 来源链接核验」区块（带标记，可重复运行覆盖）。
 *
 * 用法：node scripts/check-links.mjs [--concurrency 6] [--timeout 15000] [--limit 50] [--strict]
 *   --limit N   只检查前 N 个 URL（调试用）
 *   --strict    存在 DEAD/ERROR 时以非 0 退出
 *   --no-write  只打印，不写 docs/DATA_REPORT.md
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DATA_FILES = [
  ['models', resolve(ROOT, 'src/data/models.json')],
  ['events', resolve(ROOT, 'src/data/events.json')],
  ['organizations', resolve(ROOT, 'src/data/organizations.json')],
];
const REPORT_FILE = resolve(ROOT, 'docs/DATA_REPORT.md');
const BEGIN_MARKER = '<!-- LINK-CHECK:BEGIN -->';
const END_MARKER = '<!-- LINK-CHECK:END -->';

const args = process.argv.slice(2);
function argValue(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  return value === undefined ? fallback : value;
}
const CONCURRENCY = Math.max(1, Number(argValue('--concurrency', 6)) || 6);
const TIMEOUT_MS = Math.max(1000, Number(argValue('--timeout', 15000)) || 15000);
const LIMIT = Number(argValue('--limit', 0)) || 0;
const STRICT = args.includes('--strict');
const NO_WRITE = args.includes('--no-write');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function loadJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    console.error(`无法解析 ${path}: ${error.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 收集 URL
// ---------------------------------------------------------------------------

const urlMap = new Map();

function collect(items, kind) {
  for (const item of items ?? []) {
    for (const source of item.sources ?? []) {
      const url = typeof source?.url === 'string' ? source.url.trim() : '';
      if (!/^https?:\/\//i.test(url)) continue;
      const key = url.replace(/#.*$/, '');
      if (!urlMap.has(key)) {
        urlMap.set(key, { url, refs: [], labels: [], kinds: [] });
      }
      const record = urlMap.get(key);
      const ref = `${kind}:${item.id}`;
      if (!record.refs.includes(ref)) record.refs.push(ref);
      if (source.label && !record.labels.includes(source.label)) record.labels.push(source.label);
      if (source.kind && !record.kinds.includes(source.kind)) record.kinds.push(source.kind);
    }
  }
}

const counts = { models: 0, events: 0, organizations: 0 };
for (const [kind, path] of DATA_FILES) {
  const data = loadJson(path);
  if (!data) continue;
  counts[kind] = data.length;
  collect(data, kind);
}

const entries = Array.from(urlMap.values()).sort((a, b) => a.url.localeCompare(b.url));
const targets = LIMIT > 0 ? entries.slice(0, LIMIT) : entries;

if (entries.length === 0) {
  console.log('没有可检查的 sources.url（数据文件为空？先运行 node scripts/merge-data.mjs）。');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// 检查
// ---------------------------------------------------------------------------

function classifyStatus(status) {
  if (status >= 200 && status < 400) return 'OK';
  if ([401, 402, 403, 405, 406, 407, 409, 418, 429, 451].includes(status)) return 'BLOCKED';
  return 'DEAD'; // 404 / 410 / 其他 4xx / 5xx
}

function errorInfo(error) {
  return {
    name: error?.name || 'Error',
    message: error?.message || String(error),
    code: error?.cause?.code || error?.code || '',
  };
}

function categoryForError(info) {
  const code = String(info.code || '').toUpperCase();
  const text = `${info.name} ${code} ${info.message}`;
  if (/TimeoutError|AbortError|UND_ERR_HEADERS_TIMEOUT|UND_ERR_BODY_TIMEOUT/.test(text)) return 'TIMEOUT';
  if (/ENOTFOUND|EAI_AGAIN/.test(code)) return 'UNREACHABLE';
  if (/UND_ERR_CONNECT_TIMEOUT|ETIMEDOUT|ECONNREFUSED|ECONNRESET|ENETUNREACH|EHOSTUNREACH|EPIPE|UND_ERR_SOCKET/.test(text)) {
    return 'UNREACHABLE';
  }
  return 'ERROR';
}

async function request(url, method) {
  const started = Date.now();
  const response = await fetch(url, {
    method,
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      'user-agent': USER_AGENT,
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  });
  // 读掉响应体（部分服务器对空读的 HEAD/GET 会报错），不保留内容
  try {
    await response.arrayBuffer();
  } catch {
    // 忽略响应体读取错误，状态码已足够判断
  }
  return {
    status: response.status,
    finalUrl: response.url || url,
    elapsed: Date.now() - started,
  };
}

async function checkUrl(entry) {
  const attempts = [];
  // 第 1 次：HEAD
  let head = null;
  let headError = null;
  try {
    head = await request(entry.url, 'HEAD');
    attempts.push({ method: 'HEAD', status: head.status, elapsed: head.elapsed });
  } catch (error) {
    headError = errorInfo(error);
    attempts.push({ method: 'HEAD', error: `${headError.name}: ${headError.message}`, code: headError.code });
  }

  if (head && classifyStatus(head.status) === 'OK') {
    return { ...entry, category: 'OK', status: head.status, method: 'HEAD', attempts, finalUrl: head.finalUrl, elapsed: head.elapsed };
  }

  // 第 2 次（失败重试 1 次）：GET 兜底，反爬 / 不支持 HEAD 时常用
  let get = null;
  let getError = null;
  try {
    get = await request(entry.url, 'GET');
    attempts.push({ method: 'GET', status: get.status, elapsed: get.elapsed });
  } catch (error) {
    getError = errorInfo(error);
    attempts.push({ method: 'GET', error: `${getError.name}: ${getError.message}`, code: getError.code });
  }

  if (!get) {
    return {
      ...entry,
      category: categoryForError(getError ?? headError ?? {}),
      status: null,
      method: 'GET',
      attempts,
      finalUrl: entry.url,
      elapsed: null,
      error: getError ? `${getError.name}: ${getError.message}${getError.code ? ` (${getError.code})` : ''}` : 'network error',
    };
  }
  return {
    ...entry,
    category: classifyStatus(get.status),
    status: get.status,
    method: 'GET',
    attempts,
    finalUrl: get.finalUrl,
    elapsed: get.elapsed,
  };
}

async function runPool(items, worker, concurrency) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    for (;;) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

const startedAt = Date.now();
console.log(`开始核验 ${targets.length} 个唯一来源 URL（并发 ${CONCURRENCY}，超时 ${TIMEOUT_MS}ms，HEAD→GET 重试 1 次）…`);

let done = 0;
const results = await runPool(
  targets,
  async (entry) => {
    const result = await checkUrl(entry);
    done += 1;
    const line = `[${String(done).padStart(3, ' ')}/${targets.length}] ${result.category.padEnd(7)} ${result.status ?? '-'} ${result.url}`;
    console.log(line);
    return result;
  },
  CONCURRENCY,
);

const order = ['OK', 'BLOCKED', 'DEAD', 'TIMEOUT', 'UNREACHABLE', 'ERROR'];
const summary = { total: results.length, checkedAt: new Date().toISOString(), elapsedMs: Date.now() - startedAt };
for (const category of order) summary[category] = results.filter((result) => result.category === category).length;

const statusTally = {};
for (const result of results) {
  const key = result.status === null ? result.category : String(result.status);
  statusTally[key] = (statusTally[key] ?? 0) + 1;
}

// ---------------------------------------------------------------------------
// 写报告附录
// ---------------------------------------------------------------------------

function mdUrl(url) {
  return `<${url}>`;
}

function refText(entry) {
  const shown = entry.refs.slice(0, 3).join('、');
  return entry.refs.length > 3 ? `${shown} 等 ${entry.refs.length} 条` : shown;
}

function buildAppendix() {
  const generatedAt = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
  const lines = [];
  lines.push(BEGIN_MARKER);
  lines.push('');
  lines.push('## 附录 A · 来源链接核验（自动生成）');
  lines.push('');
  lines.push(`> 由 \`scripts/check-links.mjs\` 于 ${generatedAt} 生成，可重复运行覆盖本节。`);
  lines.push(`> 方法：按 URL 去重，并发 ${CONCURRENCY}，单请求超时 ${TIMEOUT_MS} ms，先 HEAD、失败回退 GET（重试 1 次）。`);
  lines.push('> 分类：`OK` 可访问 · `BLOCKED` 反爬/需人工确认（401/403/405/429 等）· `DEAD` 死链（404/410/5xx）· `TIMEOUT` 响应超时 · `UNREACHABLE` 网络层无法连接（本机网络限制或目标限流）· `ERROR` 其他网络错误。');
  lines.push('');
  lines.push(`- 数据规模：models ${counts.models} / events ${counts.events} / organizations ${counts.organizations}`);
  lines.push(`- 唯一来源 URL：**${summary.total}** 个（本次核验 ${targets.length} 个，耗时 ${(summary.elapsedMs / 1000).toFixed(1)} s）`);
  lines.push(`- 结果：OK **${summary.OK}** · BLOCKED **${summary.BLOCKED}** · DEAD **${summary.DEAD}** · TIMEOUT **${summary.TIMEOUT}** · UNREACHABLE **${summary.UNREACHABLE}** · ERROR **${summary.ERROR}**`);
  lines.push('');
  lines.push('### A.1 HTTP 状态码分布');
  lines.push('');
  lines.push('| 状态 | 数量 |');
  lines.push('|---|---:|');
  for (const [key, value] of Object.entries(statusTally).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${key} | ${value} |`);
  }
  lines.push('');

  const problems = results.filter((result) => result.category !== 'OK');
  lines.push('### A.2 不可达 / 需人工确认清单');
  lines.push('');
  if (problems.length === 0) {
    lines.push('本次核验未发现不可达链接。');
  } else {
    lines.push('| # | 分类 | HTTP | 方法 | 引用条目 | URL | 说明 |');
    lines.push('|---:|---|---:|---|---|---|---|');
    problems.forEach((result, index) => {
      const note =
        result.category === 'BLOCKED'
          ? '站点反爬/禁止自动访问，浏览器中可能仍可打开'
          : result.category === 'TIMEOUT'
            ? `超过 ${TIMEOUT_MS} ms 未响应`
            : result.error
              ? result.error.replaceAll('|', '\\|')
              : '返回 4xx/5xx';
      lines.push(
        `| ${index + 1} | ${result.category} | ${result.status ?? '-'} | ${result.method} | ${refText(result)} | ${mdUrl(result.url)} | ${note} |`,
      );
    });
  }
  lines.push('');

  const dead = results.filter((result) => result.category === 'DEAD' || result.category === 'ERROR');
  lines.push('### A.3 死链必须替换清单（按引用条目）');
  lines.push('');
  if (dead.length === 0) {
    lines.push('无确认死链。');
  } else {
    lines.push('以下 URL 返回 4xx/5xx 或 DNS/网络错误，需要替换为可访问的官方页面或论文页：');
    lines.push('');
    for (const result of dead) {
      lines.push(`- **${result.category}** \`${result.status ?? '-'}\` ${mdUrl(result.url)}`);
      lines.push(`  - 被引用于：${result.refs.join('、')}`);
    }
  }
  lines.push('');
  const current = results.filter((result) => result.category === 'UNREACHABLE');
  lines.push('### A.4 网络不可达（需人工在浏览器确认，暂不计入死链）');
  lines.push('');
  if (current.length === 0) {
    lines.push('无。');
  } else {
    for (const result of current) {
      lines.push(`- ${mdUrl(result.url)} ← ${result.refs.join('、')}（${result.error ?? '连接失败'}）`);
    }
  }
  lines.push('');
  lines.push('### A.5 全部 URL 状态');
  lines.push('');
  lines.push('| # | 分类 | HTTP | 引用条目 | URL |');
  lines.push('|---:|---|---:|---|---|');
  results.forEach((result, index) => {
    lines.push(`| ${index + 1} | ${result.category} | ${result.status ?? '-'} | ${refText(result)} | ${mdUrl(result.url)} |`);
  });
  lines.push('');
  lines.push(END_MARKER);
  return lines.join('\n');
}

let appendixWritten = false;
if (!NO_WRITE) {
  const appendix = buildAppendix();
  let existing = existsSync(REPORT_FILE) ? readFileSync(REPORT_FILE, 'utf8') : '';
  if (existing.includes(BEGIN_MARKER) && existing.includes(END_MARKER)) {
    const before = existing.slice(0, existing.indexOf(BEGIN_MARKER));
    const after = existing.slice(existing.indexOf(END_MARKER) + END_MARKER.length);
    existing = `${before}${appendix}${after}`;
  } else if (existing.trim()) {
    existing = `${existing.replace(/\s+$/, '')}\n\n${appendix}\n`;
  } else {
    existing = `# THE INTELLIGENCE ARCHIVE · 数据报告\n\n> 本文件由数据整合流程维护；附录 A 由 \`scripts/check-links.mjs\` 自动生成。\n\n${appendix}\n`;
  }
  writeFileSync(REPORT_FILE, existing, 'utf8');
  appendixWritten = true;
}

// ---------------------------------------------------------------------------
// stdout 汇总
// ---------------------------------------------------------------------------

console.log('');
console.log('链接核验汇总：');
console.log(JSON.stringify({ summary, statusTally }, null, 2));
if (summary.DEAD || summary.ERROR) {
  console.log('\n死链/错误清单：');
  for (const result of results.filter((item) => item.category === 'DEAD' || item.category === 'ERROR')) {
    console.log(`  ! ${result.category} ${result.status ?? '-'} ${result.url} ← ${result.refs.join(', ')}`);
  }
}
if (summary.BLOCKED) {
  console.log(`\n受限（反爬，需人工确认）${summary.BLOCKED} 条：`);
  for (const result of results.filter((item) => item.category === 'BLOCKED')) {
    console.log(`  ? BLOCKED ${result.status} ${result.url} ← ${result.refs.join(', ')}`);
  }
}
if (summary.TIMEOUT) {
  console.log(`\n超时 ${summary.TIMEOUT} 条：`);
  for (const result of results.filter((item) => item.category === 'TIMEOUT')) {
    console.log(`  ? TIMEOUT ${result.url} ← ${result.refs.join(', ')}`);
  }
}
if (summary.UNREACHABLE) {
  console.log(`\n网络不可达（本机网络限制/目标限流，需浏览器人工确认）${summary.UNREACHABLE} 条：`);
  for (const result of results.filter((item) => item.category === 'UNREACHABLE')) {
    console.log(`  ? UNREACHABLE ${result.url} ← ${result.refs.join(', ')} (${result.error ?? ''})`);
  }
}
if (appendixWritten) console.log(`\n已写入 ${REPORT_FILE.replace(`${ROOT}\\`, '')} 的附录 A。`);

if (STRICT && (summary.DEAD || summary.ERROR)) process.exit(1);
