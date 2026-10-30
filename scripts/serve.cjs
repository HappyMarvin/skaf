const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../docs');
const flag = process.argv.indexOf('--port');
const port = Number(flag >= 0 ? process.argv[flag + 1] : 4174);
const prefix = '/skaf/';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8'
};

http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400).end('Bad request'); return; }
  if (pathname === '/' || pathname === '/skaf') {
    response.writeHead(302, { Location: prefix }).end(); return;
  }
  if (!pathname.startsWith(prefix)) { response.writeHead(404).end('Not found'); return; }
  const relative = pathname.slice(prefix.length) || 'index.html';
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) { response.writeHead(403).end('Forbidden'); return; }
  fs.readFile(file, (error, content) => {
    if (error) { response.writeHead(404).end('Not found'); return; }
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(content);
  });
}).listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}${prefix}`));
