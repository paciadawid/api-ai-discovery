// Stage 7 (sabotage): renders 06-sabotage.json (or the table in 06-sabotage-report.md) as tiles, a layer x class heatmap and survivors.
import { UserError } from '../context.mjs';
import { chip, details, esc, guard, inline, mdBlock, note, parsedTable, section, table, tile, tiles, ul } from '../html.mjs';
import { col, findSection, paragraphs, parseList, parseTables, plain } from '../md.mjs';

const JSON_FILE = '06-sabotage.json';
const MD_FILE = '06-sabotage-report.md';
const LAYER_ORDER = ['domain', 'api', 'matchers', 'actors', 'fixtures', 'config'];

export default function render(ctx) {
  const jsonText = ctx.read(JSON_FILE);
  const md = ctx.read(MD_FILE);
  let muts = null;
  let problem = '';
  if (jsonText != null) {
    try { muts = fromJson(jsonText); } catch (e) { problem = `${JSON_FILE} (${e.message}); using the table in ${MD_FILE} instead`; }
  }
  if (!muts?.length && md != null) {
    const t = reportTable(md);
    muts = t ? fromTable(t) : null;
    if (!muts?.length) muts = null;
  }
  if (!muts) throw new UserError(`no readable mutations: ${ctx.rootRel}/${JSON_FILE} is missing or empty and ${ctx.rootRel}/${MD_FILE} has no mutation table (the sabotage stage has not run, or --root is wrong)`);
  const fellBack = jsonText == null && !problem ? note(`could not read: ${JSON_FILE} (not found); the mutation table of ${MD_FILE} is shown instead`) : '';

  const killed = muts.filter((m) => m.state === 'killed');
  const survived = muts.filter((m) => m.state === 'survived');
  const other = muts.filter((m) => m.state === 'other');
  const defensive = survived.filter((m) => /^defensive/i.test(m.verdict ?? '')).length;
  const rate = muts.length ? Math.round((killed.length / muts.length) * 100) : 0;

  const verdict = md && findSection(md, /verdict/i, 2);
  const body = [
    problem ? note(`could not read: ${problem}`) : fellBack,
    tiles([tile(muts.length, 'mutations run'), tile(`${killed.length} (${rate}%)`, 'killed (the tests noticed)', survived.length ? '' : 'ok'), tile(survived.length, 'survived (not noticed)', survived.length ? 'bad' : 'ok'), ...(other.length ? [tile(other.length, 'partly killed / other')] : []), ...(defensive ? [tile(defensive, 'survivors accepted as defensive')] : [])]),
    verdict ? `<div class="banner ${survived.length ? 'warn' : 'ok'}">${paragraphs(verdict.body).map((p) => `<p>${inline(p)}</p>`).join('')}</div>` : '',
    section('Heatmap: mutation class x layer', guard('heatmap', '', () => heatmap(muts))),
    section('Survivors: what the tests did not notice', md == null && survived.length ? note(`${MD_FILE} not found: the reasons and fixes are not available`) + survivorCards(survived, new Map()) : guard('survivors', md, () => survivors(survived, md))),
    section('History: before and after', md ? guard('"Before/after" section in the report', md, () => history(md)) : note(`could not read: ${MD_FILE} is missing, so there is no history`)),
    details(`All ${muts.length} mutations`, `<div class="scroll">${table(['ID', 'Class', 'Layer', 'What was broken', 'File', 'Result', 'Killed by'], muts.map((m) => [`<b>${esc(m.id)}</b>`, esc(m.cls), esc(m.layer), inline(m.what), `<code>${esc(m.file)}</code>`, resultChip(m), esc(m.killedBy ?? '-')]))}</div>`),
  ].join('\n');
  return { headline: `${muts.length} mutations: ${killed.length} killed, ${survived.length} survived${survived.length ? ` (${survived.map((m) => m.id).join(', ')})` : ''}${defensive ? `; ${defensive} accepted as defensive` : ''}`, body };
}

const stateOf = (r) => (/^killed/i.test(r) ? 'killed' : /^survived/i.test(r) ? 'survived' : 'other');

function fromJson(text) {
  const data = JSON.parse(text);
  const list = Array.isArray(data) ? data : data?.mutations;
  if (!Array.isArray(list)) throw new Error('no mutation array');
  return list.map((m, i) => ({ id: m.id ?? `M${i + 1}`, cls: m.class ?? m.mutationClass ?? 'unclassified', what: m.what ?? '', file: m.file ?? '', layer: m.layer ?? 'unknown', result: String(m.result ?? '?').toUpperCase(), state: stateOf(String(m.result ?? '')), killedBy: Array.isArray(m.killedBy) ? m.killedBy.join(', ') : m.killedBy ?? null, verdict: m.verdict ?? null }));
}

function reportTable(md) {
  return parseTables(md).find((t) => col(t, /^result/i) >= 0 && col(t, /class/i) >= 0 && col(t, /^id$/i) >= 0);
}

