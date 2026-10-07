// Builds the Given -> When -> Then flow and the checks of a test from its body, using the actor and API models.
import { callArgs, matchClose, readString } from './ts-scan.mjs';
import { evalSimple, fillTemplate } from './tsmodel.mjs';

const words = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
const THEN_NAME = /^(sees?|reads?|gets?|is|are|can|should|expects?|checks?|verif\w*|find|list|view|show)/i;

/** Map methodName -> { kind, step, params, apis: Set<apiKey>, name } for every actor class method. */
export function actorIndex(actorClasses, apis) {
  const methods = new Map();
  actorClasses.forEach((c) => c.methods.forEach((m) => methods.set(m.name, m)));
  const apiKeys = (m, seen = new Set()) => {
    if (seen.has(m.name)) return new Set();
    seen.add(m.name);
    const out = new Set(m.apiCalls.map((c) => apis.find(c.via, c.name)).filter(Boolean));
    m.selfCalls.forEach((n) => { const sub = methods.get(n); if (sub) apiKeys(sub, seen).forEach((k) => out.add(k)); });
    return out;
  };
  const index = new Map();
  for (const m of methods.values()) {
    const prefix = /^(given|when|then)\b/i.exec(m.step ?? '')?.[1]?.toLowerCase();
    const kind = prefix ?? (m.section === 'given' || m.section === 'when' || m.section === 'then' ? m.section : /^(has|have|given|with)/i.test(m.name) ? 'given' : THEN_NAME.test(m.name) ? 'then' : 'when');
    index.set(m.name, { name: m.name, kind, step: m.step ? m.step.replace(/^(given|when|then)\s+/i, '') : null, params: m.params, apis: apiKeys(m) });
  }
  return index;
}

/** An API lookup over the parsed API classes: key `Class.method` -> { name, verb, path }. */
export function apiIndex(apiClasses) {
  const all = [];
  apiClasses.forEach((c) => c.methods.forEach((m) => { if (m.http) all.push({ key: `${c.name}.${m.name}`, cls: c.name, name: m.name, verb: m.http.verb, path: m.http.path }); }));
  return {
    all,
    find(via, name) {
      const hit = all.filter((a) => a.name === name);
      const pick = hit.length > 1 ? hit.find((a) => via && a.cls.toLowerCase().startsWith(via.toLowerCase())) ?? hit[0] : hit[0];
      return pick?.key;
    },
    get: (key) => all.find((a) => a.key === key),
  };
}

const short = (s, n = 60) => (s.replace(/\s+/g, ' ').trim().length > n ? s.replace(/\s+/g, ' ').trim().slice(0, n - 1) + '…' : s.replace(/\s+/g, ' ').trim());

function bindArgs(method, args) {
  const b = {};
  method.params.forEach((p, i) => { b[p.name] = args[i] != null ? args[i].text.trim() : p.def; });
  return b;
}

function resolver(binds, consts) {
  return (e) => {
    const m = /^(\w+)((?:\.\w+)?)$/.exec(e);
    if (!m || !(m[1] in binds) || binds[m[1]] == null) return m ? (m[2] ? `the ${m[1]}` : m[1]) : '…';
    const arg = binds[m[1]];
    const v = evalSimple(m[2] ? arg + m[2] : arg, consts);
    return v ?? (m[2] ? `the ${m[1]}` : /^[\w.]+$/.test(arg) ? arg : m[1]);
  };
}

/** Steps (in code order) of a function body: [{ kind, label, small, receiver, apis, method }]. */
export function stepsOf(body, actors, consts, receiversSeen = new Set()) {
  const steps = [];
  for (const m of body.matchAll(/\b([A-Za-z_]\w*)\.(\w+)\s*\(/g)) {
    const actor = actors.get(m[2]);
    if (!actor || ['expect', 'test', 'this', 'Promise', 'JSON', 'Math', 'Object', 'Array', 'console'].includes(m[1])) continue;
    const { args } = callArgs(body, m.index + m[0].length - 1);
    const binds = bindArgs(actor, args);
    const res = resolver(binds, consts);
    let label;
    if (actor.step) label = fillTemplate(actor.step, res);
    else if (actor.kind === 'then') label = `reads ${/^all/.test(actor.name) ? '' : 'the '}${words(actor.name)}`;
    else label = `${words(actor.name)}${args.length ? ` (${short(args.map((a) => a.text.trim()).join(', '), 40)})` : ''}`;
    receiversSeen.add(m[1]);
    steps.push({ kind: actor.kind, label, small: [...actor.apis].map((k) => k.split('.')[1]).join(', '), receiver: m[1], apis: actor.apis, method: actor.name });
  }
  return steps;
}

/** Collapse identical consecutive steps into one with a count. */
export function collapse(steps) {
  const out = [];
  for (const s of steps) {
    const last = out[out.length - 1];
    if (last && last.label === s.label && last.receiver === s.receiver && last.kind === s.kind) last.count++;
    else out.push({ ...s, count: 1 });
  }
  return out;
}

/** The expect(...) calls of a body: [{ message, matcher, negated, subject }]. */
export function checksOf(body, consts) {
  const out = [];
  for (const m of body.matchAll(/\bexpect(?:\.soft)?\s*\(/g)) {
    const open = m.index + m[0].length - 1;
    const { args, close } = callArgs(body, open);
    if (close < 0 || !args.length) continue;
    const after = /^((?:\s*\.\s*(?:not|resolves|rejects))*)\s*\.\s*(\w+)/.exec(body.slice(close + 1, close + 140));
    const raw = args[1] ? readString(args[1].text) : null;
    const message = raw == null ? null : fillTemplate(raw, (e) => evalSimple(e, consts) ?? `‹${e}›`);
    out.push({ message, matcher: after?.[2] ?? '', negated: /not/.test(after?.[1] ?? ''), subject: short(args[0].text, 70) });
  }
  return out;
}

export { matchClose };
