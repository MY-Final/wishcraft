import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';

const exts = ['.ts', '.tsx', '.css', '.json', '/index.ts', '/index.tsx'];
const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(ts|tsx|css)$/.test(name)) files.push(path);
  }
}
walk('src');

const re = /from\s+['"](\.[^'"]+)['"]|import\s+['"](\.[^'"]+)['"]/g;
let bad = 0;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  let match;
  while ((match = re.exec(text))) {
    const spec = match[1] || match[2];
    const base = resolve(dirname(file), spec);
    const found =
      (existsSync(base) && statSync(base).isFile()) || exts.some((ext) => existsSync(base + ext));
    if (!found) {
      console.log(`MISSING ${relative('.', file)} -> ${spec}`);
      bad += 1;
    }
  }
}
console.log(`unresolved: ${bad}`);
