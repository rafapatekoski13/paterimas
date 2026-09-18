// Servidor de arquivos para desenvolvimento; o site não tem backend.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('./dist/', import.meta.url));
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const server = http.createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!target.startsWith(root)) { res.writeHead(403); res.end(); return; }
    const data = await readFile(target);
    res.writeHead(200, {'Content-Type': types[path.extname(target)] || 'application/octet-stream','Referrer-Policy':'strict-origin-when-cross-origin','Cache-Control':'no-cache'}); res.end(data);
  } catch { res.writeHead(404); res.end('Não encontrado'); }
});
server.listen(4173, '127.0.0.1', () => console.log('paterimas: http://127.0.0.1:4173'));
