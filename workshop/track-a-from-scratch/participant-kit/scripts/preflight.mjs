// Run `npm run preflight` after `npm ci`. Prints PASS/FAIL per check; touches nothing and sends one GET.
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const base = process.env.TOOLSHOP_BASE_URL ?? 'https://api.practicesoftwaretesting.com';
let failed = 0;
const check = (name, ok, hint = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  -> ${hint}`}`);
  if (!ok) failed++;
};

const [major, minor] = process.versions.node.split('.').map(Number);
check(`Node ${process.versions.node} (needs >= 20.12)`, major > 20 || (major === 20 && minor >= 12), 'install Node 20.12+ or 22: https://nodejs.org');
check('dependencies installed', existsSync('node_modules/@playwright/test'), 'run: npm ci');
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  check('type check (npm run verify)', true);
} catch {
  check('type check (npm run verify)', false, 'run: npm run verify and read the first error');
}
try {
  const res = await fetch(`${base}/products/search?q=pliers`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
  check(`Toolshop reachable (${base}) -> HTTP ${res.status}`, res.status === 200, 'check wifi/VPN/proxy; tell the facilitator');
} catch (e) {
  check('Toolshop reachable', false, `${e.cause?.code ?? e.message}: wifi, VPN or proxy?`);
}
const env = existsSync('.env') ? readFileSync('.env', 'utf8') : '';
const hasUser = /^TOOLSHOP_EMAIL=.+/m.test(env) && /^TOOLSHOP_PASSWORD=.+/m.test(env);
console.log(`${hasUser ? 'PASS' : 'TODO'}  your user is in .env${hasUser ? '' : '  (that comes in block 1; nothing to fix now)'}`);
console.log(failed ? `\n${failed} check(s) failed. Bring it as it is: we fix installs together.` : '\nPre-flight OK');
process.exit(failed ? 1 : 0);
