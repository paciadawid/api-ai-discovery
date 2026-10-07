// Stage 3 (use cases): renders 02-use-cases.md as an area x type matrix, per-type tiles and a collapsible list of use cases.
import { UserError } from '../context.mjs';
import { chip, details, esc, guard, inline, mdBlock, note, parsedTable, section, table, tile, tiles, ul, unreadable } from '../html.mjs';
import { col, findSection, headings, numbers, parseFields, parseList, parseTables, plain } from '../md.mjs';

const FILE = '02-use-cases.md';

/** The use-case blocks of a file: { id, title, unit, type, fields }. Shared with the selected stage (titles). */
export function parseUseCases(text) {
  const { lines, heads } = headings(text);
  const out = [];
  heads.forEach((h, k) => {
    const m = /^(UC-[\w-]*\d+)\s*[:.–—-]?\s*(.*)$/.exec(h.title);
    if (!m) return;
    let end = lines.length;
    for (let j = k + 1; j < heads.length; j++) if (heads[j].level <= h.level) { end = heads[j].line; break; }
    const fields = parseFields(lines.slice(h.line + 1, end).join('\n'));
    const parent = [...heads.slice(0, k)].reverse().find((p) => p.level < h.level);
    const unit = /use cases?:\s*([\w-]+)/i.exec(parent?.title ?? '')?.[1] ?? fields.find((f) => f.key === 'area')?.value ?? '';
    const type = (fields.find((f) => f.key === 'type')?.value ?? '').replace(/[`*]/g, '').trim().toLowerCase();
    out.push({ id: m[1], title: m[2].trim(), unit, type: type || 'untyped', fields });
  });
  return out;
}

export default function render(ctx) {
  const text = ctx.read(FILE);
  if (text == null) throw new UserError(`input not found: ${ctx.rootRel}/${FILE} (the use-case stage has not run, or --root is wrong)`);
  const ucs = parseUseCases(text);
  const fileMatrix = findMatrix(text);
  const computed = computeMatrix(ucs);
  const types = fileMatrix?.types ?? computed.types;

  const perType = types.map((t) => [t, ucs.filter((u) => u.type === t).length]);
  const overview = tiles([tile(ucs.length || '?', 'use cases'), ...perType.map(([t, n]) => tile(n, t)), tile(new Set(ucs.map((u) => u.unit)).size, 'units')]);

  const matrixHtml = guard(`area x type matrix in ${FILE}`, text, () => {
    const m = fileMatrix ?? computed;
    if (!m.rows.length) return '';
    const check = fileMatrix ? crossCheck(fileMatrix, computed, ucs.length) : note('could not read: the overview matrix table in the file; the counts below are computed from the use-case blocks');
    return check + matrixTable(m);
  });

  const list = guard('use-case blocks (### UC-...: title)', text, () => {
    if (!ucs.length) return '';
    const units = [...new Set(ucs.map((u) => u.unit))];
    return units.map((u) => `<h3>${esc(u || 'no unit')} ${chip(`${ucs.filter((x) => x.unit === u).length} use cases`, 'info')}</h3>${ucs.filter((x) => x.unit === u).map(ucCard).join('')}`).join('');
  });

  const gaps = findSection(text, /no use case|partial coverage/i);
  const gapT = gaps && parseTables(gaps.body)[0];
  const more = findSection(text, /needs more discovery/i);
  const conv = findSection(text, /conventions/i);
  const body = [
    overview,
    section('Area x type matrix', matrixHtml),
    section('Use cases', list),
    gapT ? section('Endpoints with no use case (or only partial coverage)', parsedTable(gapT)) : '',
    more ? section('Needs more discovery', mdBlock(more.body)) : '',
    conv ? details('Conventions that apply to every case', mdBlock(conv.body)) : '',
  ].join('\n');
  return { headline: `${ucs.length} use cases: ${perType.filter(([, n]) => n).map(([t, n]) => `${n} ${t}`).join(', ')}`, body };
}

function findMatrix(text) {
  const tbl = parseTables(text).find((t) => col(t, /total/i) >= 0 && t.header.length >= 4 && t.rows.length >= 1 && t.rows.every((r) => r.slice(1).every((c) => /^\**\d+\**$/.test(c.trim()))));
  if (!tbl) return null;
  const totalIdx = col(tbl, /total/i);
  const typeIdx = tbl.header.map((_, i) => i).filter((i) => i > 0 && i !== totalIdx);
  const types = typeIdx.map((i) => plain(tbl.header[i]).toLowerCase());
  const rows = tbl.rows.map((r) => ({ label: plain(r[0]), counts: typeIdx.map((i) => numbers(r[i])[0] ?? 0), total: numbers(r[totalIdx])[0] ?? 0, isTotal: /(^|\s)total$/i.test(plain(r[0])) }));
  return { types, rows };
}

function computeMatrix(ucs) {
  const types = [...new Set(ucs.map((u) => u.type))];
  const units = [...new Set(ucs.map((u) => u.unit || 'all'))];
  const rows = units.map((unit) => {
    const mine = ucs.filter((u) => (u.unit || 'all') === unit);
    return { label: unit, counts: types.map((t) => mine.filter((u) => u.type === t).length), total: mine.length, isTotal: false };
  });
  if (rows.length) rows.push({ label: 'total', counts: types.map((t) => ucs.filter((u) => u.type === t).length), total: ucs.length, isTotal: true });
  return { types, rows };
}

function crossCheck(fileM, computed, nUcs) {
  const f = fileM.rows.findLast((r) => r.isTotal)?.total ?? fileM.rows.reduce((s, r) => s + r.total, 0);
  return f === nUcs ? `<p>${chip(`✓ matrix total ${f} matches the ${nUcs} use-case blocks`, 'ok')}</p>` : note(`the matrix in the file says ${f} use cases but ${nUcs} use-case blocks were found; the file's own matrix is shown`);
}

function matrixTable({ types, rows }) {
  const head = ['Area / unit', ...types, 'Total'];
  const trs = rows.map((r) => [r.isTotal ? `<b>${esc(r.label)}</b>` : esc(r.label), ...r.counts.map((n) => (n ? `<b>${n}</b>` : '<span class="muted">0</span>')), `<b>${r.total}</b>`]);
  return `<div class="scroll">${table(head, trs, 'matrix')}</div>`;
}

const FIELD_ORDER = ['endpoints', 'preconditions', 'data', 'steps', 'evidence', 'notes'];
function ucCard(u) {
  const by = (re) => u.fields.find((f) => re.test(f.key));
  const expected = by(/^expected/);
  const oracle = by(/oracle/);
  const notes = by(/^notes/);
  const gate = /gate:\s*(yes|no|cond\w*)/i.exec(notes ? notes.value : '')?.[1]?.toLowerCase();
  const rest = u.fields.filter((f) => f !== expected && f !== oracle && !['area', 'type'].includes(f.key)).sort((a, b) => ord(a.key) - ord(b.key));
  const fieldHtml = (f) => `<p class="sub">${esc(f.key)}</p>${f.value ? `<p>${inline(f.value)}</p>` : ''}${f.rest.length ? mdBlock(f.rest.join('\n')) : ''}`;
  return details(
    `<span class="uc">${esc(u.id)}</span><span class="title">${inline(u.title)}</span>${chip(u.type, 'info')}${gate ? chip(gate === 'yes' ? '✓ in gate' : gate === 'no' ? 'outside gate' : 'conditional', gate === 'yes' ? 'ok' : 'warn') : ''}`,
    `${oracle ? `<p class="sub">oracle</p><p>${inline(oracle.value)}</p>${oracle.rest.length ? mdBlock(oracle.rest.join('\n')) : ''}` : ''}${expected ? fieldHtml(expected) : note('could not read: no "Expected" field in this use case')}${rest.length ? details('Preconditions, data, steps, evidence, notes', rest.map(fieldHtml).join('')) : ''}`,
  );
}
const ord = (k) => { const i = FIELD_ORDER.indexOf(k); return i < 0 ? 99 : i; };
