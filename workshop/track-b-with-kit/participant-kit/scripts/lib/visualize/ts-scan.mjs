// Careful string/regex scanning of TypeScript source (no parser): literals, comments, bracket matching, top-level splitting.

/** Index after the literal or comment starting at i, or i when none starts there. */
export function skipLiteral(src, i) {
  const c = src[i];
  const n = src[i + 1];
  if (c === '/' && n === '/') { const e = src.indexOf('\n', i); return e < 0 ? src.length : e; }
  if (c === '/' && n === '*') { const e = src.indexOf('*/', i + 2); return e < 0 ? src.length : e + 2; }
  if (c === "'" || c === '"') {
    let j = i + 1;
    while (j < src.length && src[j] !== c) { if (src[j] === '\\') j++; if (src[j] === '\n') break; j++; }
    return j + 1;
  }
  if (c === '`') {
    let j = i + 1;
    while (j < src.length && src[j] !== '`') {
      if (src[j] === '\\') { j += 2; continue; }
      if (src[j] === '$' && src[j + 1] === '{') { const e = matchClose(src, j + 1); j = e < 0 ? src.length : e + 1; continue; }
      j++;
    }
    return j + 1;
  }
  return i;
}

const OPEN = '([{';
const CLOSE = ')]}';

/** Index of the bracket closing the one at openIdx, or -1. */
export function matchClose(src, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    const j = skipLiteral(src, i);
    if (j !== i) { i = j - 1; continue; }
    if (OPEN.includes(src[i])) depth++;
    else if (CLOSE.includes(src[i]) && --depth === 0) return i;
  }
  return -1;
}

/** The source with comments blanked out (same length, so positions stay valid). */
export function stripComments(src) {
  let out = '';
  for (let i = 0; i < src.length;) {
    const j = skipLiteral(src, i);
    const isComment = src[i] === '/' && (src[i + 1] === '/' || src[i + 1] === '*');
    out += isComment ? src.slice(i, j).replace(/[^\n]/g, ' ') : src.slice(i, j > i ? j : i + 1);
    i = j > i ? j : i + 1;
  }
  return out;
}

/** Split src[start,end) on top-level commas. `angles` also nests `<...>` (for parameter lists). */
export function splitTop(src, start, end, angles = false) {
  const parts = [];
  let depth = 0;
  let from = start;
  for (let i = start; i < end; i++) {
    const j = skipLiteral(src, i);
    if (j !== i) { i = j - 1; continue; }
    const c = src[i];
    if (OPEN.includes(c) || (angles && c === '<')) depth++;
    else if (CLOSE.includes(c) || (angles && c === '>' && src[i - 1] !== '=')) depth--;
    else if (c === ',' && depth === 0) { parts.push({ text: src.slice(from, i), start: from }); from = i + 1; }
  }
  if (src.slice(from, end).trim()) parts.push({ text: src.slice(from, end), start: from });
  return parts;
}

/** Value of a single string/template literal (templates keep `${...}`), or null. */
export function readString(text) {
  const t = text.trim();
  if (!t || !"'\"`".includes(t[0]) || skipLiteral(t, 0) !== t.length) return null;
  return t.slice(1, -1).replace(/\\(['"`\\])/g, '$1').replace(/\\n/g, ' ');
}

/** Arguments of the call whose `(` is at openIdx: [{ text, start }] plus the closing index. */
export function callArgs(src, openIdx) {
  const close = matchClose(src, openIdx);
  return close < 0 ? { args: [], close: -1 } : { args: splitTop(src, openIdx + 1, close), close };
}
