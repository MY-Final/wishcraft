/**
 * WISHCRAFT site builder.
 *
 * Discovers every `projects/<dir>/wish.json`, builds that project, and assembles
 * a static site in `_site/`:
 *
 *   _site/index.html          — the portfolio (copied from site/)
 *   _site/projects.json       — generated index of works
 *   _site/projects/<id>/      — each built project, always at index.html
 *   _site/assets/covers/      — cover images
 *
 * Usage:
 *   node scripts/build-site.mjs                 # install + build everything
 *   node scripts/build-site.mjs --skip-install  # reuse existing node_modules
 *   node scripts/build-site.mjs --only=<id>     # one project
 *   node scripts/build-site.mjs --no-clean      # keep previous _site contents
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SITE_SRC = path.join(ROOT, 'site');
const OUT = path.join(ROOT, '_site');
const PROJECTS_DIR = path.join(ROOT, 'projects');
const args = process.argv.slice(2);
const skipInstall = args.includes('--skip-install');
const only = args.find((arg) => arg.startsWith('--only='))?.split('=')[1];
const noClean = args.includes('--no-clean');

const log = (message) => console.log(`\x1b[90m[wishcraft]\x1b[0m ${message}`);
const ok = (message) => console.log(`\x1b[32m[ok]\x1b[0m ${message}`);

function run(command, cwd) {
  log(`$ ${command}  (${path.relative(ROOT, cwd) || '.'})`);
  execSync(command, {
    cwd,
    stdio: 'inherit',
    // Do not force NODE_ENV=production: npm/npx would then skip devDependencies
    // (esbuild, vite, typescript) that the builds need.
    env: { ...process.env, CI: '1' },
  });
}

function readWishes() {
  if (!fs.existsSync(PROJECTS_DIR)) return [];
  const wishes = [];
  for (const entry of fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const projectDir = path.join(PROJECTS_DIR, entry.name);
    const wishPath = path.join(projectDir, 'wish.json');
    if (!fs.existsSync(wishPath)) continue;
    const wish = JSON.parse(fs.readFileSync(wishPath, 'utf8'));
    if (!wish.id || !wish.title) {
      throw new Error(`Invalid wish.json in ${entry.name}: id and title are required`);
    }
    if (!wish.preview) wish.preview = `projects/${wish.id}/`;
    wish.sourcePath = path.relative(ROOT, projectDir).replaceAll('\\', '/');
    wishes.push(wish);
  }
  return wishes.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

function installDependencies(wish, projectDir) {
  if (wish.build?.mode === 'static') return;
  if (skipInstall) {
    log(`skip install for ${wish.id}`);
    return;
  }
  const manager = wish.build?.manager === 'npm' ? 'npm' : 'pnpm';
  const hasNpmLock = fs.existsSync(path.join(projectDir, 'package-lock.json'));
  const hasPnpmLock = fs.existsSync(path.join(projectDir, 'pnpm-lock.yaml'));
  const install =
    wish.build?.install ||
    (manager === 'npm'
      ? hasNpmLock
        ? 'npm ci'
        : 'npm install'
      : hasPnpmLock
        ? 'pnpm install --frozen-lockfile'
        : 'pnpm install');
  run(install, projectDir);
}

function copyDir(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else if (entry.isSymbolicLink()) {
      fs.copyFileSync(fs.realpathSync(from), to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function copyBuiltProject(wish, projectDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });

  if (wish.build?.mode === 'static') {
    const source = path.join(projectDir, wish.build.source);
    if (!fs.existsSync(source)) throw new Error(`Missing static source: ${source}`);
    fs.copyFileSync(source, path.join(targetDir, 'index.html'));
    for (const extra of wish.build.files || []) {
      const from = path.join(projectDir, extra.from);
      const to = path.join(targetDir, extra.to);
      if (!fs.existsSync(from)) {
        log(`missing extra file (skipped): ${extra.from}`);
        continue;
      }
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    }
    return;
  }

  const output = wish.build?.output || 'dist';
  const outputPath = path.join(projectDir, output);
  if (!fs.existsSync(outputPath)) {
    throw new Error(`Build output not found for ${wish.id}: ${output}`);
  }
  const stat = fs.statSync(outputPath);
  if (stat.isFile()) {
    fs.copyFileSync(outputPath, path.join(targetDir, 'index.html'));
  } else {
    copyDir(outputPath, targetDir);
  }

  if (!fs.existsSync(path.join(targetDir, 'index.html'))) {
    throw new Error(`No index.html produced for ${wish.id}`);
  }
}

function resolveCover(wish) {
  if (!wish.cover) return '';
  return fs.existsSync(path.join(SITE_SRC, wish.cover)) ? wish.cover : '';
}

function writeProjectsJson(wishes) {
  const works = wishes.map((wish) => {
    const { build: _build, sourcePath, cover, ...rest } = wish;
    return {
      ...rest,
      cover: resolveCover(wish),
      preview: `projects/${wish.id}/`,
      sourcePath,
    };
  });
  const data = {
    name: 'WISHCRAFT · 许愿池',
    generatedAt: new Date().toISOString(),
    works,
  };
  fs.writeFileSync(path.join(OUT, 'projects.json'), `${JSON.stringify(data, null, 2)}\n`);
  return works;
}

function main() {
  const wishes = readWishes();
  if (!wishes.length) {
    console.error('No projects/*/wish.json found.');
    process.exit(1);
  }
  const selected = only ? wishes.filter((wish) => wish.id === only) : wishes;
  if (!selected.length) {
    console.error(`No wish with id "${only}".`);
    process.exit(1);
  }

  if (!noClean && !only && fs.existsSync(OUT)) {
    fs.rmSync(OUT, { recursive: true, force: true });
  }
  fs.mkdirSync(OUT, { recursive: true });

  log(`copying portfolio from site/`);
  copyDir(SITE_SRC, OUT);
  fs.mkdirSync(path.join(OUT, 'projects'), { recursive: true });

  for (const wish of selected) {
    const projectDir = path.join(ROOT, wish.sourcePath);
    const targetDir = path.join(OUT, 'projects', wish.id);
    log(`building ${wish.id} (${wish.title})`);
    installDependencies(wish, projectDir);
    if (wish.build?.mode !== 'static') {
      run(wish.build.command, projectDir);
    }
    copyBuiltProject(wish, projectDir, targetDir);
    ok(`${wish.id} → projects/${wish.id}/`);
  }

  // Always regenerate the full index, even for a single --only build.
  const works = writeProjectsJson(wishes);
  ok(`projects.json generated with ${works.length} works`);
  log(`site assembled at ${path.relative(ROOT, OUT)}/`);
}

main();
