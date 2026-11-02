import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const primaryKinds = new Set(['official', 'paper', 'docs', 'weights']);
const dir = resolve('research');
let changed = 0;

for (const name of readdirSync(dir)) {
  if (!name.endsWith('.json') || name === 'quarantine.json') continue;
  const path = resolve(dir, name);
  const data = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(data.models)) continue;
  for (const model of data.models) {
    if (model.verificationStatus !== 'verified') continue;
    const hasPrimary = (model.sources || []).some((source) => primaryKinds.has(source.kind));
    if (!hasPrimary) {
      model.verificationStatus = 'partially-verified';
      model.notes = `${model.notes ? `${model.notes} ` : ''}来源仅有二手报道，按数据规范标注为部分核实。`;
      changed += 1;
    }
  }
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

console.log(`downgraded ${changed} models to partially-verified`);
