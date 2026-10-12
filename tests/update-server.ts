// Test-only fixture server; never bundled or used by the application.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve } from 'node:path';
const root = resolve('dist');
const mime: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};
for (const port of [4191, 4192, 4193]) {
  let updated = false;
  createServer(async (req, res) => {
    const pathname = new URL(req.url ?? '/', `http://127.0.0.1:${port}`)
      .pathname;
    if (pathname === '/__test/update') {
      updated = true;
      res.end('updated');
      return;
    }
    if (pathname === '/__test/reset') {
      updated = false;
      res.end('reset');
      return;
    }
    if (pathname === '/__test/status') {
      res.end('ready');
      return;
    }
    if (pathname === '/__test/history') {
      res.setHeader('Content-Type', 'text/html');
      res.end(
        '<!doctype html><title>History destination</title><h1>History destination</h1>',
      );
      return;
    }
    const path = resolve(
      root,
      '.' + (pathname === '/' ? '/index.html' : pathname),
    );
    const withinRoot = relative(root, path);
    if (withinRoot.startsWith('..') || isAbsolute(withinRoot)) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      let content = await readFile(path);
      // Simulate a newly deployed HTML entry while the previous version's
      // worker still controls this client. Files stay fixed; only the online
      // response changes, as it would at GitHub Pages after deployment.
      if (updated && (pathname === '/' || pathname === '/index.html')) {
        content = Buffer.from(
          content.toString().replace('<body>', '<body data-test-deployment="updated">'),
        );
      }
      if (pathname === '/sw.js')
        content = Buffer.from(
          content
            .toString()
            .replace(
              /const CACHE = PREFIX \+ '[^']+';/,
              `const CACHE = PREFIX + 'test-${port}-${updated ? 'updated' : 'initial'}';`,
            ),
        );
      res.setHeader(
        'Content-Type',
        mime[extname(path)] ?? 'application/octet-stream',
      );
      res.setHeader('Cache-Control', 'no-store');
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('missing');
    }
  }).listen(port, '127.0.0.1');
}