function fromTable(t) {
  const c = { id: col(t, /^id$/i), cls: col(t, /class/i), what: col(t, /broken|what/i), file: col(t, /file/i), res: col(t, /^result/i), by: col(t, /killed by/i) };
  return t.rows.map((r) => {
    const fileCell = c.file >= 0 ? r[c.file] : '';
    const result = plain(r[c.res]).toUpperCase();
    return { id: plain(r[c.id]), cls: plain(r[c.cls]), what: c.what >= 0 ? r[c.what].replace(/\*\*/g, '') : '', file: /`([^`]+)`/.exec(fileCell)?.[1] ?? plain(fileCell), layer: /\(([^)]+)\)\s*$/.exec(plain(fileCell))?.[1] ?? 'unknown', result, state: stateOf(result), killedBy: c.by >= 0 && !/^none/i.test(plain(r[c.by])) ? plain(r[c.by]) : null };
  });
}

const resultChip = (m) => (m.state === 'killed' ? chip('✓ KILLED', 'ok') : m.state === 'survived' ? chip('✗ SURVIVED', 'bad') : chip(`~ ${m.result}`, 'warn'));

function heatmap(muts) {
  const layers = [...new Set(muts.map((m) => m.layer))].sort((a, b) => { const ia = LAYER_ORDER.indexOf(a); const ib = LAYER_ORDER.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
  const classes = [...new Set(muts.map((m) => m.cls))];
  const head = layers.map((l) => { const mine = muts.filter((m) => m.layer === l); return `<th>${esc(l)}<br><span class="muted">${mine.filter((m) => m.state === 'killed').length} of ${mine.length} killed</span></th>`; });
  const rows = classes.map((c) => {
    const cells = layers.map((l) => {
      const here = muts.filter((m) => m.cls === c && m.layer === l);
      if (!here.length) return '<td class="empty" title="no mutation of this class in this layer">-</td>';
      const chips = here.map((m) => chip(`${m.state === 'killed' ? '✓' : m.state === 'survived' ? '✗' : '~'} ${m.id}`, m.state === 'killed' ? 'ok' : m.state === 'survived' ? 'bad' : 'warn', `${m.state === 'killed' ? 'KILLED' : m.state === 'survived' ? 'SURVIVED' : m.result}: ${m.what} | killed by: ${m.killedBy ?? 'nobody'}`)).join('');
      return `<td class="${here.some((m) => m.state === 'survived') ? 'miss' : 'hit'}">${chips}</td>`;
    });
    return `<tr><th scope="row">${esc(c)}</th>${cells.join('')}</tr>`;
  });
  return `<p class="legend"><span>${chip('✓ S01 live', 'ok')} killed: a test went red</span><span>${chip('✗ S04', 'bad')} survived: every test stayed green, a gap</span><span class="muted">All tests are live tests against the host. Hover a chip for details.</span></p><div class="scroll"><table class="heat"><thead><tr><th>Mutation class</th>${head.join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}

function survivorTable(md) {
  const sec = findSection(md, /survivors/i);
  return sec ? parseTables(sec.body).find((t) => col(t, /^id$/i) >= 0) ?? null : null;
}

function survivors(list, md) {
  if (!list.length) return `<p>${chip('✓ no survivors', 'ok')} every mutation was noticed by at least one test.</p>`;
  const t = md ? survivorTable(md) : null;
  const byId = new Map();
  if (t) t.rows.forEach((r) => byId.set(plain(r[col(t, /^id$/i)]), { verdict: col(t, /verdict/i) >= 0 ? r[col(t, /verdict/i)] : '', why: col(t, /why/i) >= 0 ? r[col(t, /why/i)] : '', fix: col(t, /strengthen|fix/i) >= 0 ? r[col(t, /strengthen|fix/i)] : '' }));
  if (t) return survivorCards(list, byId);
  const groups = md ? survivorGroups(md) : null;
  const sec = md ? findSection(md, /survivors/i) : null;
  return survivorCards(list, byId) + (groups ?? (sec?.body.trim() ? mdBlock(sec.body.trim()) : note(`could not read: the survivors section in ${MD_FILE} (why each one survives and the smallest fix)`)));
}

function survivorGroups(md) {
  const sec = findSection(md, /survivors/i);
  if (!sec) return null;
  const chunks = sec.body.split(/\n(?=Group\s+\w+\b)/).filter((c) => /^Group\s+\w+/.test(c.trim()));
  if (!chunks.length) return null;
  const intro = sec.body.split(/\n(?=Group\s+\w+\b)/)[0].trim();
  const blocks = chunks.map((c) => { const [first, ...rest] = c.trim().split('\n'); const cut = first.search(/\.\s+Priority/i); const title = cut > 0 ? first.slice(0, cut) : first.replace(/\.\s*$/, ''); const more = cut > 0 ? first.slice(cut + 1).trim() : ''; return `<div class="cardbox"><h3>${inline(title)}</h3>${more ? `<p>${inline(more)}</p>` : ''}${mdBlock(rest.join('\n').trim())}</div>`; });
  return `<h3>Why they survive and how to fix them</h3>${intro && !/^Group/.test(intro) ? `<p>${inline(intro)}</p>` : ''}<div class="groups">${blocks.join('')}</div>`;
}

function survivorCards(list, byId) {
  return `<div class="cards">${list.map((m) => { const x = byId.get(m.id); return `<div class="cardbox"><h3>${esc(m.id)} ${chip('✗ SURVIVED', 'bad')} ${x?.verdict || m.verdict ? chip(plain(x?.verdict || m.verdict).slice(0, 40), 'warn') : ''}</h3><p><b>${esc(m.cls)}</b> in <code>${esc(m.file)}</code> (${esc(m.layer)}): ${inline(m.what)}</p>${x?.why ? `<p><b>Why it survives:</b> ${inline(x.why)}</p>` : ''}${x?.fix ? `<p><b>Smallest strengthening:</b> ${inline(x.fix)}</p>` : ''}</div>`; }).join('')}</div>`;
}

function history(md) {
  const sec = findSection(md, /before\/after|before and after|history/i, 2);
  if (!sec) return '';
  const tables = parseTables(sec.body);
  const paras = paragraphs(sec.body).map((p) => `<p>${inline(p)}</p>`).join('');
  const bullets = parseList(sec.body);
  return paras + tables.map(parsedTable).join('') + (bullets.length ? details('What the latest run confirms against the history', ul(bullets.map((i) => inline(i.text)))) : '');
}

