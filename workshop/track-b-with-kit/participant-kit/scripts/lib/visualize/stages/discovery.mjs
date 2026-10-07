// Stage 2 (discovery): renders endpoints.json, SUMMARY.md, flows.md, auth.md and open-questions.md of 01-discovery/.
import { UserError } from '../context.mjs';
import { chip, details, esc, guard, inline, mdBlock, methodBadge, note, raw, section, table, tile, tiles, ul, unreadable } from '../html.mjs';
import { findSection, findSections, parseList, plain } from '../md.mjs';

const D = '01-discovery/';

export default function render(ctx) {
  const files = { json: ctx.read(D + 'endpoints.json'), summary: ctx.read(D + 'SUMMARY.md'), flows: ctx.read(D + 'flows.md'), auth: ctx.read(D + 'auth.md'), questions: ctx.read(D + 'open-questions.md') };
  if (Object.values(files).every((v) => v == null)) throw new UserError(`input not found: no discovery files under ${ctx.rootRel}/${D}`);

  const eps = files.json == null ? null : parseEndpoints(files.json);
  const flowCount = files.flows == null ? null : findSections(files.flows, /^flow\b/i).length;
  const q = files.questions == null ? null : parseQuestions(files.questions);
  const verified = eps?.filter((e) => e.verified).length;

  const overview = tiles([
    tile(eps ? eps.length : '?', 'endpoints total'),
    tile(eps ? verified : '?', 'verified', eps && verified === eps.length ? 'ok' : ''),
    tile(eps ? eps.length - verified : '?', 'unverified', eps && eps.length - verified > 0 ? 'bad' : ''),
    tile(flowCount ?? '?', 'flows'),
    tile(q ? q.open.length : '?', `open questions${q && q.answered.length ? ` (+${q.answered.length} answered)` : ''}`),
  ]);

  const parts = [overview];
  parts.push(section('Endpoints', files.json == null ? unreadable('endpoints.json is missing', '') : guard('endpoints table in endpoints.json', files.json, () => eps?.length && endpointTable(eps))));
  parts.push(...summaryParts(files.summary));
  parts.push(section('Auth', authPart(files)));
  parts.push(section('Flows by unit', files.flows == null ? unreadable('flows.md is missing', '') : guard('unit sections in flows.md', files.flows, () => flowsPart(files.flows))));
  parts.push(section('Open questions', q ? guard('open-questions.md', files.questions, () => questionsPart(q)) : unreadable('open-questions.md is missing', '')));
  const risks = files.summary ? findSection(files.summary, /risks/i) : null;
  const nrisk = risks ? parseList(risks.body).filter((i) => i.num != null).length : 0;
  return { headline: `${eps ? `${eps.length} endpoints (${verified} verified)` : 'endpoints unreadable'}, ${flowCount ?? '?'} flows, ${nrisk} risks, ${q ? q.open.length : '?'} open questions`, body: parts.join('\n') };
}

function parseEndpoints(text) {
  let data;
  try { data = JSON.parse(text); } catch (e) { throw new Error(`invalid JSON: ${e.message}`); }
  const list = Array.isArray(data) ? data : data?.endpoints;
  if (!Array.isArray(list)) throw new Error('no endpoint array');
  return list.map((e) => ({
    id: e.id ?? '', method: String(e.method ?? '?').toUpperCase(), path: e.path ?? '', purpose: e.purpose ?? e.summary ?? '',
    verified: e.verified === true || /^(true|yes)$/i.test(String(e.verified)), parts: Array.isArray(e.unverifiedParts) ? e.unverifiedParts : [],
    state: e.stateChanging === true, stateKnown: typeof e.stateChanging === 'boolean', units: Array.isArray(e.units) ? e.units : [], auth: e.authRequired,
  }));
}

function endpointTable(eps) {
  const rows = eps.map((e) => {
    const failureOnly = e.parts.some((p) => /failure path|verified here means/i.test(p));
    const v = !e.verified ? chip('! unverified', 'warn', 'seen in the browser only, not replayed') : chip(failureOnly ? '✓ verified (failure path only)' : '✓ verified', 'ok', e.parts.length ? `${e.parts.length} parts still unverified` : '');
    const s = !e.stateKnown ? '' : e.state ? chip('✎ changes state', 'warn') : chip('read-only', 'neutral');
    return [methodBadge(e.method), `<span class="ep">${esc(e.path)}</span><br><span class="muted small">${esc(e.id)}</span>`, inline(e.purpose), v, s, e.units.map((u) => chip(u)).join('') || '<span class="muted">-</span>'];
  });
  return `<div class="scroll">${table(['Method', 'Path', 'Purpose', 'Verified', 'State', 'Units touching it'], rows)}</div>`;
}

