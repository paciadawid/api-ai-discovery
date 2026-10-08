// Stage 8 (strengthen): renders 07-strengthen-report.md plus 06-sabotage.json: what the strengthening round closed and changed.
import { UserError } from '../context.mjs';
import { chip, details, esc, guard, inline, introOf, mdBlock, note, section, table, tile, tiles, unreadable } from '../html.mjs';
import { findSection, findSections, paragraphs, parseTables, plain } from '../md.mjs';
import { categoryCard, listPart, metricCards } from './run.mjs';

const FILE = '07-strengthen-report.md';
const JSON_FILE = '06-sabotage.json';

export default function render(ctx) {
  const text = ctx.read(FILE);
  if (text == null) throw new UserError(`input not found: ${ctx.rootRel}/${FILE} (the strengthen step has not run, or --root is wrong)`);
  const sec = (re) => findSection(text, re, 2);
  const [verdict, metrics, gaps, changed, open, checked] = [/verdict/i, /before and after|before\/after/i, /gaps closed/i, /what changed|changes/i, /open|risks|not fixed/i, /checked|verif/i].map(sec);
  const muts = readMutations(ctx);
  const closed = muts ? muts.filter((m) => /^survived/i.test(m.firstRun ?? '')) : null;
  const left = muts ? muts.filter((m) => !/^killed/i.test(m.result)) : null;

  const body = [
    muts ? tiles(tileList(muts, closed, left)) : '',
    section('Verdict', verdict ? guard('verdict', verdict.body, () => banner(verdict.body, left)) : unreadable('"Verdict" section (## 1.)', '')),
    section('Before and after', metrics ? guard('before and after table', metrics.body, () => metricCards(metrics)) : unreadable('"Before and after" section (## 2.)', '')),
    section('Gaps closed: what the tests could not see, and what now sees it', gaps ? guard('gaps closed table', gaps.body, () => groupCards(gaps)) : unreadable('"Gaps closed" section (## 3.)', '')),
    section('Mutation by mutation: first run and now', muts ? perMutation(muts, closed) : note(`could not read: ${ctx.rootRel}/${JSON_FILE} (the per-mutation table needs the sabotage results)`)),
    section('What changed in the kit', changed ? guard('what changed', changed.body, () => changes(changed)) : unreadable('"What changed" section (## 4.)', '')),
    section('Not fixed, risks and limits', open ? guard('open items list', open.body, () => listPart(open)) : unreadable('"Not fixed" section (## 5.)', '')),
    section('How it was checked', checked ? guard('checks list', checked.body, () => listPart(checked)) : unreadable('"How it was checked" section (## 6.)', '')),
    ...findSections(text, /^appendix/i, 2).map((a) => details(esc(a.title), mdBlock(a.body))),
    introOf(text) ? details('About this round', mdBlock(introOf(text))) : '',
  ].join('\n');

  const head = muts ? `${closed.length} gap${closed.length === 1 ? '' : 's'} closed, ${muts.length - left.length} of ${muts.length} mutations killed (was ${muts.length - left.length - closed.filter((m) => /^killed/i.test(m.result)).length})` : 'strengthening round';
  return { headline: `${head}; ${clip(plain(firstSentence(verdict?.body ?? '')), 130)}`, body };
}

const clip = (s, n) => (s.length <= n ? s : `${s.slice(0, n).replace(/\s+\S*$/, '')}…`);
const firstSentence = (s) => (paragraphs(s)[0] ?? '').replace(/^\*\*|\*\*$/g, '');

function readMutations(ctx) {
  const t = ctx.read(JSON_FILE);
  if (t == null) return null;
  try {
    const data = JSON.parse(t);
    const list = Array.isArray(data) ? data : data?.mutations;
    return Array.isArray(list) ? list.map((m, i) => ({ id: m.id ?? `M${i + 1}`, what: m.what ?? '', file: m.file ?? '', layer: m.layer ?? '', result: String(m.result ?? '?').toUpperCase(), firstRun: m.firstRun ? String(m.firstRun).toUpperCase() : null, killedBy: [].concat(m.killedBy ?? []), verdict: m.verdict ?? null })) : null;
  } catch { return null; }
}

function tileList(muts, closed, left) {
  const killed = muts.length - left.length;
  const before = killed - closed.filter((m) => /^killed/i.test(m.result)).length;
  const defensive = left.filter((m) => /^defensive/i.test(m.verdict ?? '')).length;
  return [
    tile(`${killed} of ${muts.length}`, `mutations killed (was ${before})`, left.length ? 'bad' : 'ok'),
    tile(closed.length, 'gaps closed (first-run survivors now killed)', closed.length ? 'ok' : ''),
    tile(left.length, 'survivors left', left.length ? 'bad' : 'ok'),
    ...(defensive ? [tile(defensive, 'accepted as defensive (no real reply reaches them)')] : []),
  ];
}

function banner(verdictText, left) {
  const kind = left == null ? '' : left.length ? 'warn' : 'ok';
  const lead = left == null ? 'Verdict' : left.length ? `! ${left.length} survivor${left.length === 1 ? '' : 's'} left` : '✓ no survivors left';
  return `<div class="banner ${kind}"><div class="lead">${esc(lead)}</div>${paragraphs(verdictText).map((p) => `<p>${inline(p)}</p>`).join('')}</div>`;
}

function groupCards(sec) {
  const t = parseTables(sec.body)[0];
  if (!t) return '';
  return `<div class="cards">${t.rows.map((r) => `<div class="cardbox"><h3>${inline(r[0])}</h3>${r.slice(1).map((c, i) => (c ? `<p><b>${esc(t.header[i + 1])}:</b> ${inline(c)}</p>` : '')).join('')}</div>`).join('')}</div>`;
}

function perMutation(muts, closed) {
  if (!closed.length) return `<p>${chip('no survivor was closed', 'neutral')} every mutation of the first run was already killed.</p>`;
  const rows = closed.map((m) => [`<b>${esc(m.id)}</b>`, inline(m.what), `<code>${esc(m.file)}</code>`, chip('✗ SURVIVED', 'bad'), /^killed/i.test(m.result) ? chip('✓ KILLED', 'ok') : chip(`✗ ${m.result}${m.verdict ? ` (${m.verdict.toLowerCase()})` : ''}`, m.verdict && /^defensive/i.test(m.verdict) ? 'warn' : 'bad'), m.killedBy.map((k) => chip(k, 'info')).join(' ') || '-']);
  return `<div class="scroll">${table(['ID', 'What was broken (and no test noticed)', 'File', 'First run', 'Now', 'Killed by'], rows)}</div><p class="muted small">Each of these was a break the tests stayed green through on the first run. ${muts.length - closed.length} other mutations were already killed on the first run and are not listed here.</p>`;
}

function changes(sec) {
  const subs = findSections(sec.body, null, 3);
  const lead = paragraphs(sec.body.split(/\n(?=###\s)/)[0]).map((p) => `<p>${inline(p)}</p>`).join('');
  if (!subs.length) return '';
  return `${lead}<div class="cards">${subs.map((s) => categoryCard(s.title, s)).join('')}</div>`;
}
