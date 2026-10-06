#!/usr/bin/env node
// Converts qa/01-discovery/endpoints.json into a Postman Collection v2.1 + environment.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  DEFAULT_BASE_URL, DEFAULT_INPUT, isRedirect, isSecretField, loadEndpoints, loadText, parseArgs, pathParams, sortAreas, variableFor,
} from './lib/discovery.mjs';

const args = parseArgs(process.argv.slice(2));
const input = args.input ?? DEFAULT_INPUT;
const outDir = args.out ?? 'exports/postman';
const baseUrl = args['base-url'] ?? process.env.BASE_URL ?? DEFAULT_BASE_URL;
const name = args.name ?? 'Bearstore API (discovered)';

const endpoints = loadEndpoints(input);

const fieldValue = (f) => {
  const v = variableFor(f);
  if (v) return `{{${v}}}`;
  return f.example !== undefined && f.example !== null ? String(f.example) : '';
};

const bodyFor = (e) => {
  if (!e.bodyFields.length || ['GET', 'HEAD'].includes(e.method)) return undefined;
  const ct = (e.contentType ?? 'application/x-www-form-urlencoded').toLowerCase();
  if (ct.includes('json')) {
    const obj = Object.fromEntries(e.bodyFields.map((f) => [f.name, fieldValue(f)]));
    return { mode: 'raw', raw: JSON.stringify(obj, null, 2), options: { raw: { language: 'json' } } };
  }
  if (ct.includes('multipart')) {
    return { mode: 'formdata', formdata: e.bodyFields.map((f) => ({ key: f.name, value: fieldValue(f), type: 'text' })) };
  }
  return { mode: 'urlencoded', urlencoded: e.bodyFields.map((f) => ({ key: f.name, value: fieldValue(f), type: 'text' })) };
};

const testScript = (e) => {
  const lines = [];
  const { status, location, setCookies, bodySignal } = e.success;
  if (status) lines.push(`pm.test(${JSON.stringify(`${e.id}: status is ${status}`)}, () => pm.response.to.have.status(${status}));`);
  if (location) {
    lines.push(`pm.test("redirects to ${location}", () => pm.expect(pm.response.headers.get("Location") || "").to.include(${JSON.stringify(location)}));`);
  }
  for (const c of setCookies) {
    const cookie = String(c).split('=')[0].trim();
    lines.push(
      `pm.test("sets cookie ${cookie}", () => pm.expect(pm.response.headers.filter(h => h.key.toLowerCase() === "set-cookie").map(h => h.value).join("\\n")).to.include(${JSON.stringify(cookie + '=')}));`,
    );
  }
  if (bodySignal) lines.push(`pm.test("body contains expected signal", () => pm.expect(pm.response.text()).to.include(${JSON.stringify(bodySignal)}));`);
  return lines;
};

const describe = (e) => {
  const parts = [e.purpose || e.id];
  parts.push('', `**Endpoint id:** \`${e.id}\``, `**Auth required:** ${e.authRequired ? 'yes (log in first)' : 'no'}`);
  if (e.stateChanging) parts.push('**Changes server state:** yes');
  parts.push(`**Verified by replay:** ${e.verified ? 'yes' : 'NO (observed in the browser only)'}`);
  if (e.success.status) parts.push('', `**Success:** ${e.success.status}${e.success.location ? ` -> ${e.success.location}` : ''}${e.success.bodySignal ? ` ("${e.success.bodySignal}")` : ''}`);
  if (e.failure.status) parts.push(`**Failure:** ${e.failure.status}${e.failure.bodySignal ? ` ("${e.failure.bodySignal}")` : ''}`);
  return parts.join('\n');
};

const pathVars = new Set();
const toItem = (e) => {
  pathParams(e.path).forEach((p) => pathVars.add(p));
  const asVar = (s) => s.replace(/\{(\w+)\}/g, '{{$1}}');
  const segments = e.path.split('/').filter(Boolean).map(asVar);
  const item = {
    name: `${e.method} ${e.path}${e.purpose ? ` - ${e.purpose}` : ''}`,
    request: {
      method: e.method,
      header: e.contentType && e.bodyFields.length ? [{ key: 'Content-Type', value: e.contentType }] : [],
      url: {
        raw: `{{baseUrl}}${asVar(e.path)}${e.query.length ? '?' + e.query.map((q) => `${q.name}=${q.example ?? ''}`).join('&') : ''}`,
        host: ['{{baseUrl}}'],
        path: segments,
        query: e.query.map((q) => ({ key: q.name, value: String(q.example ?? ''), description: q.description })),
      },
      description: describe(e),
    },
    response: [],
  };
  const body = bodyFor(e);
  if (body) item.request.body = body;
  const exec = testScript(e);
  if (exec.length) item.event = [{ listen: 'test', script: { type: 'text/javascript', exec } }];
  if (isRedirect(Number(e.success.status))) item.protocolProfileBehavior = { followRedirects: false };
  return item;
};

const byArea = Map.groupBy(endpoints, (e) => e.area);
const folders = sortAreas([...byArea.keys()]).map((area) => ({
  name: area,
  item: byArea.get(area).sort((a, b) => Number(a.authRequired) - Number(b.authRequired) || a.path.localeCompare(b.path)).map(toItem),
}));

const authNote = loadText(join(dirname(input), 'auth.md')).trim();
const collection = {
  info: {
    name,
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    description: [
      'Generated from QA discovery (`qa/01-discovery/endpoints.json`). Regenerate with `npm run export:postman`.',
      'Session is cookie based: run the AUTH folder first (Postman keeps cookies between requests), and fill `email` / `password` in the environment.',
      authNote ? `\n---\n${authNote}` : '',
    ].join('\n'),
  },
  variable: [{ key: 'baseUrl', value: baseUrl }, ...[...pathVars].map((key) => ({ key, value: '' }))],
  item: folders,
};

const withSecrets = Boolean(args['with-secrets']);
const environment = {
  id: 'bearstore-env',
  name: `${name} - local`,
  values: [
    { key: 'baseUrl', value: baseUrl, type: 'default', enabled: true },
    { key: 'email', value: withSecrets ? (process.env.BEARSTORE_EMAIL ?? '') : '', type: 'default', enabled: true },
    { key: 'password', value: withSecrets ? (process.env.BEARSTORE_PASSWORD ?? '') : '', type: 'secret', enabled: true },
  ],
  _postman_variable_scope: 'environment',
};

mkdirSync(outDir, { recursive: true });
const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const collectionFile = join(outDir, `${slug}.postman_collection.json`);
const environmentFile = join(outDir, `${slug}.postman_environment.json`);
writeFileSync(collectionFile, JSON.stringify(collection, null, 2) + '\n');
writeFileSync(environmentFile, JSON.stringify(environment, null, 2) + '\n');

const unverified = endpoints.filter((e) => !e.verified).length;
const secretFields = endpoints.flatMap((e) => e.bodyFields).filter((f) => isSecretField(f.name) && !variableFor(f)).length;
console.log(`Postman collection: ${collectionFile}`);
console.log(`Postman environment: ${environmentFile}`);
console.log(`${endpoints.length} requests in ${folders.length} folders (${unverified} unverified).`);
if (!withSecrets) console.log('Fill `email` and `password` in the environment, or re-run with --with-secrets (uses BEARSTORE_EMAIL / BEARSTORE_PASSWORD).');
if (secretFields) console.log(`Warning: ${secretFields} secret-looking body field(s) have no variable mapping; review them.`);
