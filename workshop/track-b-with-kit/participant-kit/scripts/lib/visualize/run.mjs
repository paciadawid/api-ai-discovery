// Runs one stage: build the context, call the stage renderer, write the page, refresh index.html, return the printed path.
import { readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { makeContext, timestamp, writeIndex, writePage, UserError } from './context.mjs';
import { STAGES, stageByKey } from './registry.mjs';
import { note, page, raw } from './html.mjs';

export const STAGE_KEYS = [...STAGES.map((s) => s.key), 'index'];

const shown = (cwd, file) => {
  const r = relative(cwd, file);
  return (r.startsWith('..') ? file : r).split(sep).join('/');
};

export async function runStage(key, { root, kit, cwd, now = new Date() }) {
  const ctx = makeContext({ root, kit, cwd });
  const generated = timestamp(now);
  if (key === 'index') return shown(cwd, writeIndex(ctx, generated));
  const stage = stageByKey(key);
  if (!stage) throw new UserError(`unknown stage: ${key}`);
  const { default: render } = await import(stage.mod);
  let headline;
  let body;
  try {
    ({ headline, body } = render(ctx));
  } catch (e) {
    if (e instanceof UserError) throw e;
    headline = 'could not read the inputs of this stage';
    body = note(`could not read: ${stage.title} (${e.message})`) + [...ctx.used].map((p) => raw(p, readFileSync(join(kit, p), 'utf8').slice(0, 200000))).join('');
  }
  const doc = page({ stage: key, stageTitle: stage.title, feature: ctx.feature, generated, sources: [...ctx.used], headline, body });
  const file = writePage(ctx, stage, doc);
  writeIndex(ctx, generated);
  return shown(cwd, file);
}
