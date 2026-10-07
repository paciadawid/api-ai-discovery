// Stage 6 (run): renders 05-run-report.md: verdict banner, before/after metric cards, results by area, improvements, bugs, gaps.
import { UserError } from '../context.mjs';
import { bar, chip, details, esc, guard, inline, introOf, mdBlock, note, parsedTable, section, table as tableHtml, ul, unreadable } from '../html.mjs';
import { col, findSection, findSections, numbers, parseList, parseTables, paragraphs, plain } from '../md.mjs';

const FILE = '05-run-report.md';
const CATEGORIES = [['Framework', /framework/i], ['Test strength', /strength/i], ['Test infrastructure', /infrastructure/i], ['Process', /process/i]];

export default function render(ctx) {
  const text = ctx.read(FILE);
  if (text == null) throw new UserError(`input not found: ${ctx.rootRel}/${FILE} (the run-report stage has not run, or --root is wrong)`);
  const sec = (re) => findSection(text, re, 2);
  const [verdict, metrics, results, improved, bugs, flaky, gaps] = [/verdict/i, /metrics/i, /results/i, /improved|improvements/i, /bugs/i, /flaky|unresolved/i, /coverage gaps|gaps/i].map(sec);
  const resTable = results && parseTables(results.body)[0];
  const failing = resTable ? totalFailing(resTable) : null;
  const bugRows = bugs ? (parseTables(bugs.body)[0]?.rows.length ?? 0) : 0;

  const intro = introOf(text);
  const body = [
    section('Verdict', verdict ? guard('verdict', verdict.body, () => banner(verdict.body, failing, bugRows)) : unreadable('"Verdict" section (## 1.)', '')),
    section('Metrics: before and after', metrics ? guard('metrics table', metrics.body, () => metricCards(metrics)) : unreadable('"Metrics" section (## 2.)', '')),
    section('Results by area', results ? guard('results table', results.body, () => resultsPart(results)) : unreadable('"Results by area" section (## 3.)', '')),
    section('What was improved', improved ? guard('improvement categories', improved.body, () => improvements(improved)) : unreadable('"What was improved" section (## 4.)', '')),
    section('Application bugs', bugs ? guard('application bugs', bugs.body, () => bugsPart(bugs)) : unreadable('"Application bugs" section (## 5.)', '')),
    section('Flaky or unresolved', flaky ? guard('flaky list', flaky.body, () => listPart(flaky)) : unreadable('"Flaky or unresolved" section (## 6.)', '')),
    section('Coverage gaps', gaps ? guard('coverage gaps list', gaps.body, () => listPart(gaps)) : unreadable('"Coverage gaps" section (## 7.)', '')),
    ...findSections(text, /^appendix/i, 2).map((a) => details(esc(a.title), mdBlock(a.body))),
    intro ? details('About this run', mdBlock(intro)) : '',
  ].join('\n');
  const lead = failing == null ? 'verdict unreadable' : failing > 0 ? `${failing} failing` : 'all passing';
  return { headline: `${lead}; ${clip(plain(firstSentence(verdict?.body ?? '')), 150)}`, body };
}

const clip = (s, n) => (s.length <= n ? s : `${s.slice(0, n).replace(/\s+\S*$/, '')}…`);
const firstSentence = (s) => (paragraphs(s)[0] ?? '').replace(/^\*\*|\*\*$/g, '');

function totalFailing(t) {
  const f = col(t, /fail/i);
  if (f < 0) return null;
  const rows = t.rows.filter((r) => !/total/i.test(r[0]));
  const nums = rows.map((r) => (/^\d+$/.test(plain(r[f])) ? Number(plain(r[f])) : null)).filter((n) => n != null);
  return nums.length ? nums.reduce((a, b) => a + b, 0) : null;
}

function banner(text, failing, bugRows) {
  const kind = failing == null ? '' : failing > 0 ? 'bad' : bugRows ? 'warn' : 'ok';
  const lead = failing == null ? 'Verdict' : failing > 0 ? `✗ ${failing} test${failing === 1 ? '' : 's'} failing` : bugRows ? '✓ all tests passing, ! bug candidates open' : '✓ all tests passing';
  const paras = paragraphs(text);
  if (!paras.length) return '';
  return `<div class="banner ${kind}"><div class="lead">${esc(lead)}</div>${paras.map((p) => `<p>${inline(p)}</p>`).join('')}</div>`;
}

function deltaOf(before, after) {
  const nb = numbers(before);
  const na = numbers(after);
  if (/^\s*n\/?a\b/i.test(before) && na.length) return '+ new: there was no value before';
  if (!nb.length || !na.length) return '- no numeric comparison possible';
  const idx = nb.length === na.length ? [0, 1].filter((i) => i < na.length) : [0];
  const parts = idx.map((i) => ({ i, d: Math.round((na[i] - nb[i]) * 100) / 100 })).filter((x) => x.i === 0 || x.d !== 0).map(({ i, d }) => {
    const what = i === 0 ? 'first figure' : 'second figure';
    return d > 0 ? `▲ ${what} up by ${d}` : d < 0 ? `▼ ${what} down by ${-d}` : `■ ${what} unchanged`;
  });
  return parts.join('; ');
}

