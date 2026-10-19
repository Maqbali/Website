#!/usr/bin/env node
/** Local preview only: node core/serve.mjs (from the package root) */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.woff2':'font/woff2'};
const port = Number(process.env.PORT || 4173);
createServer(async (req,res) => {
  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    let rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    let file = resolve(root, rel || 'index.html');
    if (file !== root && !file.startsWith(root + sep)) throw new Error('Path traversal');
    if (url.pathname.endsWith('/')) file = resolve(file, 'index.html');
    else if (!(await stat(file).catch(()=>null)) && !extname(file)) file += '.html';
    const data = await readFile(file);
    res.writeHead(200, {'Content-Type':types[extname(file)]||'application/octet-stream','X-Robots-Tag':url.pathname.startsWith('/new/')?'noindex':'none'});
    res.end(data);
  } catch { res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'});res.end('Not found'); }
}).listen(port,'127.0.0.1',()=>console.log(`Preview: http://127.0.0.1:${port}/new/`));
