#!/usr/bin/env node
// Mechanical enforcement of the framework rules in .claude/rules/. Run: npm run lint:framework
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const rel = (p) => relative(root, p).split(sep).join('/');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const safeWalk = (dir) => {
  try {
    return walk(join(root, dir));
  } catch {
    return [];
  }
};

const violations = [];
const fail = (file, line, rule, hint) => violations.push(`${file}:${line}  [${rule}] ${hint}`);

function scan(file, pattern, rule, hint) {
  readFileSync(join(root, file), 'utf8')
    .split('\n')
    .forEach((text, i) => {
      if (pattern.test(text) && !/^\s*(\/\/|\*)/.test(text)) fail(file, i + 1, rule, hint);
    });
}

const allTestFiles = safeWalk('tests').map(rel).filter((f) => f !== 'tests/.gitkeep');
const specs = allTestFiles.filter((f) => f.endsWith('.api.spec.ts'));

for (const file of allTestFiles) {
  if (!/^tests\/[a-z0-9-]+\/[a-z0-9-]+\.api\.spec\.ts$/.test(file)) fail(file, 1, 'layout', 'tests live only as tests/<area>/<capability>.api.spec.ts; helpers belong in src/');
}

const sources = safeWalk('src').map(rel).filter((f) => f.endsWith('.ts'));

for (const file of specs) {
  const text = readFileSync(join(root, file), 'utf8');
  scan(file, /from\s+['"]@playwright\/test['"]/, 'spec-imports', "import { test, expect } from '@/fixtures', never from @playwright/test");
  scan(file, /\b(request|context)\.(get|post|put|delete|patch|fetch)\(|\bfetch\(/, 'no-raw-http', 'raw HTTP in a spec: add a Shopper method (actor) instead');
  scan(file, /\bprocess\.env\b/, 'no-env-in-spec', 'read configuration through src/config/env.ts');
  scan(file, /\bwaitForTimeout\b|\bsetTimeout\b/, 'no-sleeps', 'no fixed sleeps; poll with expect.poll or fix the cause');
  scan(file, /\b(test|describe)\.only\b/, 'no-only', 'remove .only');
  scan(file, /\.(innerHTML|match|exec)\(|new RegExp\(|JSON\.parse/, 'no-parsing-in-spec', 'parsing belongs in src/domain (a parser), not in a spec');
  for (const m of text.matchAll(/\btest\(\s*(['"`])(.*?)\1/g)) {
    if (!/^UC-[A-Z0-9]+-\d+[a-z]?:\s+\S/.test(m[2])) {
      const line = text.slice(0, m.index).split('\n').length;
      fail(file, line, 'title', `title must start with "UC-<AREA>-<NN>: " followed by a behaviour: "${m[2]}"`);
    }
  }
  if (!/test\.describe\(/.test(text)) fail(file, 1, 'describe', 'group tests in a test.describe named after the situation or capability');
  const length = text.split('\n').length;
  if (length > 150) fail(file, length, 'spec-length', `${length} lines: split the spec by capability (about 150 lines at most)`);
}

for (const file of sources) {
  if (file !== 'src/config/env.ts') scan(file, /\bprocess\.env\b/, 'env-only-in-config', 'only src/config/env.ts may read process.env');
  if (file.startsWith('src/domain/') || file.startsWith('src/api/')) {
    scan(file, /^import\s+(?!type\b)[^;]*from\s+['"]@playwright\/test['"]/, 'layering', 'api/ and domain/ are Playwright-free at runtime (use "import type")');
  }
  if (file.startsWith('src/domain/')) scan(file, /@\/(api|actors|fixtures)\b/, 'layering', 'domain/ must not depend on api/, actors/ or fixtures/');
  if (file.startsWith('src/api/')) scan(file, /@\/(actors|fixtures|matchers)\b/, 'layering', 'api/ must not depend on actors/, fixtures/ or matchers/');
  if (file.startsWith('src/actors/')) scan(file, /@\/fixtures\b/, 'layering', 'actors/ must not depend on fixtures/');
  scan(file, /\b(console\.(log|info|debug)|attach)\([^)]*(password|cookie|token)/i, 'secrets', 'never log or attach secrets');
}

// Secrets must never be hard-coded anywhere tracked.
const secretPattern = /(password|passwd|secret|api[_-]?key|token)\s*[:=]\s*['"][^'"\s]{4,}['"]/i;
for (const file of [...safeWalk('src'), ...safeWalk('tests'), ...safeWalk('scripts')].map(rel)) {
  if (!/\.(ts|mjs|js)$/.test(file)) continue;
  scan(file, secretPattern, 'hard-coded-secret', 'move the value to .env and read it through src/config/env.ts');
}

if (violations.length) {
  console.error(`Framework check failed (${violations.length}):\n` + violations.map((v) => `  ${v}`).join('\n'));
  process.exit(1);
}
console.log(`Framework check passed: ${specs.length} spec(s), ${sources.length} source file(s).`);
