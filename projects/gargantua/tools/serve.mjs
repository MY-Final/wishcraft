#!/usr/bin/env node
/**
 * GARGANTUA — tiny zero-dependency static file server.
 *
 * The project is a no-build native ES-module app; it only needs a static host
 * that serves the right MIME types (ES modules and shaders are strict about
 * `Content-Type`). This server is used by `tools/qa.mjs`, `tools/cover.mjs` and
 * by hand for local review.
 *
 * Usage:
 *   node tools/serve.mjs                    # serve projects/gargantua on :5193
 *   node tools/serve.mjs 5194               # custom port
 *   node tools/serve.mjs 5194 --root _site  # serve the built static site
 *   node tools/serve.mjs --port=5194 --root ../.. --log
 *
 * As a module:
 *   import { startStaticServer } from './serve.mjs';
 *   const { url, close } = await startStaticServer({ root, port: 0 });
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const DEFAULT_PORT = 5193;
export const DEFAULT_HOST = '127.0.0.1';

/** Project directory (projects/gargantua), resolved regardless of cwd. */
export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.glsl': 'text/plain; charset=utf-8',
  '.vert': 'text/plain; charset=utf-8',
  '.frag': 'text/plain; charset=utf-8',
};

const mimeFor = (file) => MIME_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';

/** Reject anything that could escape the served root. */
function safeSegments(pathname) {
  const segments = pathname.split('/');
  const out = [];
  for (const segment of segments) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') return null;
    let decoded;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      return null;
    }
    if (decoded === '..' || decoded.includes('\0') || /[/\\]/.test(decoded)) return null;
    out.push(decoded);
  }
  return out;
}

function sendText(res, status, message, extraHeaders = {}) {
  const body = `${message}\n`;
  res.writeHead(status, {
    'content-type': 'text/plain; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...extraHeaders,
  });
  res.end(body);
}

function sendFile(req, res, file, stat) {
  const headers = {
    'content-type': mimeFor(file),
    'cache-control': 'no-store',
    'accept-ranges': 'bytes',
    'x-content-type-options': 'nosniff',
  };
  const range = req.headers.range;
  const rangeMatch = typeof range === 'string' ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null;
  if (rangeMatch) {
    let start = rangeMatch[1] === '' ? NaN : Number(rangeMatch[1]);
    let end = rangeMatch[2] === '' ? NaN : Number(rangeMatch[2]);
    if (Number.isNaN(start) && Number.isNaN(end)) {
      sendText(res, 416, 'Range Not Satisfiable', { 'content-range': `bytes */${stat.size}` });
      return;
    }
    if (Number.isNaN(start)) {
      start = Math.max(0, stat.size - end);
      end = stat.size - 1;
    } else if (Number.isNaN(end) || end >= stat.size) {
      end = stat.size - 1;
    }
    if (start > end || start >= stat.size) {
      sendText(res, 416, 'Range Not Satisfiable', { 'content-range': `bytes */${stat.size}` });
      return;
    }
    headers['content-range'] = `bytes ${start}-${end}/${stat.size}`;
    headers['content-length'] = end - start + 1;
    res.writeHead(206, headers);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file, { start, end }).pipe(res);
    return;
  }

  headers['content-length'] = stat.size;
  res.writeHead(200, headers);
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

/**
 * Start the static server.
 * @param {{root?: string, port?: number, host?: string, log?: boolean}} options
 * @returns {Promise<{server: http.Server, port: number, host: string, root: string, url: string, close: () => Promise<void>}>}
 */
export function startStaticServer({
  root = PROJECT_ROOT,
  port = DEFAULT_PORT,
  host = DEFAULT_HOST,
  log = false,
} = {}) {
  const resolvedRoot = path.resolve(root);
  if (!fs.existsSync(resolvedRoot) || !fs.statSync(resolvedRoot).isDirectory()) {
    return Promise.reject(new Error(`static root is not a directory: ${resolvedRoot}`));
  }

  const server = http.createServer(async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendText(res, 405, 'Method Not Allowed', { allow: 'GET, HEAD' });
      return;
    }

    let pathname;
    try {
      pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    } catch {
      sendText(res, 400, 'Bad Request');
      return;
    }

    const segments = safeSegments(pathname);
    if (!segments) {
      sendText(res, 403, 'Forbidden');
      return;
    }

    let file = path.resolve(resolvedRoot, ...segments);
    const insideRoot = file === resolvedRoot || file.startsWith(resolvedRoot + path.sep);
    if (!insideRoot) {
      sendText(res, 403, 'Forbidden');
      return;
    }

    try {
      let stat = await fsp.stat(file);
      if (stat.isDirectory()) {
        if (!pathname.endsWith('/')) {
          res.writeHead(301, { location: `${pathname}/`, 'cache-control': 'no-store' });
          res.end();
          return;
        }
        file = path.join(file, 'index.html');
        stat = await fsp.stat(file);
      }
      if (!stat.isFile()) {
        sendText(res, 404, 'Not Found');
        return;
      }
      if (log) console.log(`[serve] 200 ${req.method} ${pathname}`);
      sendFile(req, res, file, stat);
    } catch (error) {
      if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') {
        if (log) console.log(`[serve] 404 ${req.method} ${pathname}`);
        sendText(res, 404, 'Not Found');
      } else {
        console.error('[serve] failed', pathname, error);
        sendText(res, 500, 'Internal Server Error');
      }
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.removeListener('error', reject);
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      resolve({
        server,
        port: actualPort,
        host,
        root: resolvedRoot,
        url: `http://${host}:${actualPort}/`,
        close: () =>
          new Promise((done) => {
            server.close(() => done());
            server.closeAllConnections?.();
          }),
      });
    });
  });
}

function parseCliArgs(argv) {
  const options = { root: PROJECT_ROOT, port: DEFAULT_PORT, host: DEFAULT_HOST, log: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--log') options.log = true;
    else if (arg === '--quiet') options.log = false;
    else if (arg === '--root') options.root = path.resolve(argv[++index] ?? '.');
    else if (arg.startsWith('--root=')) options.root = path.resolve(arg.slice('--root='.length));
    else if (arg === '--host') options.host = argv[++index] ?? DEFAULT_HOST;
    else if (arg.startsWith('--host=')) options.host = arg.slice('--host='.length);
    else if (arg === '--port') options.port = Number(argv[++index]);
    else if (arg.startsWith('--port=')) options.port = Number(arg.slice('--port='.length));
    else if (/^\d+$/.test(arg)) options.port = Number(arg);
    else if (arg === '--help' || arg === '-h') options.help = true;
    else {
      console.error(`[serve] unknown argument: ${arg}`);
      options.invalid = true;
    }
  }
  return options;
}

const isMain =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  const options = parseCliArgs(process.argv.slice(2));
  if (options.help || options.invalid) {
    console.log(
      'Usage: node tools/serve.mjs [port] [--root <dir>] [--host <host>] [--log]\n' +
        `  default: ${PROJECT_ROOT} on http://${DEFAULT_HOST}:${DEFAULT_PORT}/`,
    );
    process.exit(options.invalid ? 2 : 0);
  }
  if (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535) {
    console.error('[serve] invalid port');
    process.exit(2);
  }
  startStaticServer(options)
    .then(({ url, root }) => {
      console.log(`[serve] ${root}`);
      console.log(`[serve] listening on ${url}`);
    })
    .catch((error) => {
      if (error?.code === 'EADDRINUSE') {
        console.error(`[serve] port ${options.port} is already in use — pass another port, e.g. node tools/serve.mjs 5194`);
      } else {
        console.error('[serve] failed to start:', error);
      }
      process.exit(1);
    });
}
