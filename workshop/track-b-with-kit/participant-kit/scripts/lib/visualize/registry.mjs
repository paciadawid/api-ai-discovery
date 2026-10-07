// The stage table: key, output number, page title, one-line hint, and the renderer module.
export const STAGES = [
  { key: 'scout', nn: '01', title: 'Scout: discovery plan', hint: 'Areas, units, effort, exclusions (01-discovery/areas.md).', mod: './stages/scout.mjs' },
  { key: 'discovery', nn: '02', title: 'Discovery: endpoints and flows', hint: 'Endpoints, risks, decisions, auth, flows (01-discovery/*).', mod: './stages/discovery.mjs' },
  { key: 'usecases', nn: '03', title: 'Use cases', hint: 'Use-case matrix and list (02-use-cases.md).', mod: './stages/usecases.mjs' },
  { key: 'selected', nn: '04', title: 'Selected use cases', hint: 'Ranked scores and the selection (03-selected.md).', mod: './stages/selected.mjs' },
  { key: 'tests', nn: '05', title: 'Test map', hint: 'What each test does and checks (tests/, src/, 04-coverage.md).', mod: './stages/tests.mjs' },
  { key: 'run', nn: '06', title: 'Run report', hint: 'Verdict, metrics, improvements, bugs (05-run-report.md).', mod: './stages/run.mjs' },
  { key: 'sabotage', nn: '07', title: 'Sabotage: do the tests catch bugs?', hint: 'Mutation heatmap and survivors (06-sabotage.json / report).', mod: './stages/sabotage.mjs' },
];
export const stageByKey = (k) => STAGES.find((s) => s.key === k);
