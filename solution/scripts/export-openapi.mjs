#!/usr/bin/env node
// Converts qa/01-discovery/endpoints.json into an OpenAPI 3.0 document (YAML).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import YAML from 'yaml';
import {
  DEFAULT_BASE_URL, DEFAULT_INPUT, isRedirect, isSecretField, loadEndpoints, loadText, loginCookieName, parseArgs, pathParams, sortAreas, variableFor,
} from './lib/discovery.mjs';

const args = parseArgs(process.argv.slice(2));
const input = args.input ?? DEFAULT_INPUT;
const out = args.out ?? 'exports/openapi/openapi.yaml';
const baseUrl = args['base-url'] ?? process.env.BASE_URL ?? DEFAULT_BASE_URL;
const title = args.title ?? 'Bearstore API (discovered)';

const endpoints = loadEndpoints(input);
const cookieName = loginCookieName(endpoints);

const schemaFor = (f) => {
  const s = { type: 'string' };
  if (f.description) s.description = f.description;
  if (f.example !== undefined && f.example !== null && !isSecretField(f.name)) s.example = f.example;
  if (isSecretField(f.name)) s.format = 'password';
  if (/^(true|false)$/i.test(String(f.example))) { s.type = 'boolean'; s.example = String(f.example).toLowerCase() === 'true'; }
  else if (f.example !== undefined && /^-?\d+$/.test(String(f.example))) { s.type = 'integer'; s.example = Number(f.example); }
  return s;
};

const exampleFor = (f) => {
  const v = variableFor(f);
  if (v === 'email') return 'user@example.com';
  if (v === 'password') return undefined;
  return f.example;
};

const operationFor = (e) => {
  const op = {
    tags: [e.area],
    operationId: e.id,
    summary: e.purpose || `${e.method} ${e.path}`,
    description: [
      e.purpose,
      e.stateChanging ? '**Changes server state.**' : '',
      e.verified ? 'Verified by replaying the request.' : '**Not verified by replay** (observed in the browser only).',
    ].filter(Boolean).join('\n\n'),
    'x-endpoint-id': e.id,
    'x-verified': e.verified,
    'x-state-changing': e.stateChanging,
    responses: {},
  };
  const parameters = [
    ...pathParams(e.path).map((name) => {
      const meta = (e.pathParams ?? []).find((p) => p.name === name);
      return { name, in: 'path', required: true, ...(meta?.description ? { description: meta.description } : {}), schema: { type: 'string', ...(meta?.example !== undefined ? { example: String(meta.example) } : {}) } };
    }),
    ...e.query.map((q) => ({ name: q.name, in: 'query', required: q.required === true, description: q.description, schema: schemaFor(q) })),
  ];
  if (parameters.length) op.parameters = parameters;
  if (e.bodyFields.length && !['GET', 'HEAD'].includes(e.method)) {
    const properties = {};
    const fieldName = (n) => n.replace(/\{(\w+)\}/g, (m, p) => (e.pathParams ?? []).find((x) => x.name === p)?.example ?? m);
    for (const f of e.bodyFields) {
      const name = fieldName(f.name);
      properties[name] = schemaFor({ ...f, name, example: exampleFor(f) });
      if (name !== f.name) properties[name].description = `${properties[name].description ?? ''} The ${f.name.match(/\{\w+\}/)[0]} part of the name is the product id, here ${name.match(/_(\w+)\./)?.[1] ?? 'the example value'}; change it to match the path parameter.`.trim();
      if (properties[name].example === undefined) delete properties[name].example;
    }
    const required = e.bodyFields.filter((f) => f.required).map((f) => fieldName(f.name));
    op.requestBody = {
      required: true,
      content: { [(e.contentType ?? 'application/x-www-form-urlencoded').split(';')[0].trim()]: { schema: { type: 'object', properties, ...(required.length ? { required } : {}) } } },
    };
  }
  const { status, location, setCookies, bodySignal } = e.success;
  if (status) {
    const headers = {};
    if (location) headers.Location = { description: `Redirect target (observed: ${location})`, schema: { type: 'string', example: location } };
    if (setCookies.length) headers['Set-Cookie'] = { description: `Sets: ${setCookies.map((c) => String(c).split('=')[0]).join(', ')}`, schema: { type: 'string' } };
    op.responses[String(status)] = {
      description: `Success${bodySignal ? ` - body contains "${bodySignal}"` : ''}`,
      ...(Object.keys(headers).length ? { headers } : {}),
      ...(isRedirect(Number(status)) ? {} : { content: { 'text/html': { schema: { type: 'string' } } } }),
    };
  }
  if (e.failure.status && String(e.failure.status) !== String(status)) {
    op.responses[String(e.failure.status)] = {
      description: `Failure${e.failure.bodySignal ? ` - body contains "${e.failure.bodySignal}"` : ''}`,
      content: { 'text/html': { schema: { type: 'string' } } },
    };
  } else if (e.failure.status && e.failure.bodySignal) {
    op.responses[String(status)].description += `; failure shows "${e.failure.bodySignal}" with the same status`;
  }
  if (!Object.keys(op.responses).length) op.responses.default = { description: 'Not observed during discovery' };
  op.security = e.authRequired && cookieName ? [{ cookieAuth: [] }] : [];
  return op;
};

