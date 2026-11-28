import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const directory = dirname(fileURLToPath(import.meta.url));
const allowed = new Map([
  ['index.html', 'text/html; charset=utf-8'], ['current.html', 'text/html; charset=utf-8'],
  ['a.html', 'text/html; charset=utf-8'], ['b.html', 'text/html; charset=utf-8'],
  ['study.js', 'text/javascript; charset=utf-8'], ['layout.css', 'text/css; charset=utf-8'], ['review.css', 'text/css; charset=utf-8'],
]);
export function createStudyServer({ upstream = 'http://127.0.0.1:58211' } = {}) {
  const target = new URL(upstream);
  if (target.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(target.hostname)) throw new Error('Only a loopback HTTP upstream is supported');
  const sockets = new Set();
  const diagnostics = { httpErrors: [], websocketErrors: [], upgrades: 0 };
  const upstreamURL = req => { const parsed = new URL(req.url, target); return new URL(parsed.pathname + parsed.search, target); };
  const headersFor = req => ({ ...req.headers, host: target.host, ...(req.headers.origin ? { origin: target.origin } : {}) });
  const server = http.createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname.startsWith('/__study/')) {
      const name = pathname.slice('/__study/'.length) || 'index.html';
      if (name === 'health.json') {
        res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
        return res.end(JSON.stringify({ upstream: target.origin, ...diagnostics }));
      }
      if (!allowed.has(name)) { res.writeHead(404); return res.end('Study file not allowlisted'); }
      try {
        const body = await readFile(resolve(directory, name));
        res.writeHead(200, { 'content-type': allowed.get(name), 'cache-control': 'no-store' });
        return res.end(body);
      } catch (error) { res.writeHead(500); return res.end(error.message); }
    }
    const forward = http.request(upstreamURL(req), { method: req.method, headers: headersFor(req) }, response => {
      res.writeHead(response.statusCode, response.headers);
      response.pipe(res);
    });
    forward.on('error', error => {
      diagnostics.httpErrors.push({ path: req.url, code: error.code });
      if (!res.headersSent) res.writeHead(502);
      res.end('Local upstream unavailable');
    });
    req.on('aborted', () => forward.destroy());
    req.pipe(forward);
  });
  server.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
  server.on('upgrade', (req, socket, head) => {
    const forward = http.request(upstreamURL(req), { headers: headersFor(req) });
    forward.on('upgrade', (response, peer, peerHead) => {
      diagnostics.upgrades++;
      let raw = `HTTP/${response.httpVersion} ${response.statusCode} ${response.statusMessage}\r\n`;
      for (let i = 0; i < response.rawHeaders.length; i += 2) raw += `${response.rawHeaders[i]}: ${response.rawHeaders[i + 1]}\r\n`;
      socket.write(raw + '\r\n');
      if (peerHead.length) socket.write(peerHead);
      if (head.length) peer.write(head);
      socket.pipe(peer).pipe(socket);
      peer.on('error', error => { if (error.code !== 'ECONNRESET') diagnostics.websocketErrors.push({ code: error.code }); socket.destroy(); });
      socket.on('error', () => peer.destroy());
      socket.on('close', () => peer.destroy());
      peer.on('close', () => socket.destroy());
    });
    forward.on('response', response => {
      diagnostics.websocketErrors.push({ status: response.statusCode, path: req.url });
      socket.end(`HTTP/1.1 ${response.statusCode} Upgrade failed\r\nConnection: close\r\n\r\n`);
    });
    forward.on('error', error => { diagnostics.websocketErrors.push({ code: error.code }); socket.destroy(); });
    forward.end();
  });
  return { server, diagnostics, close: () => new Promise(resolveClose => { for (const socket of sockets) socket.destroy(); server.close(resolveClose); }) };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const portArg = process.argv.find(value => value.startsWith('--port='));
  const port = portArg ? Number(portArg.slice(7)) : 0;
  const owned = createStudyServer();
  owned.server.listen(port, '127.0.0.1', () => console.log(`READY http://127.0.0.1:${owned.server.address().port}/__study/`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await owned.close(); process.exit(0); });
}
