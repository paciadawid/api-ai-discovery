// Stage 4 (selected): renders 03-selected.md as a ranked score chart, selection chips, per-unit coverage and decisions.
import { UserError } from '../context.mjs';
import { chip, details, esc, guard, inline, mdBlock, note, parsedTable, section, tile, tiles, ul, unreadable, bar } from '../html.mjs';
import { col, findSection, numbers, parseList, parseTables, plain } from '../md.mjs';
import { decisionCards } from './discovery.mjs';
import { parseUseCases } from './usecases.mjs';

const FILE = '03-selected.md';
const UC_ID = /UC-[\w-]*\d+/;

export default function render(ctx) {
  const text = ctx.read(FILE);
  if (text == null) throw new UserError(`input not found: ${ctx.rootRel}/${FILE} (the prioritiser stage has not run, or --root is wrong)`);
  const ucText = ctx.read('02-use-cases.md');
  const ucs = ucText ? parseUseCases(ucText) : [];
  const titles = new Map(ucs.map((u) => [u.id, u.title]));
  const units = new Map(ucs.map((u) => [u.id, u.unit]));

  const tables = parseTables(text);
  const scoring = tables.filter((t) => col(t, /uc id/i) >= 0 && col(t, /priority/i) >= 0).sort((a, b) => b.rows.length - a.rows.length)[0];
  const rows = scoring ? scoreRows(scoring) : [];
  const answersSec = findSection(text, /answers/i);
  const added = answersSec ? [...answersSec.body.matchAll(/\badd(?:ed)?\s+(UC-[\w-]*\d+)/gi)].map((m) => m[1]) : [];
  const baseSelected = new Set(rows.filter((r) => r.selected).map((r) => r.id));
  const smallSel = tables.filter((t) => t !== scoring && col(t, /uc id/i) >= 0 && /selected/i.test(t.heading)).flatMap((t) => t.rows.map((r) => UC_ID.exec(r[col(t, /uc id/i)])?.[0]).filter(Boolean));
  if (!baseSelected.size) smallSel.forEach((id) => baseSelected.add(id));
  const sel = new Set([...baseSelected, ...added.filter((id) => rows.some((r) => r.id === id))]);
  rows.forEach((r) => { r.titleFull = titles.get(r.id) || r.title; r.unit = units.get(r.id) || ''; r.chosen = sel.has(r.id); r.addedAtGate = r.chosen && !baseSelected.has(r.id); });

  const unitsList = [...new Set(rows.map((r) => units.get(r.id)).filter(Boolean))];
  const overview = tiles([
    tile(rows.length || '?', 'scored use cases'),
    tile(sel.size, 'selected', sel.size ? 'ok' : ''),
    tile(rows.length ? rows.length - sel.size : '?', 'deferred'),
    tile(rows.length ? Math.max(...rows.map((r) => r.score)).toFixed(2) : '?', 'top score'),
    tile(added.length ? added.length : 0, 'added at the gate'),
  ]);
  const brief = findSection(text, /decision brief/i);
  const decisions = findSection(text, /decisions? for the human|decisions needed/i);

  const body = [
    overview,
    brief ? section('Decision brief', `<div class="banner">${mdBlock(brief.own)}</div>`) : '',
    section('Ranked scores (all scored use cases)', guard(`scoring table in ${FILE}`, text, () => rows.length && chart(rows))),
    section('Coverage per unit', guard('coverage per unit', text, () => coverage(text, rows, units, sel, ucs.length > 0))),
    section('Decisions for the human', decisions ? guard('numbered decisions', decisions.body, () => decisionCards(decisions.body, answersSec?.body)) : unreadable(`"Decisions" section in ${FILE}`, '')),
    deferredPart(text),
    ucText == null ? note('could not read: 02-use-cases.md (not found); titles come from the scoring table and units from the coverage table only') : '',
  ].join('\n');
  return { headline: `${sel.size} of ${rows.length} use cases selected${added.length ? ` (${added.length} added at the gate)` : ''}${rows.length ? `, top score ${Math.max(...rows.map((r) => r.score)).toFixed(2)}` : ''}`, body };
}

function scoreRows(t) {
  const c = { rank: col(t, /rank/i), id: col(t, /uc id/i), title: col(t, /title|what/i), pr: col(t, /priority/i), ar: col(t, /arith/i), res: col(t, /result/i), gate: col(t, /gate/i) };
  const f = ['I', 'L', 'C', 'K', 'S'].map((k) => t.header.findIndex((h) => h.trim() === k));
  return t.rows.map((r, i) => {
    const id = UC_ID.exec(r[c.id])?.[0] ?? plain(r[c.id]);
    const res = c.res >= 0 ? plain(r[c.res]) : '';
    return { rank: numbers(r[c.rank])[0] ?? i + 1, id, title: plain(r[c.title] ?? ''), score: numbers(r[c.pr])[0] ?? 0, arith: c.ar >= 0 ? plain(r[c.ar]) : '', result: res, gate: c.gate >= 0 ? plain(r[c.gate]) : '', selected: /^selected/i.test(res), factors: f.map((k) => (k >= 0 ? plain(r[k]) : '')) };
  }).sort((a, b) => a.rank - b.rank);
}

