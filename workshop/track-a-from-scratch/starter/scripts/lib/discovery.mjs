import { existsSync, readFileSync } from 'node:fs';

export const DEFAULT_INPUT = 'qa/01-discovery/endpoints.json';
export const DEFAULT_BASE_URL = 'https://bearstore-testsite.smartbear.com';

export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const [k, inline] = a.slice(2).split('=');
    args[k] = inline ?? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true);
  }
  return args;
}

// Discoverers sometimes record fields as prose, e.g. "CountryId (1=US, 2=Canada)" or "go=go".
const parseFieldText = (text) => {
  const m = text.trim().match(/^([\w.[\]{}-]+)(?:=([^(]*?))?\s*(?:\((.*)\))?$/);
  if (!m) return null;
  const field = { name: m[1] };
  if (m[2]) field.example = m[2].trim();
  if (m[3]) field.description = m[3].trim();
  return field;
};

const asFields = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) {
    return v
      .map((f) => (typeof f === 'string' ? parseFieldText(f) : { ...f }))
      .filter(Boolean);
  }
  if (typeof v === 'object') return Object.entries(v).map(([name, example]) => ({ name, example }));
  return [];
};

const areaFromId = (id = '') => (id.match(/^EP-([A-Z0-9]+)-/i)?.[1] ?? 'GENERAL').toUpperCase();

export function normalizeEndpoint(raw) {
  const [pathOnly, inlineQuery] = String(raw.path ?? '/').split('?');
  const query = asFields(raw.query);
  if (inlineQuery) {
    for (const pair of inlineQuery.split('&')) {
      const [name, example] = pair.split('=');
      if (name && !query.some((q) => q.name === name)) query.push({ name, example });
    }
  }
  const area = (Array.isArray(raw.areas) ? raw.areas[0] : raw.area ?? areaFromId(raw.id)).toString().toUpperCase();
  const success = raw.success ?? {};
  const failure = raw.failure ?? {};
  return {
    id: raw.id ?? `${raw.method}-${pathOnly}`,
    area,
    purpose: raw.purpose ?? raw.summary ?? raw.description ?? '',
    method: String(raw.method ?? 'GET').toUpperCase(),
    path: pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`,
    query,
    contentType: raw.contentType ?? null,
    bodyFields: asFields(raw.bodyFields),
    pathParams: asFields(raw.pathParams),
    authRequired: Boolean(raw.authRequired),
    stateChanging: Boolean(raw.stateChanging),
    verified: raw.verified === true,
    success: {
      status: success.status || null,
      location: success.location ?? null,
      setCookies: [].concat(success.setCookies ?? []).filter(Boolean),
      bodySignal: success.bodySignal ?? null,
    },
    failure: { status: failure.status || null, bodySignal: failure.bodySignal ?? null },
  };
}

export function loadEndpoints(input = DEFAULT_INPUT) {
  if (!existsSync(input)) {
    throw new Error(
      `Discovery file not found: ${input}\nRun the discovery stage first (/qa-cycle) or pass --input <path to endpoints.json>.`,
    );
  }
  const data = JSON.parse(readFileSync(input, 'utf8'));
  const list = Array.isArray(data) ? data : data.endpoints;
  if (!Array.isArray(list) || list.length === 0) throw new Error(`No endpoints found in ${input}`);
  return list.map(normalizeEndpoint);
}

export function loadText(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

export const AREA_ORDER = ['AUTH'];
export const sortAreas = (areas) =>
  [...areas].sort((a, b) => {
    const ia = AREA_ORDER.indexOf(a), ib = AREA_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return a.localeCompare(b);
  });

export const pathParams = (path) => [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);

export const isRedirect = (status) => status >= 300 && status < 400;

const SECRET_FIELD = /pass(word)?|secret|token/i;
export const isSecretField = (name) => SECRET_FIELD.test(name);

/** Variable name for a body field value, e.g. UsernameOrEmail -> email, Password -> password. */
export function variableFor(field) {
  if (/pass/i.test(field.name)) return 'password';
  if (/email|username/i.test(field.name)) return 'email';
  return null;
}

export function loginCookieName(endpoints) {
  const login = endpoints.find((e) => /login|signin/i.test(e.id) || /login|signin/i.test(e.path));
  const candidates = [...(login?.success.setCookies ?? []), ...endpoints.flatMap((e) => e.success.setCookies)];
  const names = candidates.map((c) => String(c).split('=')[0].trim());
  return names.find((n) => /auth|session/i.test(n)) ?? null;
}
