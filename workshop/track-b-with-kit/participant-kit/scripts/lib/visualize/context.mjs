// Run context for one stage: resolves the root, reads source files (and records which were used), writes pages, rebuilds index.html.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { STAGES } from './registry.mjs';
import { chip, esc, page, section } from './html.mjs';

export class UserError extends Error {}

const slash = (p) => p.split(sep).join('/');

export function makeContext({ root, kit, cwd }) {
  const abs = resolve(cwd, root);
  if (!existsSync(abs) || !statSync(abs).isDirectory()) throw new UserError(`root directory not found: ${root} (run from the kit root or pass --root <dir>)`);
  const name = abs.split(sep).filter(Boolean).pop() ?? 'qa';
  const used = new Set();
  const relRoot = slash(relative(kit, abs)) || '.';
  const shownRoot = relRoot.startsWith('..') ? slash(root).replace(/\/+$/, '') : relRoot;
  const rel = (p) => slash(relative(kit, p));
  const readAbs = (p) => {
    if (!existsSync(p) || !statSync(p).isFile()) return null;
    try { const text = readFileSync(p, 'utf8'); used.add(rel(p)); return text; } catch { return null; }
  };
  /** Recursively list files under a kit-relative directory whose name matches `re`; sorted, kit-relative. */
  const listKit = (dir, re) => {
    const start = join(kit, dir);
    const out = [];
    const walk = (d) => {
      if (!existsSync(d)) return;
      for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        if (e.name === 'node_modules') continue;
        const p = join(d, e.name);
        if (e.isDirectory()) walk(p); else if (re.test(e.name)) out.push(rel(p));
      }
    };
    walk(start);
    return out;
  };
  return {
    kit, rootAbs: abs, rootRel: shownRoot, feature: name === 'qa' ? 'QA' : name, used,
    read: (p) => readAbs(join(abs, p)),
    readKit: (p) => readAbs(join(kit, p)),
    existsKit: (p) => existsSync(join(kit, p)),
    listKit, rel,
    visualsDir: join(abs, 'visuals'),
  };
}

export const timestamp = (d = new Date()) => `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;

export function writePage(ctx, stage, doc) {
  mkdirSync(ctx.visualsDir, { recursive: true });
  const file = join(ctx.visualsDir, `${stage.nn}-${stage.key}.html`);
  writeFileSync(file, doc);
  return file;
}

const meta = (html, name) => {
  const m = new RegExp(`<meta name="${name}" content="([^"]*)"`).exec(html);
  return m ? m[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') : '';
};

/** Rebuild visuals/index.html from the pages that exist. Returns the file path. */
export function writeIndex(ctx, generated) {
  mkdirSync(ctx.visualsDir, { recursive: true });
  const sources = [];
  const cards = STAGES.map((st) => {
    const fname = `${st.nn}-${st.key}.html`;
    const p = join(ctx.visualsDir, fname);
    if (!existsSync(p)) {
      return `<div class="stagecard missing"><h3>${esc(st.nn)} &middot; ${esc(st.title)} ${chip('not generated yet', 'warn')}</h3><p class="gen">Run <code>node scripts/visualize.mjs ${esc(st.key)} --root ${isAbsolute(ctx.rootRel) ? '&lt;root&gt;' : esc(ctx.rootRel) + '/'}</code></p><p class="small muted">${esc(st.hint)}</p></div>`;
    }
    const html = readFileSync(p, 'utf8');
    sources.push(`${ctx.rel(ctx.visualsDir)}/${fname}`);
    return `<a class="stagecard" href="${esc(fname)}"><h3>${esc(st.nn)} &middot; ${esc(st.title)} ${chip('available', 'ok')}</h3><p class="gen">generated ${esc(meta(html, 'vis-generated'))}</p><p>${esc(meta(html, 'vis-headline'))}</p></a>`;
  });
  const body = section('Stages', `<div class="stages">${cards.join('')}</div>`);
  const doc = page({ stage: 'index', stageTitle: 'QA stage visuals', feature: ctx.feature, generated, sources, headline: `${sources.length} of ${STAGES.length} stage pages generated`, body });
  const file = join(ctx.visualsDir, 'index.html');
  writeFileSync(file, doc);
  return file;
}