function metricCards(sec) {
  const t = parseTables(sec.body)[0];
  if (!t) return '';
  const b = col(t, /before/i);
  const a = col(t, /after/i);
  if (b < 0 || a < 0) return parsedTable(t);
  const notes = paragraphs(sec.body).filter((p) => !p.startsWith('|'));
  return `<div class="cards">${t.rows.map((r) => `<div class="cardbox metric"><h3>${inline(r[0])}</h3><div class="row">Before: <b>${inline(r[b])}</b></div><div class="row">After: <b>${inline(r[a])}</b> &rarr;</div><div class="delta">${esc(deltaOf(plain(r[b]), plain(r[a])))}</div></div>`).join('')}</div>${notes.map((n) => `<p class="muted small">${inline(n)}</p>`).join('')}`;
}

function resultsPart(sec) {
  const t = parseTables(sec.body)[0];
  if (!t) return '';
  const p = col(t, /pass/i);
  const f = col(t, /fail/i);
  if (p < 0 || f < 0) return parsedTable(t);
  const rest = t.header.map((_, i) => i).filter((i) => i !== p && i !== f);
  const rows = t.rows.map((r) => {
    const pn = /^\d+$/.test(plain(r[p])) ? Number(plain(r[p])) : null;
    const fn = /^\d+$/.test(plain(r[f])) ? Number(plain(r[f])) : null;
    const cell = pn != null && fn != null ? (pn + fn === 0 ? '<span class="muted">none run</span>' : bar(pn, pn + fn, `${pn} pass / ${fn} fail${fn ? ' ✗' : ' ✓'}`, fn ? 'bad' : 'ok')) : `${inline(r[p])}${fn != null ? ` &middot; ${fn} fail ${fn ? '✗' : '✓'}` : ` / ${inline(r[f])}`}`;
    return [...rest.slice(0, 1).map((i) => inline(r[i])), cell, ...rest.slice(1).map((i) => inline(r[i]))];
  });
  const head = [...rest.slice(0, 1).map((i) => t.header[i]), 'Passing / failing', ...rest.slice(1).map((i) => t.header[i])];
  const extra = paragraphs(sec.body).map((x) => `<p class="muted small">${inline(x)}</p>`).join('');
  return `<div class="scroll">${tableHtml(head, rows)}</div>${extra}`;
}

function improvements(sec) {
  const subs = findSections(sec.body, null, 3);
  if (!subs.length) return '';
  const cards = CATEGORIES.map(([name, re]) => {
    const s = subs.find((x) => re.test(x.title));
    return s ? categoryCard(name, s) : `<div class="cardbox"><h3>${esc(name)}</h3>${note(`could not read: no "${name}" subsection`)}</div>`;
  });
  subs.filter((s) => !CATEGORIES.some(([, re]) => re.test(s.title))).forEach((s) => cards.push(categoryCard(s.title, s)));
  const ba = /\*\*Before \/ after\.?\*\*[\s\S]*$/.exec(sec.body);
  return `<div class="cards">${cards.join('')}</div>${ba ? `<div class="banner"><p>${inline(ba[0].trim())}</p></div>` : ''}`;
}

function categoryCard(name, s) {
  const t = parseTables(s.body)[0];
  let items;
  if (t) {
    items = t.rows.map((r) => `<div class="item"><b>${inline(r[0])}</b>${r[1] ? `<p>&rarr; ${inline(r[1])}</p>` : ''}${r.slice(2).map((c, i) => (c ? `<p class="small muted"><i>${esc(t.header[i + 2])}:</i> ${inline(c)}</p>` : '')).join('')}</div>`);
  } else {
    items = parseList(s.body).map((i) => `<div class="item">${inline(i.text)}</div>`);
  }
  if (!items.length) return `<div class="cardbox"><h3>${esc(name)}</h3>${unreadable(`items of "${name}"`, s.body)}</div>`;
  return `<div class="cardbox"><h3>${esc(name)} ${chip(`${items.length} change${items.length === 1 ? '' : 's'}`, 'info')}</h3>${items.join('')}</div>`;
}

function bugsPart(sec) {
  const t = parseTables(sec.body)[0];
  const lead = paragraphs(sec.body).map((p) => `<p>${inline(p)}</p>`).join('');
  if (!t || !t.rows.length) return `<p>${chip('✓ no application bug listed', 'ok')}</p>${lead}`;
  const sev = col(t, /severity/i);
  const cards = t.rows.map((r) => `<div class="cardbox"><h3>${inline(r[0])}</h3>${sev >= 0 ? chip(`severity: ${plain(r[sev])}`, 'warn') : ''}${r.slice(1).map((c, i) => (i + 1 === sev || !c ? '' : `<p><b>${esc(t.header[i + 1])}:</b> ${inline(c)}</p>`)).join('')}</div>`);
  return `${lead}<div class="cards">${cards.join('')}</div>`;
}

function listPart(sec) {
  const items = parseList(sec.body);
  return items.length ? ul(items.map((i) => inline(i.text + (i.children.length ? ' ' + i.children.map((c) => c.text).join('; ') : '')))) : mdBlock(sec.body);
}
