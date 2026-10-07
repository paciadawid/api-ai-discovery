// Reads Playwright spec files: tests (title, options, body), their describe path and beforeEach hooks, and the project that runs a spec.
import { callArgs, readString, stripComments } from './ts-scan.mjs';

/** Parameter names of an arrow function's parameter text, including destructured ones. */
export function paramNames(text) {
  const t = text.replace(/^\s*async\s*/, '').trim().replace(/^\(|\)$/g, '');
  const inner = /^\{([\s\S]*)\}$/.exec(t.trim());
  const list = (inner ? inner[1] : t).split(',').map((s) => /^\s*(\w+)/.exec(s)?.[1]).filter(Boolean);
  return list;
}

function fnParts(text) {
  const arrow = text.indexOf('=>');
  if (arrow < 0) return null;
  const rest = text.slice(arrow + 2).trim();
  const body = rest.startsWith('{') ? rest.slice(1, rest.lastIndexOf('}')) : rest;
  return { params: paramNames(text.slice(0, arrow)), body };
}

const lineOf = (src, pos) => src.slice(0, pos).split('\n').length;

/** { tests: [{ title, line, options, params, body, describes, hooks }] } of one spec source. */
export function parseSpec(rawSrc) {
  const src = stripComments(rawSrc);
  const describes = [];
  const hooks = [];
  const found = [];
  for (const m of src.matchAll(/\btest(?:\.(describe(?:\.\w+)?|beforeEach|only|skip|fixme))?\s*\(/g)) {
    const kind = m[1] ?? 'test';
    const { args, close } = callArgs(src, m.index + m[0].length - 1);
    if (close < 0 || !args.length) continue;
    const open = m.index + m[0].length - 1;
    if (kind.startsWith('describe')) {
      const title = readString(args[0].text);
      if (title != null) describes.push({ title, start: open, end: close });
    } else if (kind === 'beforeEach') {
      const fn = fnParts(args[args.length - 1].text);
      if (fn) hooks.push({ pos: m.index, ...fn });
    } else {
      const title = readString(args[0].text);
      const fn = fnParts(args[args.length - 1].text);
      if (title != null && fn) found.push({ title, pos: m.index, line: lineOf(src, m.index), options: args.length > 2 ? args[1].text : '', ...fn });
    }
  }
  const enclosing = (pos) => describes.filter((d) => d.start < pos && pos < d.end).sort((a, b) => a.start - b.start);
  const tests = found.map((t) => {
    const mine = enclosing(t.pos);
    return {
      ...t, describes: mine.map((d) => d.title),
      hooks: hooks.filter((h) => { const hd = enclosing(h.pos); return hd.every((d) => mine.includes(d)); }).sort((a, b) => a.pos - b.pos),
    };
  });
  return { tests };
}

/** Tag strings and annotations from a test's options object text and its title. */
export function optionsOf(optionsText, title) {
  const tags = new Set([...title.matchAll(/@[\w-]+/g)].map((m) => m[0]));
  const tagM = /\btag\s*:\s*(\[[^\]]*\]|'[^']*'|"[^"]*")/.exec(optionsText);
  if (tagM) for (const s of tagM[1].matchAll(/['"]([^'"]+)['"]/g)) tags.add(s[1]);
  const annotations = [...optionsText.matchAll(/type\s*:\s*(['"`])(.*?)\1\s*,\s*description\s*:\s*(['"`])(.*?)\3/gs)].map((m) => ({ type: m[2], description: m[4] }));
  return { tags: [...tags], annotations };
}

const globRe = (g) => new RegExp('^(?:.*/)?' + g.replace(/^\.\//, '').replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*\/?/g, '\u0001').replace(/\*/g, '[^/]*').replace(/\u0001/g, '(?:.*/)?') + '$');

/** Projects of playwright.config.ts: [{ name, match: [globs], ignore: [globs] }]. */
export function parseProjects(rawConfig) {
  const src = stripComments(rawConfig);
  const at = src.search(/\bprojects\s*:\s*\[/);
  if (at < 0) return [];
  const open = src.indexOf('[', at);
  const list = [];
  const arrayBody = src.slice(open + 1);
  for (let i = 0, depth = 0, from = -1; i < arrayBody.length; i++) {
    const c = arrayBody[i];
    if (c === '{') { if (depth === 0) from = i; depth++; }
    else if (c === '}') { depth--; if (depth === 0 && from >= 0) { list.push(arrayBody.slice(from, i + 1)); from = -1; } }
    else if (c === ']' && depth === 0) break;
  }
  const strings = (txt, key) => {
    const m = new RegExp(`\\b${key}\\s*:\\s*(\\[[^\\]]*\\]|'[^']*'|"[^"]*")`).exec(txt);
    return m ? [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]) : [];
  };
  return list.map((t) => ({ name: /\bname\s*:\s*['"]([^'"]+)['"]/.exec(t)?.[1] ?? '?', match: strings(t, 'testMatch'), ignore: strings(t, 'testIgnore') }));
}

/** Names of the projects that run a spec (path relative to the test dir, e.g. `cart/known-issues.api.spec.ts`). */
export function projectsFor(specRel, projects) {
  return projects.filter((p) => (!p.match.length || p.match.some((g) => globRe(g).test(specRel))) && !p.ignore.some((g) => globRe(g).test(specRel))).map((p) => p.name);
}
