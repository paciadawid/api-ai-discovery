#!/usr/bin/env node
// Local Swagger UI for the generated OpenAPI file, with a same-origin proxy to the target
// so "Try it out" works despite CORS and cookie rules.
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join, normalize } from 'node:path';
import YAML from 'yaml';
import { DEFAULT_BASE_URL, parseArgs } from './lib/discovery.mjs';

const args = parseArgs(process.argv.slice(2));
const specPath = args.spec ?? 'exports/openapi/openapi.yaml';
const port = Number(args.port ?? process.env.PORT ?? 3000);
const target = new URL(args.target ?? process.env.BASE_URL ?? DEFAULT_BASE_URL);

if (!existsSync(specPath)) {
  console.error(`OpenAPI file not found: ${specPath}\nRun: npm run export:openapi`);
  process.exit(1);
}

const uiDir = createRequire(import.meta.url)('swagger-ui-dist').getAbsoluteFSPath();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.map': 'application/json', '.json': 'application/json' };

const THEME = `
body { margin: 0; background: #f4f6fa; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif; }
.swagger-ui { font-family: inherit; }
.swagger-ui .wrapper { max-width: 1100px; padding: 0 24px; }
.swagger-ui .information-container { background: #1f2a44; border-radius: 12px; margin: 24px auto; max-width: 1052px; box-sizing: border-box; padding: 8px 28px 20px; }
.swagger-ui .info { margin: 20px 0 0; }
.swagger-ui .info .title, .swagger-ui .info .title small, .swagger-ui .info .base-url, .swagger-ui .info h2, .swagger-ui .info h3 { color: #fff; }
.swagger-ui .info .title { font-size: 30px; }
.swagger-ui .info .title small.version-stamp { background: #4f7cff; }
.swagger-ui .info .description, .swagger-ui .info .description p, .swagger-ui .info li, .swagger-ui .info a { color: #d5ddf0; }
.swagger-ui .info details { margin-top: 12px; background: rgba(255,255,255,.07); border-radius: 8px; padding: 10px 16px; }
.swagger-ui .info summary { cursor: pointer; color: #fff; }
.swagger-ui .info code { background: rgba(255,255,255,.12); color: #fff; padding: 1px 5px; border-radius: 4px; }
.swagger-ui .info table td, .swagger-ui .info table th { color: #d5ddf0; border-color: rgba(255,255,255,.2); }
.swagger-ui .scheme-container { background: transparent; box-shadow: none; padding: 0 0 12px; }
.swagger-ui .filter-container .operation-filter-input { border-radius: 8px; border: 1px solid #cbd3e3; padding: 8px 12px; }
.swagger-ui .opblock-tag { font-size: 20px; border-bottom: 1px solid #dde3ef; }
.swagger-ui .opblock { border-radius: 10px; border-width: 1px; box-shadow: 0 1px 2px rgba(20,30,60,.06); margin: 0 0 10px; background: #fff; }
.swagger-ui .opblock .opblock-summary { padding: 6px 10px; }
.swagger-ui .opblock .opblock-summary-method { border-radius: 6px; min-width: 70px; font-size: 13px; }
.swagger-ui .opblock .opblock-summary-path { font-weight: 600; }
.swagger-ui .opblock .opblock-summary-description { color: #5b6783; }
.swagger-ui .opblock.opblock-get { background: #f5f9ff; border-color: #61affe; }
.swagger-ui .opblock.opblock-post { background: #f3fbf7; border-color: #49cc90; }
.swagger-ui .opblock.opblock-put { background: #fffaf2; border-color: #fca130; }
.swagger-ui .opblock.opblock-delete { background: #fff5f5; border-color: #f93e3e; }
.swagger-ui .btn { border-radius: 6px; }
.swagger-ui .btn.execute { background: #4f7cff; border-color: #4f7cff; }
.swagger-ui textarea, .swagger-ui input[type=text] { border-radius: 6px; }
`;

const INDEX = `<!doctype html>
<html><head><meta charset="utf-8"><title>Bearstore API</title>
<link rel="stylesheet" href="/ui/swagger-ui.css">
<style>${THEME}</style></head>
<body><div id="swagger-ui"></div>
<script src="/ui/swagger-ui-bundle.js"></script>
<script>
SwaggerUIBundle({
  url: '/openapi.yaml', dom_id: '#swagger-ui', deepLinking: true,
  tagsSorter: 'alpha', docExpansion: 'list', defaultModelsExpandDepth: -1,
  displayRequestDuration: true, filter: true, tryItOutEnabled: true, syntaxHighlight: { theme: 'monokai' },
});
</script></body></html>`;

