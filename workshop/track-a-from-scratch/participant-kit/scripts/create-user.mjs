// Registers ONE Toolshop user and saves the login to .env. Fallback for when the Postman step fails.
// The password is generated here and written only to .env (mode 0600); it is never printed.
// Users cannot be deleted on this host, so run it once per person. Needs Node >= 20.12.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';

const base = process.env.TOOLSHOP_BASE_URL ?? 'https://api.practicesoftwaretesting.com';
const nick = (process.argv[2] ?? process.env.TOOLSHOP_NICK ?? 'guest').toLowerCase().replace(/[^a-z0-9]/g, '');

if (existsSync('.env') && /^TOOLSHOP_EMAIL=.+/m.test(readFileSync('.env', 'utf8'))) {
  console.error('.env already has TOOLSHOP_EMAIL: keep that user (one per person). Delete the lines first if you really want a new one.');
  process.exit(1);
}

const email = `twz26-${nick}-${randomBytes(3).toString('hex')}@example.com`;
const password = `Tw${randomBytes(9).toString('hex')}!9aZ`; // 8+ chars with upper, lower, digit, symbol

const res = await fetch(`${base}/users/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'twz26-create-user/1.0' },
  body: JSON.stringify({ first_name: 'Twz', last_name: nick || 'guest', email, password }),
});
if (res.status !== 201) {
  console.error(`registration failed: HTTP ${res.status} ${await res.text()}`); // the reply never echoes the password
  process.exit(1);
}
writeFileSync('.env', `TOOLSHOP_EMAIL=${email}\nTOOLSHOP_PASSWORD=${password}\n`, { mode: 0o600 });
chmodSync('.env', 0o600);
console.log(`Registered ${email}. Login saved to .env (password not shown).`);
