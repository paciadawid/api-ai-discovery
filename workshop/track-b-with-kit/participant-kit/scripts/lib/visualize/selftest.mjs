// `--selftest`: writes a minimal fixture kit to a temp dir, renders all stages against it, and checks the pages (exit code 0 only if all pass).
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { runStage } from './run.mjs';
import { STAGES } from './registry.mjs';

const XSS = '<script>alert(1)</script>';

const FILES = {
  'qa/feat/01-discovery/areas.md': `# Plan: demo\n\n## Units\n\n| area | unit key | entry URLs | needs login | owns state | what to find out | effort |\n|---|---|---|---|---|---|---|\n| demo | demo-add | \`/demo\` | no | own list | add item ${XSS} | S |\n| demo | demo-del | \`/demo\` | yes | own list | delete item | M |\n\n## Areas\n\n- **demo**: the demo area\n\n## Excluded (outside scope)\n\n- Checkout: orders\n\n## Shared rules\n\n- Be nice\n\n## Browser evidence\n\n\`\`\`\n- qa-scout:\n  - headed: true\n\`\`\`\n`,
  'qa/feat/01-discovery/endpoints.json': JSON.stringify([{ id: 'EP-1', method: 'POST', path: '/demo/add', purpose: 'add', verified: true, stateChanging: true, units: ['demo-add'] }, { id: 'EP-2', method: 'GET', path: '/demo', purpose: 'list', verified: false, stateChanging: false, units: ['demo-del'] }]),
  'qa/feat/01-discovery/SUMMARY.md': '# Summary\n\n## 3. Auth model\n- Anonymous guest\n\n## 4. Risks and surprises\n1. **Shared cart** the units share state\n   - seen twice\n\n## 6. Decisions needed from you\n1. **Isolate?** Recommended: yes.\n\n## 8. Gate 1 answers\n1. Isolation: yes.\n',
  'qa/feat/01-discovery/flows.md': '# Flows\n\n## Unit: demo-add\n\n### Flow 1: add\nPOST /demo/add\n',
  'qa/feat/01-discovery/auth.md': '# Auth\n\n- none needed\n',
  'qa/feat/01-discovery/open-questions.md': '# Open questions\n\n## Group\n\n1. [demo] Why?\n',
  'qa/feat/02-use-cases.md': `# Use cases\n\n## 1. Overview matrix\n\n| unit | happy-path | negative | total |\n|---|---|---|---|\n| demo-add | 1 | 1 | 2 |\n| **total** | **1** | **1** | **2** |\n\n## 4. Use cases: demo-add\n\n### UC-DEMO-01: Add an item ${XSS}\n- Area: demo\n- Type: happy-path\n- Steps:\n  1. POST /demo/add\n- Expected: the item is listed.\n- Notes: Gate: yes.\n\n### UC-DEMO-02: Add nothing\n- Area: demo\n- Type: negative\n- Expected: refused.\n`,
  'qa/feat/03-selected.md': '# Selected\n\n## Decision brief\n\n**Recommendation.** Automate one.\n\n### Decisions for the human\n\n1. **Run the spike?** Recommend: yes.\n\n## 1. Scoring table\n\n| Rank | UC ID | Title (short) | I | L | C | K | S | Arithmetic | Priority | Gate | Result |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n| 1 | UC-DEMO-01 | Add | 4 | 4 | 2 | 1 | 1 | 14/2 | 7.00 | yes | Selected |\n| 2 | UC-DEMO-02 | Nothing | 2 | 2 | 1 | 1 | 1 | 7/2 | 3.50 | yes | Deferred |\n\n## Gate 2 answers (recorded today)\n1. Yes.\n',
  'qa/feat/04-coverage.md': '# Coverage\n\n| UC ID | Gate | Spec file | Test title | Project | Status | Sabotage |\n|---|---|---|---|---|---|---|\n| UC-DEMO-01 | yes | `a.api.spec.ts` | t | cart | pass | kills M01 |\n',
  'qa/feat/05-run-report.md': '# Run report\n\n## 1. Verdict\n\n**All good.**\n\n## 2. Metrics\n\n| Metric | Before | After |\n|---|---|---|\n| Tests passing | 1 / 2 | 2 / 2 |\n\n## 3. Results by area\n\n| Area | UCs selected | Automated | Passing | Failing |\n|---|---|---|---|---|\n| demo | 1 | 1 | 1 | 0 |\n\n## 4. What was improved\n\n### Framework\n\n| Weakness | Change | Layer/file | Evidence |\n|---|---|---|---|\n| w | c | `src/x.ts` | e |\n\n### Test strength\n\n| Weakness | Change | Layer/file | Evidence |\n|---|---|---|---|\n| w | c | f | e |\n\n### Test infrastructure\n\n- i\n\n### Process\n\n- p\n\n## 5. Application bugs\n\nNone confirmed.\n\n## 6. Flaky or unresolved\n\n- none\n\n## 7. Coverage gaps\n\n- gap one\n\n## Appendix A: notes\n\ntext\n',
  'qa/feat/06-sabotage.json': JSON.stringify([{ id: 'M01', class: 'value altered', what: 'sends +1', file: 'src/api/x.ts', layer: 'api', result: 'KILLED', killedBy: 'UC-DEMO-01', where: 'live' }, { id: 'M02', class: 'matcher constant-true', what: 'always passes', file: 'src/matchers/i.ts', layer: 'matchers', result: 'SURVIVED', killedBy: null, where: null }]),
  'qa/feat/06-sabotage-report.md': '# Sabotage\n\n## 1. Verdict\n\n**1 of 2 killed.**\n\n## 4. Survivors\n\n| id | verdict | why it survives | smallest strengthening |\n|---|---|---|---|\n| M02 | REAL GAP | no test | add one |\n\n## 5. Before/after\n\n| | Round 1 | Now |\n|---|---|---|\n| Killed | 1 | 2 |\n',
  'playwright.config.ts': "export default { testDir: './tests', projects: [{ name: 'cart', testMatch: 'cart/*.api.spec.ts' }] };\n",
  'src/api/demo.api.ts': 'export class DemoApi {\n  constructor(private readonly http: Http) {}\n  addItem(id: number) {\n    return this.http.postJson(`/demo/add/${id}`);\n  }\n  list() {\n    return this.http.get(\'/demo\');\n  }\n}\n',
  'src/actors/guest.ts': "export class Guest {\n  constructor(private readonly store: Store) {}\n  // Given\n  async hasNothing(): Promise<void> {\n    await test.step('Given the guest has nothing', async () => { await this.store.demo.list(); });\n  }\n  // When\n  adds(id: number) {\n    return test.step(`When the guest adds item ${id}`, () => this.store.demo.addItem(id));\n  }\n  // Then\n  items() {\n    return this.store.demo.list();\n  }\n}\n",
  'tests/cart/a.api.spec.ts': "import { test, expect } from '@/fixtures';\ntest.describe('A guest', () => {\n  test.beforeEach(async ({ guest }) => { await guest.hasNothing(); });\n  test('UC-DEMO-01: adding an item lists it', { tag: '@smoke' }, async ({ guest }) => {\n    await guest.adds(7);\n    expect(await guest.items(), 'the item is listed').toBeTruthy();\n  });\n});\n",
};