const paths = {};
const merged = [];

// OpenAPI allows one operation per method+path; actions that share a URL (form buttons) become variants of one operation.
function mergeVariant(base, op, e) {
  base['x-variants'] = [...(base['x-variants'] ?? []), { id: e.id, summary: op.summary, 'x-verified': e.verified }];
  base.description += `\n\n**Variant ${e.id}:** ${op.summary}${e.verified ? '' : ' (not verified by replay)'}`;
  const props = base.requestBody?.content && Object.values(base.requestBody.content)[0]?.schema.properties;
  const more = op.requestBody && Object.values(op.requestBody.content)[0]?.schema.properties;
  if (more) {
    if (props) for (const [k, v] of Object.entries(more)) props[k] ??= v;
    else base.requestBody = op.requestBody;
  }
  for (const [code, res] of Object.entries(op.responses)) base.responses[code] ??= res;
  base['x-verified'] = base['x-verified'] && e.verified;
  base['x-state-changing'] = base['x-state-changing'] || e.stateChanging;
}
for (const e of endpoints) {
  const item = (paths[e.path] ??= {});
  const method = e.method.toLowerCase();
  const op = operationFor(e);
  if (!item[method]) { item[method] = op; continue; }
  merged.push(`${e.id} merged into ${item[method]['x-endpoint-id']} (${e.method} ${e.path})`);
  mergeVariant(item[method], op, e);
}

const areas = sortAreas([...new Set(endpoints.map((e) => e.area))]);
const authNote = loadText(join(dirname(input), 'auth.md')).trim();
const doc = {
  openapi: '3.0.3',
  info: {
    title,
    version: '0.1.0',
    description: [
      `Reverse-engineered from the storefront traffic during QA discovery (\`${dirname(input)}\`). The site has no official API; many endpoints are form posts that return redirects or server-rendered HTML.`,
      endpoints.some((e) => e.authRequired) && cookieName
        ? `Authentication is a session cookie (\`${cookieName}\`). Call the login operation first; the browser then sends the cookie automatically.`
        : 'No login is required for these endpoints; a guest session cookie is created on the first request and sent automatically.',
      authNote ? `<details><summary><b>Auth and session notes</b></summary>\n\n${authNote}\n\n</details>` : '',
    ].filter(Boolean).join('\n\n'),
  },
  servers: [{ url: baseUrl }],
  tags: areas.map((name) => ({ name })),
  paths,
  ...(cookieName && endpoints.some((e) => e.authRequired) ? { components: { securitySchemes: { cookieAuth: { type: 'apiKey', in: 'cookie', name: cookieName } } } } : {}),
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, YAML.stringify(doc, { lineWidth: 0 }));
console.log(`OpenAPI document: ${out}`);
console.log(`${Object.values(paths).reduce((n, p) => n + Object.keys(p).length, 0)} operations across ${Object.keys(paths).length} paths in ${areas.length} tags.`);
if (merged.length) console.log(`Merged variants sharing a URL:\n  ${merged.join('\n  ')}`);
console.log('Run it locally with: npm run swagger');