const loadSpec = () => {
  const doc = YAML.parse(readFileSync(specPath, 'utf8'));
  doc.servers = [{ url: '/proxy', description: `Local proxy to ${target.origin}` }];
  doc.components ??= {};
  doc.info.description = String(doc.info.description ?? '').replace(/No login is required[^\n]*/, 'Click **Authorize** and log in with a customer email and password (not persisted: re-enter it after a page reload); calls then act on that logged-in customer\'s cart.');
  doc.components.securitySchemes = {
    loggedInUser: {
      type: 'http',
      scheme: 'basic',
      description: `Log in as a ${target.host} customer: enter the account email as Username and its password. The proxy performs POST /login, keeps the SMARTSTORE.AUTH cookie in memory only and sends it with every call, so requests act on that customer's own cart and account (the same cart you see when logged in with that account in the browser).`,
    },
    browserCookie: {
      type: 'apiKey',
      in: 'header',
      name: 'X-Browser-Cookie',
      description: `Alternative: reuse an already logged-in browser session. DevTools > Application > Cookies > copy SMARTSTORE.AUTH and SMARTSTORE.VISITOR and paste as: SMARTSTORE.AUTH=<value>; SMARTSTORE.VISITOR=<value>. Sent as the Cookie header as is.`,
    },
  };
  const security = [{ loggedInUser: [] }, { browserCookie: [] }];
  doc.security = security;
  for (const item of Object.values(doc.paths ?? {})) {
    for (const op of Object.values(item)) if (op && typeof op === 'object' && !Array.isArray(op)) op.security = security;
  }
  return YAML.stringify(doc, { lineWidth: 0 });
};

const HOP = new Set(['host', 'connection', 'accept-encoding', 'content-length', 'origin', 'referer', 'cookie', 'x-browser-cookie', 'authorization']);

const sessions = new Map();
const SESSION_TTL_MS = 20 * 60 * 1000;

class LoginError extends Error {}

async function loginCookie(email, password, userAgent) {
  const key = `${email}\0${password}`;
  const hit = sessions.get(key);
  if (hit && Date.now() - hit.at < SESSION_TTL_MS) return hit.cookie;
  const res = await fetch(new URL('/login?returnUrl=%2F', target), {
    method: 'POST',
    redirect: 'manual',
    headers: { host: target.host, 'content-type': 'application/x-www-form-urlencoded', 'user-agent': userAgent ?? 'bearstore-swagger-proxy' },
    body: new URLSearchParams({ UsernameOrEmail: email, Password: password, RememberMe: 'false' }),
  });
  const jar = {};
  for (const c of res.headers.getSetCookie()) {
    const [pair] = c.split(';');
    const i = pair.indexOf('=');
    if (i > 0 && pair.slice(i + 1)) jar[pair.slice(0, i)] = pair.slice(i + 1);
  }
  if (res.status !== 302 || !jar['SMARTSTORE.AUTH']) throw new LoginError('Login was unsuccessful: check the email and password in Authorize.');
  const cookie = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
  sessions.set(key, { cookie, at: Date.now() });
  return cookie;
}

async function proxy(req, res) {
  const url = new URL(req.url.slice('/proxy'.length) || '/', target);
  const headers = { host: target.host };
  for (const [k, v] of Object.entries(req.headers)) if (!HOP.has(k)) headers[k] = v;
  const basic = /^Basic\s+(.+)$/i.exec(req.headers.authorization ?? '');
  if (basic) {
    const creds = Buffer.from(basic[1], 'base64').toString('utf8');
    const i = creds.indexOf(':');
    headers.cookie = await loginCookie(creds.slice(0, i), creds.slice(i + 1), req.headers['user-agent']);
  } else if (req.headers['x-browser-cookie']) headers.cookie = req.headers['x-browser-cookie'];
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const upstream = await fetch(url, { method: req.method, headers, body, redirect: 'manual' });

  const out = {};
  for (const [k, v] of upstream.headers) {
    if (['set-cookie', 'content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(k)) continue;
    out[k] = k === 'location' ? rewriteLocation(v) : v;
  }
  res.writeHead(upstream.status, out);
  res.end(Buffer.from(await upstream.arrayBuffer()));
}

function rewriteLocation(loc) {
  try {
    const u = new URL(loc, target);
    if (u.origin === target.origin) return `/proxy${u.pathname}${u.search}${u.hash}`;
  } catch { /* leave as is */ }
  return loc;
}

createServer(async (req, res) => {
  try {
    if (req.url === '/' || req.url === '/index.html') return res.writeHead(200, { 'content-type': 'text/html' }).end(INDEX);
    if (req.url === '/openapi.yaml') return res.writeHead(200, { 'content-type': 'text/yaml' }).end(loadSpec());
    if (req.url.startsWith('/proxy')) return await proxy(req, res);
    if (req.url.startsWith('/ui/')) {
      const file = normalize(join(uiDir, req.url.slice('/ui/'.length).split('?')[0]));
      if (file.startsWith(uiDir) && existsSync(file) && statSync(file).isFile()) {
        res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
        return createReadStream(file).pipe(res);
      }
    }
    res.writeHead(404).end('Not found');
  } catch (err) {
    const status = err instanceof LoginError ? 401 : 502;
    res.writeHead(status, { 'content-type': 'text/plain' }).end(status === 401 ? err.message : `Proxy error: ${err.message}`);
  }
}).listen(port, () => {
  console.log(`Swagger UI:  http://localhost:${port}`);
  console.log(`Spec:        ${specPath} (re-read on every page load)`);
  console.log(`Proxying to: ${target.origin} via /proxy`);
});