function chart(rows) {
  const max = Math.max(...rows.map((r) => r.score), 1);
  const lastSel = rows.map((r) => r.selected).lastIndexOf(true);
  const out = [`<p class="legend"><span>${chip('SELECTED', 'ok')} goes into the next stage</span><span>${chip('deferred', 'neutral')} scored but not selected</span><span class="muted">score = (2 x impact + likelihood + coverage value) / (cost + stability risk)</span></p>`];
  const hasF = rows.some((r) => r.factors.some(Boolean));
  if (hasF) out.push('<dl class="factors"><dt>I</dt><dd><b>Impact</b>: business damage if this breaks. Counts double. 5 = severe.</dd><dt>L</dt><dd><b>Likelihood</b>: how likely it is to break (complex state, validation, dependencies). 5 = very likely.</dd><dt>C</dt><dd><b>Coverage value</b>: how much other behaviour this test implicitly proves. 5 = a lot.</dd><dt>K</dt><dd><b>Cost</b>: effort to write and maintain, including data and cleanup. 5 = expensive.</dd><dt>S</dt><dd><b>Stability risk</b>: chance of flaky results (shared data, rate limits, varying responses). 5 = flaky.</dd></dl>');
  const fh = [['I', 'Impact'], ['L', 'Likelihood'], ['C', 'Coverage value'], ['K', 'Cost'], ['S', 'Stability risk']];
  const head = ['#', 'Use case', 'What it proves', 'Unit', ...(hasF ? fh.map(([k, n]) => `<span title="${n}">${k}</span>`) : []), 'Score', 'State'];
  const span = head.length;
  const body = [];
  rows.forEach((r, i) => {
    const state = r.chosen ? chip(r.addedAtGate ? 'SELECTED (gate)' : 'SELECTED', 'ok') : chip('deferred', 'neutral', r.result);
    const fcells = hasF ? r.factors.map((v) => `<td class="n">${esc(v)}</td>`).join('') : '';
    body.push(`<tr class="${r.chosen ? 'sel' : 'def'}"><td class="n">${r.rank}</td><td><b>${esc(r.id)}</b></td><td>${esc(plain(r.titleFull))}</td><td>${r.unit ? chip(r.unit, 'info') : ''}</td>${fcells}<td class="sc" title="${esc(r.arith)}">${bar(r.score, max, r.score.toFixed(2), r.chosen ? 'sel' : 'def')}${r.arith ? `<div class="small muted">${esc(r.arith)}</div>` : ''}</td><td>${state}</td></tr>`);
    if (i === lastSel && i < rows.length - 1) body.push(`<tr class="cutrow"><td colspan="${span}">cut: ${rows.slice(0, i + 1).filter((x) => x.selected).length} selected above this line, the rest are deferred</td></tr>`);
  });
  out.push(`<div class="scroll"><table class="rt"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body.join('')}</tbody></table></div>`);
  return out.join('');
}

function coverage(text, rows, units, sel, haveUnits) {
  const t = parseTables(text).find((x) => col(x, /selected\s*\/\s*total/i) >= 0);
  const risk = new Map();
  const fromFile = [];
  if (t) {
    const ui = 0; const si = col(t, /selected\s*\/\s*total/i); const ri = col(t, /risk/i);
    t.rows.forEach((r) => { const key = /^[\w-]+/.exec(plain(r[ui]))?.[0] ?? plain(r[ui]); const n = numbers(r[si]); fromFile.push({ key, sel: n[0] ?? 0, total: n[1] ?? 0 }); if (ri >= 0) risk.set(key, r[ri]); });
  }
  let list = fromFile;
  let computedNote = '';
  if (haveUnits) {
    const keys = [...new Set([...units.values()].filter(Boolean))];
    list = keys.map((k) => ({ key: k, sel: [...units].filter(([id, u]) => u === k && sel.has(id)).length, total: [...units.values()].filter((u) => u === k).length }));
    computedNote = fromFile.length ? '' : '<p class="muted small">Computed from the use-case blocks in 02-use-cases.md and the selection above (no coverage table in the file).</p>';
  }
  if (!list.length) return '';
  return computedNote + list.map((u) => `<div class="rank" style="grid-template-columns:150px minmax(220px,1fr) 2fr"><b>${esc(u.key)}</b>${bar(u.sel, u.total, `${u.sel} of ${u.total} selected`, u.sel === 0 ? 'bad' : 'sel')}<span class="small muted">${u.sel === 0 ? chip('! none selected', 'warn') + ' ' : ''}${risk.has(u.key) ? inline(risk.get(u.key)) : ''}</span></div>`).join('');
}

function deferredPart(text) {
  const d = findSection(text, /^\d*\.?\s*deferred/i, 2);
  const t = d && parseTables(d.body)[0];
  const issues = findSection(text, /issues for the human/i);
  return [t ? details('Why the rest was deferred', parsedTable(t)) : '', issues ? details('Issues for the human', mdBlock(issues.body)) : ''].join('');
}
