// Stage 5 (tests): a test map built by reading specs, actors and API classes: Given/When/Then flows, checks, endpoint x UC matrix.
import { UserError } from '../context.mjs';
import { chip, details, esc, guard, inline, methodBadge, note, parsedTable, section, table, tile, tiles, unreadable } from '../html.mjs';
import { col, parseTables, plain } from '../md.mjs';
import { actorIndex, apiIndex, checksOf, collapse, stepsOf } from '../flow.mjs';
import { optionsOf, parseProjects, parseSpec, projectsFor } from '../specmodel.mjs';
import { parseClasses, parseConstants } from '../tsmodel.mjs';

const UC = /UC-[A-Z0-9]+-\d+/;

export default function render(ctx) {
  let specs = ctx.listKit('tests', /\.api\.spec\.ts$/);
  if (!specs.length) specs = ctx.listKit('tests', /\.spec\.ts$/);
  if (!specs.length) throw new UserError('input not found: no tests/**/*.api.spec.ts files under the kit root (the test-writing stage has not run)');

  const classesOf = (dir) => ctx.listKit(dir, /\.ts$/).flatMap((f) => parseClasses(ctx.readKit(f) ?? ''));
  const apis = apiIndex(classesOf('src/api'));
  const actors = actorIndex(classesOf('src/actors'), apis);
  const consts = {};
  ctx.listKit('src/domain', /\.ts$/).forEach((f) => parseConstants(ctx.readKit(f) ?? '', consts));
  const configText = ctx.readKit('playwright.config.ts');
  const projects = configText ? parseProjects(configText) : [];
  const coverageText = ctx.read('04-coverage.md');
  const cov = coverageText ? parseCoverage(coverageText) : null;

  const tests = specs.flatMap((file) => {
    const { tests: found } = parseSpec(ctx.readKit(file) ?? '');
    const inTestDir = file.replace(/^tests\//, '');
    return found.map((t) => {
      const { tags, annotations } = optionsOf(t.options, t.title);
      const seen = new Set();
      const steps = collapse([...t.hooks.flatMap((h) => stepsOf(h.body, actors, consts, seen)), ...stepsOf(t.body, actors, consts, seen)]);
      const uc = UC.exec(t.title)?.[0] ?? '';
      return { file, line: t.line, title: t.title, uc, desc: t.title.replace(/^UC-[A-Z0-9]+-\d+\s*[:.-]?\s*/, ''), describes: t.describes, tags, annotations, projects: projectsFor(inTestDir, projects), steps, receivers: seen, checks: checksOf(t.body, consts), unit: file.startsWith('tests/unit/') };
    });
  });
  const live = tests.filter((t) => !t.unit).sort((a, b) => (a.uc || '~').localeCompare(b.uc || '~') || a.file.localeCompare(b.file) || a.line - b.line);
  const unit = tests.filter((t) => t.unit);

  const used = new Map();
  live.forEach((t) => t.steps.forEach((s) => s.apis.forEach((k) => { const u = used.get(k) ?? { tests: new Set(), main: false }; u.tests.add(t.uc || t.title); if (s.kind !== 'given') u.main = true; used.set(k, u); })));
  const special = live.filter((t) => t.tags.length).length;

  const overview = tiles([
    tile(live.length, 'live tests'),
    tile(new Set(live.map((t) => t.uc).filter(Boolean)).size, 'use cases covered'),
    tile(apis.all.length ? `${used.size} of ${apis.all.length}` : '?', 'endpoints exercised'),
    tile(live.reduce((n, t) => n + t.checks.length, 0), 'checks (expect calls)'),
    tile(unit.length, 'offline unit tests'),
    tile(special, 'tagged (known issue / spike)'),
  ]);
  const legend = `<p class="legend"><span><i style="background:var(--given)"></i>GIVEN (setup)</span><span><i style="background:var(--when)"></i>WHEN (behaviour under test)</span><span><i style="background:var(--then)"></i>THEN (observation)</span><span class="muted">small grey text under a step = the endpoint it calls</span></p>`;
  const body = [
    overview,
    section('Endpoints', endpointsPart(apis, used)),
    section('Coverage matrix: endpoint x use case', guard('endpoint matrix (actor method -> API method -> URL)', '', () => matrixPart(live, apis, used))),
    section('Tests', legend + live.map((t, i) => testCard(t, cov, i === 0)).join('')),
    unit.length ? section('Offline unit tests (tests/unit)', unitPart(unit, cov)) : '',
    cov && cov.deferred ? details('Use cases not automated yet (from 04-coverage.md)', parsedTable(cov.deferred)) : '',
    cov ? '' : note('could not read: 04-coverage.md (not found); gate, status and sabotage notes are not shown on the cards'),
    `<p class="muted small">How this page is built: specs, actors and API classes are read as text (no TypeScript parser). Steps come from the calls a test makes on its actors; the endpoint behind a step comes from actor method -> API method -> the URL in its <code>http</code> call. Calls made from helpers or fixtures that are not actor methods are not seen.</p>`,
  ].join('\n');
  const checks = live.reduce((n, t) => n + t.checks.length, 0);
  return { headline: `${live.length} live tests (${new Set(live.map((t) => t.uc).filter(Boolean)).size} use cases, ${checks} checks), ${unit.length} offline unit tests, ${used.size} endpoints exercised`, body };
}

function parseCoverage(text) {
  const tables = parseTables(text);
  const map = tables.find((t) => col(t, /uc id/i) >= 0 && (col(t, /status/i) >= 0 || col(t, /project/i) >= 0));
  const unitT = tables.find((t) => /^id$/i.test(t.header[0]) && col(t, /protects/i) >= 0);
  const byUc = new Map();
  if (map) map.rows.forEach((r) => byUc.set(UC.exec(r[col(map, /uc id/i)])?.[0], { gate: plain(r[col(map, /^gate/i)] ?? ''), status: plain(r[col(map, /status/i)] ?? ''), sabotage: plain(r[col(map, /sabotage/i)] ?? '') }));
  const protects = new Map();
  if (unitT) unitT.rows.forEach((r) => protects.set(UC.exec(r[0])?.[0] ?? plain(r[0]), plain(r[col(unitT, /protects/i)])));
  const deferred = tables.find((t) => col(t, /uc ids?/i) >= 0 && col(t, /reason/i) >= 0) ?? null;
  return { byUc, protects, deferred };
}

function endpointsPart(apis, used) {
  if (!apis.all.length) return unreadable('API methods in src/api/*.ts (no http calls found)', '');
  const rows = apis.all.map((a) => {
    const u = used.get(a.key);
    return [`<b>${esc(a.name)}</b>`, `${methodBadge(a.verb)} <span class="ep">${esc(a.path)}</span>`, u ? `${u.tests.size} test${u.tests.size === 1 ? '' : 's'}${u.main ? '' : ' (setup only)'}` : chip('! not used by any test', 'warn')];
  });
  return `<div class="scroll">${table(['Name (API method)', 'Request', 'Used by'], rows)}</div>`;
}

function matrixPart(live, apis, used) {
  const cols = apis.all.filter((a) => used.has(a.key));
  if (!cols.length || !live.length) return note('Endpoint matrix not rendered: no actor call could be mapped to an API method and URL by reading the source (the page still shows the test flows below).');
  const rows = [...live].sort((a, b) => (a.uc || a.title).localeCompare(b.uc || b.title)).map((t) => {
    const cells = cols.map((c) => {
      const kinds = t.steps.filter((s) => s.apis.has(c.key)).map((s) => s.kind);
      if (!kinds.length) return '';
      return kinds.some((k) => k !== 'given') ? '<span class="dot main" title="exercised">&#9679;</span><span class="sr"> exercised</span>' : '<span class="dot setup" title="setup only">&#9675;</span><span class="sr"> setup only</span>';
    });
    return [`<b>${esc(t.uc || '?')}</b> <span class="muted small">${esc(t.desc.slice(0, 48))}${t.desc.length > 48 ? '…' : ''}</span>`, ...cells];
  });
  return `<p class="legend"><span><span class="dot main">&#9679;</span> exercised by the behaviour under test, or read to check the outcome</span><span><span class="dot setup">&#9675;</span> only used for setup</span></p><div class="scroll">${table(['Use case', ...cols.map((c) => c.name)], rows, 'matrix')}</div>`;
}

function testCard(t, cov, open) {
  const c = cov?.byUc.get(t.uc);
  const multi = t.receivers.size > 1;
  const flow = t.steps.map((s, i) => `${i ? '<span class="arrow" aria-hidden="true">&rarr;</span>' : ''}<span class="step ${s.kind}"><b>${s.kind.toUpperCase()}</b> ${multi ? `[${esc(s.receiver)}] ` : ''}${esc(s.label)}${s.count > 1 ? ` &times;${s.count}` : ''}${s.small ? `<small>${esc(s.small)}</small>` : ''}</span>`).join('');
  const chips = [...t.tags.map((x) => chip(x, 'warn')), ...t.projects.map((p) => chip(`project: ${p}`, 'info')), c?.gate ? chip(`gate: ${c.gate}`, /^yes/i.test(c.gate) ? 'ok' : 'neutral') : '', c?.status ? chip(/^pass/i.test(c.status) ? '✓ ' + c.status.slice(0, 40) : c.status.slice(0, 40), /^pass/i.test(c.status) ? 'ok' : 'warn') : ''].join('');
  const checks = t.checks.length ? `<ul class="checks">${t.checks.map((k) => `<li>${k.message != null ? esc(k.message) : `<code>expect(${esc(k.subject)})</code>`} ${k.matcher ? `<code>${k.negated ? '.not' : ''}.${esc(k.matcher)}()</code>` : ''}</li>`).join('')}</ul>` : '<p class="muted">No expect(...) calls found.</p>';
  return `<details class="test"${open ? ' open' : ''}><summary><span class="uc">${esc(t.uc || 'no UC id')}</span><span class="title">${esc(t.desc)}</span>${chips}</summary><div class="body">
${t.describes.length ? `<p class="muted small">Scenario: ${esc(t.describes.join(' > '))}</p>` : ''}
<div class="flow">${flow || '<span class="muted">no actor calls found in this test</span>'}</div>
<p class="sub">Checks (the business fact named in each expect)</p>${checks}
${t.annotations.length ? `<p class="sub">Annotations</p><ul>${t.annotations.map((a) => `<li><code>${esc(a.type)}</code> ${esc(a.description)}</li>`).join('')}</ul>` : ''}
${c?.sabotage ? `<p class="muted small">Sabotage: ${esc(c.sabotage)}</p>` : ''}
<p class="muted small">Spec: <code>${esc(t.file)}:${t.line}</code></p></div></details>`;
}

function unitPart(unit, cov) {
  return unit.map((t) => details(`<span class="uc">${esc(t.uc)}</span><span class="title">${esc(t.desc)}</span>${chip(`${t.checks.length} checks`, 'info')}`,
    `${cov?.protects.get(t.uc) ? `<p><b>Protects:</b> ${inline(cov.protects.get(t.uc))}</p>` : ''}${t.checks.length ? `<ul class="checks">${t.checks.map((k) => `<li>${k.message != null ? esc(k.message) : `<code>expect(${esc(k.subject)})</code>`} <code>${k.negated ? '.not' : ''}.${esc(k.matcher)}()</code></li>`).join('')}</ul>` : '<p class="muted">No expect(...) calls found.</p>'}<p class="muted small">Spec: <code>${esc(t.file)}:${t.line}</code></p>`)).join('');
}
