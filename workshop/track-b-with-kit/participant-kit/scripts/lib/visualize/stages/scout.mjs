// Stage 1 (scout): renders 01-discovery/areas.md as overview tiles, a units table, exclusions, shared rules and browser evidence.
import { UserError } from '../context.mjs';
import { chip, details, effortChip, esc, guard, inline, introOf, mdBlock, note, section, table, tile, tiles, ul, unreadable } from '../html.mjs';
import { col, findSection, firstFence, parseList, parseTables, plain } from '../md.mjs';

const FILE = '01-discovery/areas.md';

export default function render(ctx) {
  const text = ctx.read(FILE);
  if (text == null) throw new UserError(`input not found: ${ctx.rootRel}/${FILE} (the scout stage has not run, or --root is wrong)`);

  const unitsTable = parseTables(text).find((t) => col(t, /unit/i) >= 0 && (col(t, /effort/i) >= 0 || col(t, /entry|url/i) >= 0));
  const units = unitsTable ? unitsRows(unitsTable) : [];
  const areaSec = findSection(text, /^areas?$/i);
  const areaItems = areaSec ? parseList(areaSec.body) : [];
  const areaNames = new Set(units.map((u) => u.area).filter(Boolean));
  const areaCount = areaNames.size || areaItems.length;
  const excluded = findSection(text, /exclu/i);
  const excludedItems = excluded ? parseList(excluded.body) : [];
  const effort = { S: 0, M: 0, L: 0 };
  units.forEach((u) => { const k = String(u.effort).trim().charAt(0).toUpperCase(); if (k in effort) effort[k]++; });
  const noLogin = units.filter((u) => /^no\b/i.test(u.login)).length;

  // "Scope decision" section appended by the orchestrator at the scope gate: "- Explored units: a, b" and "- Not explored (user's choice): c".
  const decision = findSection(text, /scope decision/i);
  const decisionItems = decision ? parseList(decision.body) : [];
  const listed = (re) => {
    const item = decisionItems.find((i) => re.test(plain(i.text)));
    return item ? plain(item.text).replace(re, '').split(/[,;]/).map((s) => s.replace(/[`*]/g, '').trim()).filter(Boolean) : [];
  };
  const chosen = new Set(listed(/^explored units?:\s*/i));
  const skipped = new Set(listed(/^not explored[^:]*:\s*/i));
  const hasDecision = Boolean(decision) && (chosen.size > 0 || skipped.size > 0);
  const scopeChip = (key) => (chosen.has(key) ? chip('EXPLORED', 'ok') : skipped.has(key) ? chip('not explored', 'warn') : '');

  const overview = tiles([
    tile(areaCount || '?', 'areas'),
    tile(units.length || '?', 'units'),
    ...(hasDecision ? [tile(`${chosen.size} of ${units.length}`, 'units chosen at the scope gate')] : []),
    tile(`${effort.S} / ${effort.M} / ${effort.L}`, 'effort S / M / L units'),
    tile(units.length ? `${noLogin} of ${units.length}` : '?', 'units that need no login'),
    tile(excludedItems.length, 'excluded from scope'),
  ]);

  const unitsHtml = guard(`units table in ${FILE}`, text, () => units.length && table(
    ['Unit', 'Area', 'Entry', 'Needs login', 'Owns state', 'Effort', ...(hasDecision ? ['Scope gate'] : [])],
    units.map((u) => [`<b>${esc(u.key)}</b>`, esc(u.area), inline(u.entry), u.login ? chip(u.login.split(/[\s(]/)[0].toLowerCase() === 'no' ? 'no login' : u.login, /^no/i.test(u.login) ? 'ok' : 'warn') : '', inline(u.owns), effortChip(u.effort), ...(hasDecision ? [scopeChip(u.key)] : [])]),
  ) + details('What each unit has to find out', ul(units.map((u) => `<b>${esc(u.key)}</b>: ${inline(u.find)}`))));

  const areasHtml = areaItems.length ? ul(areaItems.map((i) => inline(i.text))) : unreadable(`"Areas" section in ${FILE}`, text);
  const excludedHtml = excluded ? (excludedItems.length ? ul(excludedItems.map((i) => inline(i.text))) : mdBlock(excluded.body)) : unreadable(`"Excluded" section in ${FILE}`, '');
  const rules = findSection(text, /shared rules/i);
  const intro = introOf(text);

  const evidence = findSection(text, /browser evidence/i);
  const evHtml = evidence ? guard('browser evidence', evidence.body, () => evidenceLine(evidence.body)) : unreadable(`"Browser evidence" section in ${FILE}`, '');

  const body = [
    overview,
    decision ? section('Scope decision', mdBlock(decision.body)) : '',
    section('Units', unitsHtml),
    section('Areas', areasHtml),
    section('Excluded (outside scope)', excludedHtml),
    section('Browser evidence', evHtml),
    rules ? details('Shared rules', mdBlock(rules.body)) : note('could not read: "Shared rules" section'),
    intro ? details('What the scout saw', mdBlock(intro)) : '',
  ].join('\n');
  const eff = ['S', 'M', 'L'].filter((k) => effort[k]).map((k) => `${effort[k]} x ${k}`).join(', ');
  return { headline: `${areaCount} area${areaCount === 1 ? '' : 's'}, ${units.length} unit${units.length === 1 ? '' : 's'}${eff ? ` (${eff})` : ''}, ${excludedItems.length} excluded${hasDecision ? `, ${chosen.size} chosen at the scope gate` : ''}`, body };
}

function unitsRows(t) {
  const c = { key: col(t, /unit/i), area: col(t, /^area/i), entry: col(t, /entry|url/i), login: col(t, /login/i), owns: col(t, /state|owns/i), find: col(t, /find|what/i), effort: col(t, /effort/i) };
  const get = (r, k) => (c[k] >= 0 ? plain(r[c[k]]) : '');
  const raw = (r, k) => (c[k] >= 0 ? r[c[k]] : '');
  return t.rows.filter((r) => plain(r[Math.max(0, c.key)])).map((r) => ({ key: get(r, 'key'), area: get(r, 'area'), entry: raw(r, 'entry'), login: get(r, 'login'), owns: raw(r, 'owns'), find: raw(r, 'find'), effort: get(r, 'effort') }));
}

function evidenceLine(body) {
  const fence = firstFence(body) ?? body;
  const sessions = [...fence.matchAll(/^-\s+([\w.-]+):\s*$/gm)].map((m) => m[1]);
  const headed = /headed:\s*(true|false)/i.exec(fence)?.[1]?.toLowerCase();
  if (!sessions.length && !headed) return '';
  const line = `<p>${headed === 'true' ? chip('headed browser: yes', 'ok') : headed === 'false' ? chip('headed browser: NO', 'bad') : chip('headed: not stated', 'warn')} ${sessions.length ? `session${sessions.length > 1 ? 's' : ''}: ${sessions.map((s) => `<code>${esc(s)}</code>`).join(', ')}` : ''}</p>`;
  return line + details('Evidence as written', mdBlock(body));
}