function summaryParts(summary) {
  if (summary == null) return [section('Risks and surprises', unreadable('SUMMARY.md is missing', '')), section('Decisions needed', unreadable('SUMMARY.md is missing', ''))];
  const risks = findSection(summary, /risks/i);
  const decisions = findSection(summary, /decisions needed/i);
  const answers = findSection(summary, /answers/i);
  const riskHtml = risks && guard('risks list', summary, () => {
    const items = parseList(risks.body).filter((i) => i.num != null || !/^\s*$/.test(i.text));
    return items.length && `<div class="cards">${items.map((it, k) => riskCard(it, k)).join('')}</div>`;
  });
  return [
    section('Risks and surprises', riskHtml || unreadable('"Risks" section in SUMMARY.md', summary)),
    section('Decisions needed', decisions ? guard('decisions list in SUMMARY.md', decisions.body, () => decisionCards(decisions.body, answers?.body)) : unreadable('"Decisions needed" section in SUMMARY.md', '')),
  ];
}

/** Title = leading bold phrase (or the first sentence); the rest and the sub-bullets form the card body. */
export function splitLead(text) {
  const m = /^\*\*(.+?)\*\*[\s:.-]*(.*)$/s.exec(text);
  if (m) return [m[1], m[2]];
  const s = /^(.{1,120}?[.:])\s+(.*)$/s.exec(text);
  return s ? [s[1], s[2]] : [text.slice(0, 120), text.slice(120)];
}

function riskCard(it, k) {
  const [title, rest] = splitLead(it.text);
  return `<div class="cardbox"><h3>${it.num ?? k + 1}. ${inline(title)}</h3>${rest ? `<p>${inline(rest)}</p>` : ''}${it.children.length ? ul(it.children.map((c) => inline(c.text))) : ''}</div>`;
}

/** Numbered decisions joined with the recorded numbered answers. Shared with the selected stage. */
export function decisionCards(decisionsBody, answersBody) {
  const decisions = parseList(decisionsBody).filter((i) => i.num != null);
  const answers = new Map(parseList(answersBody ?? '').filter((i) => i.num != null).map((i) => [i.num, i]));
  const generalAnswer = answersBody ? plain(answersBody.split('\n').find((l) => l.trim() && !/^\s*(\d+[.)]|[-*])/.test(l)) ?? '') : '';
  if (!decisions.length) return '';
  const done = decisions.filter((d) => answers.has(d.num)).length;
  return `<p>${chip(`${done} of ${decisions.length} answered`, done === decisions.length ? 'ok' : 'warn')} ${generalAnswer ? `<span class="muted small">${esc(generalAnswer)}</span>` : ''}</p>` + decisions.map((d) => {
    const ans = answers.get(d.num);
    const [q, ...rec] = d.text.split(/\s+(?=Recommend)/);
    return `<div class="cardbox" style="margin:10px 0"><h3>${d.num}. ${inline(q)} ${ans ? chip('✓ ANSWERED', 'ok') : chip('! OPEN', 'warn')}</h3>${rec.length ? `<p class="muted">${inline(rec.join(' '))}</p>` : ''}${ans ? `<p><b>Answer:</b> ${inline(ans.text)}</p>` : ''}</div>`;
  }).join('');
}

function authPart({ summary, auth }) {
  const sec = summary && findSection(summary, /auth/i);
  const short = sec ? parseList(sec.body) : [];
  const head = short.length ? ul(short.map((i) => inline(i.text))) : '';
  const full = auth == null ? note('could not read: auth.md is missing') : details('Full auth notes (auth.md)', mdBlock(auth));
  return (head || (auth == null ? '' : note('could not read: "Auth model" section in SUMMARY.md; see the full notes below'))) + full;
}

function flowsPart(text) {
  let units = findSections(text, /^unit\b/i, 2);
  if (!units.length) units = findSections(text, null, 2);
  if (!units.length) return '';
  return units.map((u) => {
    const flows = findSections(u.body, /flow/i, 3);
    return details(`<b>${esc(u.title.replace(/^unit:\s*/i, ''))}</b> ${chip(`${flows.length} flow${flows.length === 1 ? '' : 's'}`, 'info')}`, mdBlock(u.body));
  }).join('');
}

function parseQuestions(text) {
  const open = [];
  const answered = [];
  for (const sec of findSections(text, null, 2)) {
    const target = /answered/i.test(sec.title) ? answered : open;
    parseList(sec.body).forEach((i) => target.push({ group: sec.title, text: i.text, num: i.num }));
  }
  return { open, answered };
}

function questionsPart(q) {
  if (!q.open.length && !q.answered.length) return '';
  const groups = [...new Set(q.open.map((x) => x.group))];
  const open = groups.map((g) => `<h3>${esc(g)}</h3>${ul(q.open.filter((x) => x.group === g).map((x) => `${x.num != null ? `<b>${x.num}.</b> ` : ''}${inline(x.text)}`))}`).join('');
  return details(`${q.open.length} open question${q.open.length === 1 ? '' : 's'}`, open) + (q.answered.length ? details(`${q.answered.length} answered during discovery`, ul(q.answered.map((x) => inline(x.text)))) : '');
}
