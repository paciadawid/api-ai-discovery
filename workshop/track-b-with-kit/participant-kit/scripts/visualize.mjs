#!/usr/bin/env node
// CLI: node scripts/visualize.mjs <stage> [--root <dir>] | --selftest. Renders one stage page (and index.html) from the files a stage wrote.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runStage, STAGE_KEYS } from './lib/visualize/run.mjs';
import { UserError } from './lib/visualize/context.mjs';

const KIT = join(dirname(fileURLToPath(import.meta.url)), '..');
const usage = `usage: node scripts/visualize.mjs <${STAGE_KEYS.join('|')}> [--root <dir>]\n       node scripts/visualize.mjs --selftest`;

async function main(argv) {
  if (argv.includes('--selftest')) {
    const { selftest } = await import('./lib/visualize/selftest.mjs');
    return selftest();
  }
  const rootAt = argv.indexOf('--root');
  const root = rootAt >= 0 ? argv[rootAt + 1] : (argv.find((a) => a.startsWith('--root='))?.slice(7) ?? 'qa/');
  const stage = argv.find((a, i) => !a.startsWith('--') && (rootAt < 0 || i !== rootAt + 1));
  if (!stage || !STAGE_KEYS.includes(stage) || !root) throw new UserError(`unknown or missing stage.\n${usage}`);
  console.log(await runStage(stage, { root, kit: KIT, cwd: process.cwd() }));
}

main(process.argv.slice(2)).then((code) => process.exit(code ?? 0)).catch((e) => {
  console.error(e instanceof UserError ? `visualize: ${e.message}` : `visualize: unexpected error: ${e?.stack ?? e}`);
  process.exit(1);
});