export async function selftest() {
  const tmp = mkdtempSync(join(tmpdir(), 'visualize-selftest-'));
  const problems = [];
  try {
    for (const [rel, text] of Object.entries(FILES)) {
      mkdirSync(dirname(join(tmp, rel)), { recursive: true });
      writeFileSync(join(tmp, rel), text);
    }
    for (const st of STAGES) {
      try {
        const out = await runStage(st.key, { root: 'qa/feat/', kit: tmp, cwd: tmp });
        const html = readFileSync(join(tmp, out), 'utf8');
        if (html.length < 1500) problems.push(`${st.key}: page is almost empty`);
        if (/could not read/i.test(html)) problems.push(`${st.key}: unexpected "could not read" note for a complete fixture`);
        if (/undefined|\[object Object\]/.test(html.replace(/<style>[\s\S]*?<\/style>/, ''))) problems.push(`${st.key}: undefined or [object Object] leaked into the page`);
        if (html.includes(XSS) || html.includes(tmp)) problems.push(`${st.key}: unescaped text or an absolute path in the page`);
      } catch (e) {
        problems.push(`${st.key}: ${e.message}`);
      }
    }
    const index = readFileSync(join(tmp, 'qa/feat/visuals/index.html'), 'utf8');
    if ((index.match(/class="stagecard"/g) ?? []).length !== STAGES.length) problems.push('index.html does not link all 7 pages');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  if (problems.length) {
    console.error(`visualize selftest FAILED:\n- ${problems.join('\n- ')}`);
    return 1;
  }
  console.log(`visualize selftest ok: ${STAGES.length} of ${STAGES.length} stages rendered`);
  return 0;
}
