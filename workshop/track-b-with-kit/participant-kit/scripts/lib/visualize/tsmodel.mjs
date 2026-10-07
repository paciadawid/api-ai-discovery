// Extracts classes (methods, params, step labels, section comments) and call tables from actor and API source files.
import { callArgs, matchClose, readString, stripComments } from './ts-scan.mjs';

const SECTION = /^[ \t]*\/\/\s*(given|when|then|housekeeping)\b/gim;

/** Classes of a source file: [{ name, methods: [{ name, params, body, section, step, apiCalls, selfCalls }] }]. */
export function parseClasses(rawSrc) {
  const src = stripComments(rawSrc);
  const markers = [...rawSrc.matchAll(SECTION)].map((m) => ({ pos: m.index, kind: m[1].toLowerCase() }));
  const classes = [];
  for (const cm of src.matchAll(/\bclass\s+(\w+)[^{]*\{/g)) {
    const open = cm.index + cm[0].length - 1;
    const close = matchClose(src, open);
    if (close < 0) continue;
    classes.push({ name: cm[1], methods: classMethods(src, open + 1, close, markers) });
  }
  return classes;
}

function classMethods(src, from, to, markers) {
  const methods = [];
  const header = /(?:(?:public|private|protected|static|readonly|async|override)\s+)*(\w+)\s*(?:<[^>(]*>)?\s*\(/y;
  for (let i = from; i < to; i++) {
    const prev = src[i - 1] ?? ' ';
    if (/[([{]/.test(src[i])) { const e = matchClose(src, i); i = e < 0 ? to : e; continue; }
    if (!/[A-Za-z_]/.test(src[i]) || /\w/.test(prev)) continue;
    header.lastIndex = i;
    const m = header.exec(src);
    if (!m || m.index !== i || ['if', 'for', 'while', 'switch', 'constructor', 'catch'].includes(m[1])) continue;
    const openParen = i + m[0].length - 1;
    const closeParen = matchClose(src, openParen);
    if (closeParen < 0) continue;
    let j = closeParen + 1;
    while (j < to && src[j] !== '{' && src[j] !== ';') { if (/[([]/.test(src[j])) j = matchClose(src, j); j++; }
    if (src[j] !== '{') { i = j; continue; }
    const end = matchClose(src, j);
    if (end < 0) break;
    const body = src.slice(j + 1, end);
    methods.push({
      name: m[1], params: parseParams(src.slice(openParen + 1, closeParen)), body, section: [...markers].reverse().find((k) => k.pos < i)?.kind ?? null,
      step: stepLabel(body), apiCalls: [...body.matchAll(/this\.\w+\.(?:(\w+)\.)?(\w+)\s*\(/g)].map((x) => ({ via: x[1] ?? '', name: x[2] })), selfCalls: [...body.matchAll(/this\.(\w+)\s*\(/g)].map((x) => x[1]),
      http: httpCall(body),
    });
    i = end;
  }
  return methods;
}

/** [{ name, def }] from the text of a parameter list. */
export function parseParams(text) {
  const flat = (s) => { let p; do { p = s; s = s.replace(/<[^<>]*>/g, ''); } while (s !== p); return s; };
  return flat(text).split(/,(?![^(){}\[\]]*[)}\]])/).map((p) => p.trim()).filter(Boolean).map((p) => {
    const name = /^(?:(?:readonly|private|public)\s+)*(\w+)/.exec(p)?.[1];
    const eq = p.search(/=(?!>)/);
    return name ? { name, def: eq >= 0 ? p.slice(eq + 1).trim() : null } : null;
  }).filter(Boolean);
}

function stepLabel(body) {
  const i = body.search(/\btest\.step\s*\(/);
  if (i < 0) return null;
  const { args } = callArgs(body, body.indexOf('(', i));
  return args[0] ? readString(args[0].text) : null;
}

/** The first http call of an API method: { verb, path } with `${x}` turned into `{x}`. */
function httpCall(body) {
  const m = /this\.\w+\.(get|post\w*|put\w*|delete\w*|patch\w*)\s*\(/i.exec(body);
  if (!m) return null;
  const { args } = callArgs(body, m.index + m[0].length - 1);
  const path = args[0] ? readString(args[0].text) : null;
  if (path == null) return null;
  const verb = /^post/i.test(m[1]) ? 'POST' : /^put/i.test(m[1]) ? 'PUT' : /^delete/i.test(m[1]) ? 'DELETE' : /^patch/i.test(m[1]) ? 'PATCH' : 'GET';
  return { verb, path: fillTemplate(path, (e) => (/^[\w.]+$/.test(e) ? `{${e.split('.').pop()}}` : '{…}')) };
}

/** Constants of the domain files: `NAME.key` -> 'string value' and numeric constants. */
export function parseConstants(rawSrc, table = {}) {
  const src = stripComments(rawSrc);
  for (const m of src.matchAll(/export\s+const\s+(\w+)\s*(?::[^=]+)?=\s*/g)) {
    const at = m.index + m[0].length;
    if (src[at] === '{') {
      const close = matchClose(src, at);
      const obj = (table[m[1]] = {});
      for (const kv of src.slice(at + 1, close).matchAll(/(\w+)\s*:\s*(?:(['"`])((?:\\.|(?!\2).)*)\2|(-?\d+(?:\.\d+)?))\s*[,}\n]/g)) obj[kv[1]] = kv[3] !== undefined ? kv[3] : kv[4];
    } else {
      const n = /^(-?\d+(?:\.\d+)?)\s*[;\n]/.exec(src.slice(at));
      if (n) table[m[1]] = n[1];
    }
  }
  return table;
}

/** Evaluate a tiny expression (literal, constant, NAME.key, NAME + 1) against the constant table; null when not possible. */
export function evalSimple(expr, table) {
  const e = expr.trim();
  if (/^-?\d+(\.\d+)?$/.test(e)) return e;
  const s = readString(e);
  if (s != null) return s;
  const dot = /^(\w+)\.(\w+)$/.exec(e);
  if (dot && table[dot[1]] && typeof table[dot[1]] === 'object' && dot[2] in table[dot[1]]) return String(table[dot[1]][dot[2]]);
  if (/^\w+$/.test(e) && typeof table[e] === 'string') return table[e];
  const sum = /^(\w+)\s*([+-])\s*(\d+)$/.exec(e);
  if (sum && typeof table[sum[1]] === 'string' && /^\d/.test(table[sum[1]])) return String(Number(table[sum[1]]) + (sum[2] === '+' ? 1 : -1) * Number(sum[3]));
  return null;
}

/** Replace each `${expr}` (nesting-aware) of a template string with resolve(expr). */
export function fillTemplate(text, resolve) {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '$' && text[i + 1] === '{') {
      const close = matchClose(text, i + 1);
      if (close > 0) { out += resolve(text.slice(i + 2, close).trim()); i = close; continue; }
    }
    out += text[i];
  }
  return out;
}
