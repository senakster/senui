// L09 decision 5, evidence: which runs back each WCAG claim. A component's `automated` evidence
// rests on its own automated run (axe-core and Vitest) and on the L08 gate, published as one
// automated run from the gate's own check list. A claim whose automated evidence tests nothing
// about its criterion (no axe rule tags it, and no gate check lists it) fails the build.
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { byCodeUnit, byCriterion } from './util.mjs';

export const GATE_RUN_ID = 'gate';

/**
 * The WCAG criteria axe-core tests with the given tags, from axe-core's own rule metadata: each
 * rule's `wcagNNN` tags (`axe.getRules()`, public API, no DOM needed), for the rules axe would run
 * for `runOnly: { type: 'tag', values: tags }`. That selection is axe's own `matchTags`: a rule with
 * one of the tags and none of axe's default excluded tags (`experimental`, `deprecated`).
 *
 * @param {string} root The react package root, whose axe-core pin is used.
 * @param {readonly string[]} tags
 * @param {readonly string[]} [disabled] Rule ids turned off.
 * @returns {{ version: string, rules: Record<string, string[]> }} Rule ids by criterion (`'1.4.3'`).
 */
export function axeCoverage(root, tags, disabled = []) {
  const axe = createRequire(`${root}/package.json`)('axe-core');
  // axe's default tag exclusion, the list its `matchTags` applies to every tag-based run.
  const excluded = axe._audit?.tagExclude ?? ['experimental', 'deprecated'];
  const rules = {};
  for (const rule of axe.getRules()) {
    if (disabled.includes(rule.ruleId)) continue;
    if (!rule.tags.some((t) => tags.includes(t))) continue;
    if (rule.tags.some((t) => excluded.includes(t) && !tags.includes(t))) continue;
    for (const tag of rule.tags) {
      const match = /^wcag(\d)(\d)(\d+)$/.exec(tag);
      if (!match) continue;
      const criterion = `${match[1]}.${match[2]}.${match[3]}`;
      (rules[criterion] ??= []).push(rule.ruleId);
    }
  }
  const sorted = {};
  for (const key of Object.keys(rules).sort(byCriterion)) {
    sorted[key] = [...new Set(rules[key])].sort(byCodeUnit);
  }
  return { version: axe.version, rules: sorted };
}

/**
 * The fixed start of every `test(…)` and `test.describe(…)` title in a spec: the text before the
 * first `${…}`. A call whose title starts with a substitution (a story id) has none, and the calls
 * inside it are read instead.
 */
function titleCalls(file, text) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const titles = [];
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(source);
      const arg = node.arguments[0];
      if ((callee === 'test' || callee === 'test.describe') && arg) {
        let head = '';
        if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) head = arg.text;
        else if (ts.isTemplateExpression(arg)) head = arg.head.text;
        if (head !== '') {
          titles.push(head);
          return;
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return titles;
}

/**
 * The gate as one automated run, from `apps/docs/gate/checks.ts`, checked against the specs'
 * titles both ways.
 *
 * @param {string} gateDir `apps/docs/gate`, with `/` separators.
 * @param {{ GATE_CHECKS: readonly object[], AXE_TAGS: readonly string[], PAGE_RULES: readonly string[] }} list
 * @param {string} root The react package root (for axe-core).
 * @param {string[]} errors
 */
export function gateRun(gateDir, list, root, errors) {
  const specs = readdirSync(gateDir)
    .filter((f) => f.endsWith('.spec.ts'))
    .sort(byCodeUnit);
  const used = new Set();
  for (const spec of specs) {
    const text = readFileSync(`${gateDir}/${spec}`, 'utf8').replace(/\r\n?/g, '\n');
    for (const title of titleCalls(spec, text)) {
      const check = list.GATE_CHECKS.find((c) => c.title === title && c.spec === spec);
      if (check) used.add(check);
      else {
        errors.push(`gate: ${spec} runs '${title}…', which apps/docs/gate/checks.ts doesn't list`);
      }
    }
  }
  for (const check of list.GATE_CHECKS) {
    if (!used.has(check)) {
      errors.push(
        `gate: checks.ts lists '${check.title}' in ${check.spec}, which runs no such test`,
      );
    }
  }

  const axe = axeCoverage(root, list.AXE_TAGS, list.PAGE_RULES);
  const checks = list.GATE_CHECKS.map((check) => ({
    name: check.title.replace(/[\s,:(]+$/, ''),
    spec: check.spec,
    checks: check.checks,
    criteria:
      check.criteria === 'axe' ? Object.keys(axe.rules) : [...check.criteria].sort(byCriterion),
  }));
  return {
    id: GATE_RUN_ID,
    method: 'automated',
    tool: `the accessibility gate: Playwright over the built Storybook, styled by the package's built CSS, with axe-core ${axe.version}`,
    when: 'CI runs it on every pull request (Chromium) and on every push to the default branch (Chromium, Firefox and WebKit).',
    checks,
  };
}

/** A run's id: its method and date, with `-2`, `-3` for a second run of the same kind that day. */
export function runIds(runs) {
  const seen = new Map();
  return runs.map((run) => {
    const base = `${run.method.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${run.date}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base}-${String(count)}`;
  });
}

/** A test title's literal text, when it has one: `test('…')`, `test.each(…)('…')`, `describe('…')`. */
function literalTitle(node, source, names) {
  if (!ts.isCallExpression(node)) return undefined;
  const callee = node.expression;
  const name = ts.isCallExpression(callee)
    ? `${callee.expression.getText(source)}()`
    : callee.getText(source);
  if (!names.includes(name)) return undefined;
  const arg = node.arguments[0];
  return arg && (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg))
    ? arg.text
    : undefined;
}

