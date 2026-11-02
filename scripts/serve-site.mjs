/**
 * Tiny static server for the assembled WISHCRAFT site.
 * Usage: node scripts/serve-site.mjs [port]
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const ROOT = path.resolve('_site');
const PORT = Number(process.argv[2] || 5180);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
};

if (!fs.existsSync(ROOT)) {
  console.error('_site not found. Run `node scripts/build-site.mjs --skip-install` first.');
  process.exit(1);
}

const server = http.createServer((request, response) => {
  try {
    const url = decodeURIComponent((request.url || '/').split('?')[0]);
    let target = path.join(ROOT, path.normalize(url));
    if (!target.startsWith(ROOT)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      target = path.join(target, 'index.html');
    }
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('404 — not found');
      return;
    }
    const ext = path.extname(target).toLowerCase();
    response.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream',
      'cache-control': 'no-cache',
      'x-content-type-options': 'nosniff',
    });
    fs.createReadStream(target).pipe(response);
  } catch (error) {
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(`500 — ${error.message}`);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`WISHCRAFT site: http://127.0.0.1:${PORT}/`);
});
