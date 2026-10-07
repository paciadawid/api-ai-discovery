// Tolerant Markdown parsing helpers: sections, tables, lists and "- Key: value" fields (no HTML output here).

const FENCE = /^\s*(```|~~~)/;

/** Headings with their line numbers, ignoring fenced code. */
export function headings(text) {
  const lines = text.split('\n');
  const heads = [];
  let fence = false;
  lines.forEach((line, i) => {
    if (FENCE.test(line)) { fence = !fence; return; }
    if (fence) return;
    const m = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (m) heads.push({ level: m[1].length, title: m[2], line: i });
  });
  return { lines, heads };
}

const sectionAt = (lines, heads, k) => {
  const h = heads[k];
  let end = lines.length;
  let ownEnd = lines.length;
  for (let j = k + 1; j < heads.length; j++) {
    if (ownEnd === lines.length) ownEnd = heads[j].line;
    if (heads[j].level <= h.level) { end = heads[j].line; break; }
  }
  return { title: h.title, level: h.level, line: h.line, body: lines.slice(h.line + 1, end).join('\n'), own: lines.slice(h.line + 1, Math.min(ownEnd, end)).join('\n') };
};

const titleMatches = (m, title) => (m instanceof RegExp ? m.test(title) : title.toLowerCase().includes(String(m).toLowerCase()));

/** All sections whose title matches; `level` restricts the heading depth. `body` includes subsections, `own` stops at the first subheading. */
export function findSections(text, matcher, level) {
  const { lines, heads } = headings(text);
  const out = [];
  heads.forEach((h, k) => {
    if ((level == null || h.level === level) && (matcher == null || titleMatches(matcher, h.title))) out.push(sectionAt(lines, heads, k));
  });
  return out;
}

export const findSection = (text, matcher, level) => findSections(text, matcher, level)[0] ?? null;

/** Split a table row on `|`, keeping `|` inside backticks and `\|`. */
export function splitRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const cells = [];
  let cur = '';
  let tick = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && s[i + 1] === '|') { cur += '|'; i++; continue; }
    if (c === '`') tick = !tick;
    if (c === '|' && !tick) { cells.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  cells.push(cur.trim());
  return cells;
}

/** Every pipe table: { heading, header, rows (padded to the header), line }. */
export function parseTables(text) {
  const lines = text.split('\n');
  const tables = [];
  let heading = '';
  let fence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (FENCE.test(line)) { fence = !fence; continue; }
    if (fence) continue;
    const h = /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
    if (h) { heading = h[1]; continue; }
    if (line.trim().startsWith('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1])) {
      const header = splitRow(line);
      const rows = [];
      let j = i + 2;
      while (j < lines.length && lines[j].trim().startsWith('|')) {
        const cells = splitRow(lines[j]);
        while (cells.length < header.length) cells.push('');
        rows.push(cells);
        j++;
      }
      tables.push({ heading, header, rows, line: i });
      i = j - 1;
    }
  }
  return tables;
}

/** Index of the first header cell matching the regex, or -1. */
export const col = (table, re) => table.header.findIndex((h) => re.test(h));

/** Strip Markdown emphasis and code ticks for plain-text use (headlines, comparisons). */
export const plain = (s) => String(s ?? '').replace(/`([^`]*)`/g, '$1').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').trim();

/** Bullet and numbered items (nested by indentation). Continuation lines are joined into the item text. */
export function parseList(text) {
  const items = [];
  const stack = [];
  let fence = false;
  let last = null;
  for (const raw of text.split('\n')) {
    if (FENCE.test(raw)) { fence = !fence; continue; }
    if (fence) continue;
    const m = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(raw);
    if (m) {
      const indent = m[1].replace(/\t/g, '    ').length;
      const item = { num: /\d/.test(m[2]) ? parseInt(m[2], 10) : null, text: m[3].trim(), children: [] };
      while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
      (stack.length ? stack[stack.length - 1].item.children : items).push(item);
      stack.push({ indent, item });
      last = item;
    } else if (raw.trim() && last && /^\s+/.test(raw)) {
      last.text += ' ' + raw.trim();
    } else if (!raw.trim()) {
      continue;
    } else if (!/^\s/.test(raw)) {
      last = null;
      stack.length = 0;
    }
  }
  return items;
}

/** Plain text of an item including its children, for raw display. */
export const itemFlat = (it) => [it.text, ...it.children.map(itemFlat)].join(' ');

/** "- Key: value" fields of a block; continuation and nested lines are kept in `rest`. */
export function parseFields(body) {
  const fields = [];
  let cur = null;
  for (const line of body.split('\n')) {
    const m = /^[-*]\s+([A-Za-z][A-Za-z0-9 /_-]*?):\s*(.*)$/.exec(line);
    if (m) { cur = { key: m[1].trim().toLowerCase(), value: m[2].trim(), rest: [] }; fields.push(cur); }
    else if (cur && line.trim()) cur.rest.push(line);
  }
  return fields;
}

export const fieldOf = (fields, re) => fields.find((f) => re.test(f.key)) ?? null;

/** Numbers found in a string (decimals allowed). */
export const numbers = (s) => (String(s ?? '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

/** Text outside fenced code blocks that is neither list, table nor heading: the prose paragraphs. */
export function paragraphs(text) {
  const out = [];
  let cur = [];
  let fence = false;
  const flush = () => { if (cur.length) out.push(cur.join(' ').trim()); cur = []; };
  for (const line of text.split('\n')) {
    if (FENCE.test(line)) { fence = !fence; flush(); continue; }
    if (fence) continue;
    if (!line.trim() || /^\s*([-*+]|\d+[.)])\s/.test(line) || line.trim().startsWith('|') || /^#{1,6}\s/.test(line)) { flush(); continue; }
    cur.push(line.trim());
  }
  flush();
  return out;
}

/** The first fenced code block of the text, or null. */
export function firstFence(text) {
  const m = /^\s*(?:```|~~~)[^\n]*\n([\s\S]*?)^\s*(?:```|~~~)/m.exec(text);
  return m ? m[1] : null;
}
