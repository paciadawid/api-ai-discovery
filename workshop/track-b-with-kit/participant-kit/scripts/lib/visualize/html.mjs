// Shared HTML layout, CSS, escaping and small components (chips, tiles, notes, tables, Markdown blocks) for all stage pages.
import { headings, parseTables, splitRow } from './md.mjs';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Inline Markdown: `code`, **bold**, [text](url) -> text. Everything is escaped. */
export function inline(s) {
  const codes = [];
  const held = esc(s).replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(`<code>${c}</code>`) - 1}\u0000`);
  return held
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\u0000(\d+)\u0000/g, (_, i) => codes[+i]);
}

export const chip = (text, kind = 'neutral', title) => `<span class="chip ${kind}"${title ? ` title="${esc(title)}"` : ''}>${esc(text)}</span>`;
export const methodBadge = (m) => `<span class="m ${esc(String(m).toUpperCase())}">${esc(String(m).toUpperCase())}</span>`;
export const tile = (value, label, kind = '') => `<div class="tile ${kind}"><b>${esc(value)}</b><span>${esc(label)}</span></div>`;
export const tiles = (list) => `<div class="overview">${list.join('')}</div>`;
export const raw = (label, text) => `<details class="raw"><summary>raw source: ${esc(label)}</summary><pre>${esc(text)}</pre></details>`;
export const note = (msg) => `<p class="note"><b aria-hidden="true">!</b> ${esc(msg)}</p>`;
export const unreadable = (what, rawText, label = '') => note(`could not read: ${what}`) + (rawText ? raw(label || what, rawText) : '');
export const details = (summary, inner, open = false) => `<details class="card"${open ? ' open' : ''}><summary>${summary}</summary><div class="body">${inner}</div></details>`;
export const section = (title, inner, id) => `<section${id ? ` id="${esc(id)}"` : ''}><h2>${esc(title)}</h2>${inner}</section>`;
export const table = (header, rows, cls = '') => `<table${cls ? ` class="${cls}"` : ''}><thead><tr>${header.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
export const ul = (items, cls = '') => `<ul${cls ? ` class="${cls}"` : ''}>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;

/** A bar with the numbers printed next to it (never color only). */
export const bar = (part, total, label, kind = 'ok') => {
  const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((part / total) * 100))) : 0;
  return `<span class="barwrap"><span class="bar"><i class="${kind}" style="width:${pct}%"></i></span><span class="barlabel">${esc(label)}</span></span>`;
};

/** Render a Markdown fragment as HTML (paragraphs, nested lists, tables, code fences, quotes, headings). */
export function mdBlock(text, headingShift = 3) {
  const lines = String(text ?? '').split('\n');
  const out = [];
  let i = 0;
  const listRe = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const fence = /^\s*(```|~~~)/.exec(line);
    if (fence) {
      const buf = [];
      i++;
      while (i < lines.length && !/^\s*(```|~~~)/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }
    const h = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (h) { out.push(`<h${Math.min(6, h[1].length + headingShift)}>${inline(h[2])}</h${Math.min(6, h[1].length + headingShift)}>`); i++; continue; }
    if (line.trim().startsWith('|') && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1] ?? '')) {
      const block = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) block.push(lines[i++]);
      const t = parseTables(block.join('\n'))[0];
      out.push(t ? table(t.header.map((x) => x.replace(/`/g, '')), t.rows.map((r) => r.map(inline))) : `<pre>${esc(block.join('\n'))}</pre>`);
      continue;
    }
    if (line.startsWith('>')) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith('>')) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`);
      continue;
    }
    if (listRe.test(line)) {
      const buf = [];
      while (i < lines.length) {
        const l = lines[i];
        if (!l.trim()) { if (listRe.test(lines[i + 1] ?? '')) { i++; continue; } break; }
        if (/^\s*(```|~~~)/.test(l) || /^#{1,6}\s/.test(l)) break;
        buf.push(l);
        i++;
      }
      out.push(renderList(buf));
      continue;
    }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !listRe.test(lines[i]) && !/^\s*(```|~~~|#{1,6}\s|\|)/.test(lines[i])) buf.push(lines[i++].trim());
    if (!buf.length) { buf.push(lines[i++].trim()); }
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return out.join('\n');
}

function renderList(buf) {
  const items = [];
  const stack = [];
  for (const raw of buf) {
    const m = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(raw);
    if (m) {
      const indent = m[1].replace(/\t/g, '    ').length;
      const it = { ordered: /\d/.test(m[2]), text: m[3], kids: [] };
      while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
      (stack.length ? stack[stack.length - 1].it.kids : items).push(it);
      stack.push({ indent, it });
    } else if (raw.trim() && stack.length) stack[stack.length - 1].it.text += ' ' + raw.trim();
  }
  const rec = (list) => {
    const tag = list[0]?.ordered ? 'ol' : 'ul';
    return `<${tag}>${list.map((it) => `<li>${inline(it.text)}${it.kids.length ? rec(it.kids) : ''}</li>`).join('')}</${tag}>`;
  };
  return items.length ? rec(items) : '';
}

export { headings, splitRow };

export const CSS = `
:root{--bg:#f6f7f9;--card:#fff;--ink:#1c2330;--muted:#5d6879;--line:#dde2ea;--given:#5b6472;--when:#2563eb;--then:#15803d;--bug:#92400e;--bugbg:#fff4e0;--ok:#166534;--okbg:#e6f6ec;--bad:#991b1b;--badbg:#fdeaea;--warn:#92400e;--warnbg:#fff4e0;--info:#1e40af;--infobg:#e8effd;
--get:#0e7490;--post:#7c3aed;--put:#b45309;--delete:#b91c1c;--patch:#4d7c0f}
*{box-sizing:border-box}
body{margin:0;font:15px/1.5 -apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--ink)}
header.top{padding:24px 32px 8px;max-width:1100px;margin:0 auto}
header.top h1{margin:0 0 4px;font-size:26px}
header.top .meta{color:var(--muted);font-size:13px;margin:2px 0}
header.top .meta code{background:#eef1f6;padding:1px 5px;border-radius:4px}
header.top a{color:var(--info)}
main{max-width:1100px;margin:0 auto;padding:8px 32px 48px}
h2{margin:30px 0 12px;font-size:18px}h3{font-size:15px;margin:16px 0 6px}h4,h5,h6{font-size:14px;margin:12px 0 4px}
code,.ep{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px}
p{margin:6px 0}pre{background:#eef1f6;padding:10px 12px;border-radius:8px;overflow:auto;font-size:12.5px;max-height:480px}
blockquote{margin:8px 0;padding:4px 12px;border-left:3px solid var(--line);color:var(--muted)}
.overview{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.tile{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px}
.tile b{display:block;font-size:22px}.tile span{color:var(--muted);font-size:13px}
.tile.bad{border-color:#e7a3a3;background:var(--badbg)}.tile.ok{border-color:#9fd3b0}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden;font-size:14px}
th,td{text-align:left;padding:8px 12px;border-bottom:1px solid var(--line);vertical-align:top}
th{background:#eef1f6;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
tr:last-child td{border-bottom:0}.scroll{overflow-x:auto}
.m{display:inline-block;min-width:46px;text-align:center;padding:1px 6px;border-radius:4px;color:#fff;font-size:11px;font-weight:700}
.m.GET{background:var(--get)}.m.POST{background:var(--post)}.m.PUT{background:var(--put)}.m.DELETE{background:var(--delete)}.m.PATCH{background:var(--patch)}
.chip{display:inline-block;font-size:11.5px;font-weight:600;padding:1px 8px;border-radius:99px;border:1px solid var(--line);background:#eef1f6;color:var(--ink);white-space:nowrap;margin:1px 2px 1px 0}
.chip.ok{background:var(--okbg);color:var(--ok);border-color:#9fd3b0}.chip.bad{background:var(--badbg);color:var(--bad);border-color:#e7a3a3}
.chip.warn{background:var(--warnbg);color:var(--warn);border-color:#f0cf98}.chip.info{background:var(--infobg);color:var(--info);border-color:#b5c8f3}
.note{background:var(--warnbg);color:var(--warn);border:1px solid #f0cf98;border-radius:8px;padding:8px 12px;margin:10px 0}
.note b{display:inline-block;width:18px;height:18px;line-height:18px;text-align:center;border-radius:50%;background:var(--warn);color:#fff;margin-right:6px;font-size:12px}
details.card,details.test{background:var(--card);border:1px solid var(--line);border-radius:12px;margin:10px 0;overflow:hidden}
details.card>summary,details.test>summary{cursor:pointer;padding:12px 16px;display:flex;gap:12px;align-items:baseline;flex-wrap:wrap;list-style:none}
details>summary::-webkit-details-marker{display:none}
details.card>summary::before,details.test>summary::before{content:"\\25B8";color:var(--muted)}
details[open].card>summary::before,details[open].test>summary::before{content:"\\25BE"}
details .body{padding:4px 16px 16px;border-top:1px solid var(--line)}
details.raw{margin:8px 0;color:var(--muted);font-size:13px}details.raw summary{cursor:pointer}
.uc{font-weight:700;white-space:nowrap}.title{flex:1;min-width:200px}
.flow{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:14px 0 6px}
.step{border-radius:8px;padding:5px 10px;color:#fff;font-size:12.5px;max-width:330px}
.step small{display:block;opacity:.92;font-family:ui-monospace,Menlo,monospace;font-size:11px}
.step.given{background:var(--given)}.step.when{background:var(--when)}.step.then{background:var(--then)}
.step b{font-size:10.5px;letter-spacing:.05em;margin-right:4px;opacity:.95}
.arrow{color:var(--muted)}
.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:var(--muted);margin:8px 0}
.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px}
ul.checks{margin:8px 0 0;padding:0;list-style:none}ul.checks li{padding:4px 0 4px 26px;position:relative}
ul.checks li::before{content:"\\2713";position:absolute;left:4px;color:var(--then);font-weight:700}
.sub{margin:14px 0 4px;font-weight:600;font-size:12.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
.matrix td,.matrix th{text-align:center;padding:6px 8px}.matrix td:first-child,.matrix th:first-child{text-align:left}
.dot{font-size:15px;line-height:1}.dot.setup{color:var(--given)}.dot.main{color:var(--when)}
.barwrap{display:flex;align-items:center;gap:8px}.bar{display:inline-block;flex:1;min-width:80px;height:12px;background:#e3e7ee;border-radius:6px;overflow:hidden}
.bar i{display:block;height:100%;background:var(--when)}.bar i.ok{background:#2e9d5b}.bar i.bad{background:#d14343}.bar i.sel{background:var(--when)}.bar i.def{background:#8a94a6}
.barlabel{font-size:12.5px;white-space:nowrap;min-width:64px}
.rank{display:grid;grid-template-columns:34px 112px minmax(160px,1.2fr) minmax(140px,2fr) 112px;gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid var(--line);font-size:13.5px}
.rank .t{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rt td.n,.rt th:nth-child(n+5):nth-last-child(n+3){text-align:center}.factors{display:grid;grid-template-columns:auto 1fr;gap:3px 10px;margin:8px 0;font-size:13px;color:var(--muted)}.factors dt{font-weight:700;color:var(--ink);text-align:center;min-width:22px;background:#eef1f6;border-radius:5px}.factors dd{margin:0}.factors dd b{color:var(--ink)}.rt td{vertical-align:middle}.rt td:nth-child(2),.rt td:nth-child(4){white-space:nowrap}.rt td:nth-child(3){width:42%}.rt td.n{width:34px;padding-left:6px;padding-right:6px}.rt td.sc{min-width:150px}.rt td.sc .bar{min-width:70px}.rt tr.def td{color:#4a5568}.rt tr.cutrow td{background:#fff7e0;color:var(--muted);font-size:12px;text-align:center;padding:3px}.cut{border-top:2px dashed var(--muted);margin:4px 0;color:var(--muted);font-size:12px;padding-top:2px}
.banner{border-radius:12px;padding:16px 20px;margin:16px 0;border:1px solid var(--line);background:var(--card)}
.banner.ok{background:var(--okbg);border-color:#9fd3b0}.banner.bad{background:var(--badbg);border-color:#e7a3a3}.banner.warn{background:var(--warnbg);border-color:#f0cf98}
.banner .lead{font-size:17px;font-weight:700;margin-bottom:4px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:12px}
.cardbox{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 16px}
.cardbox h3{margin-top:0}.cardbox .item{border-top:1px solid var(--line);padding:8px 0}.cardbox .item:first-of-type{border-top:0}
.metric .row{font-size:13.5px;color:var(--muted)}.metric .row b{color:var(--ink)}.metric .delta{font-weight:700;margin-top:4px}
.heat th{text-transform:none;letter-spacing:0;font-size:11px}.heat td,.heat th{padding:6px;font-size:11.5px;vertical-align:top;text-align:left;min-width:78px}
.heat td.hit{background:var(--okbg)}.heat td.miss{background:var(--badbg)}.heat td.empty{background:#f3f4f7;color:#9aa3b2;text-align:center}
.heat .chip{display:inline-block;white-space:nowrap;margin:2px 3px 2px 0;font-size:11px;border-radius:6px}.heat th[scope=row]{min-width:190px;font-weight:600}.groups{display:grid;gap:12px}
.stages{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}
a.stagecard{display:block;text-decoration:none;color:inherit;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
a.stagecard:hover{border-color:var(--when)}.stagecard.missing{opacity:.75;border-style:dashed}
.stagecard h3{margin:0 0 4px}.stagecard .gen{color:var(--muted);font-size:12.5px}
.muted{color:var(--muted)}.small{font-size:12.5px}.sr{position:absolute;left:-9999px}
footer{color:var(--muted);font-size:13px;margin:32px auto;max-width:1100px;padding:0 32px}
`;

/** The full HTML document. `sources` are kit-relative paths. */
export function page({ stage, stageTitle, feature, generated, sources, headline, body, indexHref = 'index.html' }) {
  const codes = sources.map((s) => `<code>${esc(s)}</code>`).join(' ');
  const src = !sources.length ? '<span class="muted">none</span>' : sources.length > 8 ? `<details class="raw" style="display:inline"><summary style="display:inline">${sources.length} files (click to list)</summary>${codes}</details>` : codes;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(stageTitle)}: ${esc(feature)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="vis-stage" content="${esc(stage)}">
<meta name="vis-title" content="${esc(stageTitle)}">
<meta name="vis-generated" content="${esc(generated)}">
<meta name="vis-headline" content="${esc(headline)}">
<style>${CSS}</style>
</head>
<body>
<header class="top">
  <h1>${esc(stageTitle)}: ${esc(feature)}</h1>
  <p class="meta">Feature <b>${esc(feature)}</b> &middot; generated ${esc(generated)} &middot; <a href="${esc(indexHref)}">all stages (index.html)</a></p>
  <p class="meta">Sources: ${src}</p>
</header>
<main>
${body}
</main>
<footer>Generated by <code>scripts/visualize.mjs</code> from the files listed above. No network, no AI.</footer>
</body>
</html>
`;
}

/** Run a section renderer; an empty result or an error becomes a visible "could not read" note plus the raw source. */
export function guard(what, rawText, fn) {
  try {
    return fn() || unreadable(what, rawText);
  } catch (e) {
    return unreadable(`${what} (${e.message})`, rawText);
  }
}

/** Text before the first `## ` heading, minus the H1 line. */
export function introOf(text) {
  const { lines, heads } = headings(text);
  const first = heads.find((h) => h.level === 2);
  return lines.slice(0, first ? first.line : lines.length).filter((l) => !/^#\s/.test(l)).join('\n').trim();
}

export const effortChip = (e) => {
  const L = String(e ?? '').trim().charAt(0).toUpperCase();
  const kind = { S: 'ok', M: 'warn', L: 'bad' }[L];
  const words = { S: 'small', M: 'medium', L: 'large' }[L];
  return kind ? chip(`${L} (${words})`, kind) : chip(String(e || '?'), 'neutral');
};

/** A parsed Markdown table (from md.parseTables) as an HTML table with inline Markdown in the cells. */
export const parsedTable = (t) => `<div class="scroll">${table(t.header.map((h) => h.replace(/[`*]/g, '')), t.rows.map((r) => r.map(inline)))}</div>`;
