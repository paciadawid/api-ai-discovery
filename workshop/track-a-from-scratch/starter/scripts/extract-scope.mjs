#!/usr/bin/env node
// Cuts a narrow scope out of a full discovery file, e.g.
//   node scripts/extract-scope.mjs --match '^EP-CART-' --out qa/workshop/cart/01-discovery
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DEFAULT_INPUT, loadEndpoints, parseArgs } from './lib/discovery.mjs';

const args = parseArgs(process.argv.slice(2));
const input = args.input ?? DEFAULT_INPUT;
const out = args.out;
if (!args.match || !out) {
  console.error('Usage: extract-scope.mjs --match <regex on endpoint id> --out <dir> [--input <endpoints.json>]');
  process.exit(1);
}

const re = new RegExp(args.match);
const picked = loadEndpoints(input).filter((e) => re.test(e.id));
if (!picked.length) {
  console.error(`No endpoint id matches ${re} in ${input}`);
  process.exit(1);
}

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'endpoints.json'), JSON.stringify({ source: input, match: args.match, endpoints: picked }, null, 2) + '\n');
const auth = join(dirname(input), 'auth.md');
if (existsSync(auth)) copyFileSync(auth, join(out, 'auth.md'));
console.log(`${picked.length} endpoints -> ${join(out, 'endpoints.json')}`);
console.log(picked.map((e) => `  ${e.id}  ${e.method} ${e.path}`).join('\n'));
