import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../public/', import.meta.url));
const routes = new Set(['tasks', 'files', 'push', 'cron', 'backup']);
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.webmanifest':'application/manifest+json' };
http.createServer(async (req,res) => {
  res.status = code => { res.statusCode = code; return res; };
  res.json = data => { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(data)); };
  res.send = data => res.end(data);
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      const route = url.pathname.slice(5);
      if (!routes.has(route)) return res.status(404).json({error:'not_found'});
      req.query = Object.fromEntries(url.searchParams);
      const { default: handler } = await import(`../api/${route}.js`);
      return await handler(req,res);
    }
    if (!['GET','HEAD'].includes(req.method)) return res.status(405).end();
    const filename = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!filename.startsWith(root)) return res.status(403).end();
    const data = await fs.readFile(filename);
    res.setHeader('Content-Type',mime[path.extname(filename)] || 'application/octet-stream');
    res.setHeader('Cache-Control','no-store');
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (e) {
    res.status(e.code === 'ENOENT' ? 404 : 500).json({error:'request_failed'});
  }
}).listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log(`Контроль задач: http://localhost:${process.env.PORT || 3000}`));