/**
 * The components' Vitest tests (unit, browser and type tests) that name WCAG criteria in their
 * title, `'… (WCAG 3.3.8)'` or `'… (WCAG 2.1.2, 2.4.3)'`, by component and criterion. They are part
 * of the component's automated run. A test belongs to the component whose directory holds it,
 * unless its outermost `describe` starts with another component's name (CheckboxGroup's submit
 * test lives in Checkbox.browser.test.tsx).
 *
 * @param {string} componentsDir `src/components`.
 * @param {readonly string[]} names The components.
 * @returns {Record<string, Record<string, string[]>>}
 */
export function citingTests(componentsDir, names) {
  const cited = Object.fromEntries(names.map((n) => [n, {}]));
  for (const dir of names) {
    const files = readdirSync(`${componentsDir}/${dir}`)
      .filter((f) => /\.test(-d)?\.tsx?$/.test(f))
      .sort(byCodeUnit);
    for (const file of files) {
      const source = ts.createSourceFile(
        file,
        readFileSync(`${componentsDir}/${dir}/${file}`, 'utf8').replace(/\r\n?/g, '\n'),
        ts.ScriptTarget.Latest,
        true,
      );
      const visit = (node, owner) => {
        const describe = literalTitle(node, source, ['describe']);
        if (describe !== undefined && owner === undefined) {
          const first = /^[A-Za-z]+/.exec(describe)?.[0];
          owner = first && first !== dir && names.includes(first) ? first : dir;
        }
        const title = literalTitle(node, source, ['test', 'test.each()']);
        const match = title && /\bWCAG (\d\.\d\.\d+(?:, \d\.\d\.\d+)*)/.exec(title);
        if (title && match) {
          for (const criterion of match[1].split(', ')) {
            (cited[owner ?? dir][criterion] ??= []).push(title);
          }
        }
        ts.forEachChild(node, (child) => {
          visit(child, owner);
        });
      };
      visit(source, undefined);
    }
  }
  return cited;
}

/**
 * Claims whose automated evidence nothing traceable tests: no axe rule, no gate check and no test
 * that names the criterion. Empty: every claim is traced. An entry here is published flagged
 * (`untraced: true`) instead of failing the build, so add one only with a reason and a date, and
 * an entry that stops firing is an error, so the list only shrinks.
 *
 * @type {readonly string[]} `'<Component> <criterion>'`
 */
export const UNTRACED = [];

/**
 * Each claim's evidence, as the runs it rests on. `automated` evidence is the component's automated
 * run(s) (with the axe rules and the named tests that test the criterion), plus the gate when a gate
 * check tests it. A claim whose automated evidence tests nothing traceable about its criterion is
 * an error, unless it is in `UNTRACED`, and then it is published with `untraced: true`.
 *
 * @param {Set<string>} untracedSeen Collects the `UNTRACED` entries that fired.
 */
export function claimEvidence(name, contract, ids, gate, axeRules, tests, errors, untracedSeen) {
  return contract.wcag.map((claim) => {
    const runs = [];
    let axe = [];
    let gateChecks = [];
    let named = [];
    let untraced = false;
    for (const method of claim.evidence) {
      contract.testedWith.forEach((run, i) => {
        if (run.method === method) runs.push(ids[i]);
      });
      if (method !== 'automated') continue;
      axe = axeRules[claim.criterion] ?? [];
      named = [...(tests[claim.criterion] ?? [])].sort(byCodeUnit);
      gateChecks = gate.checks
        .filter((c) => c.criteria.includes(claim.criterion))
        .map((c) => c.name);
      if (gateChecks.length > 0) runs.push(GATE_RUN_ID);
      if (axe.length === 0 && gateChecks.length === 0 && named.length === 0) {
        const key = `${name} ${claim.criterion}`;
        if (UNTRACED.includes(key)) {
          untraced = true;
          untracedSeen.add(key);
        } else {
          errors.push(
            `${name}: WCAG ${claim.criterion} rests on automated evidence, but no axe rule tests ${claim.criterion}, no gate check lists it and no test of ${name} names it ("… (WCAG ${claim.criterion})"). Cite the evidence that does test it.`,
          );
        }
      }
    }
    return {
      criterion: claim.criterion,
      runs,
      axeRules: axe,
      tests: named,
      gateChecks,
      ...(untraced ? { untraced: true } : {}),
    };
  });
}
