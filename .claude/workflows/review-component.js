export const meta = {
  name: 'review-component',
  description: 'Fan out read-only reviewers over one senui component and return file:line findings',
  whenToUse:
    'Pair mode (L03+), after the human has written a component. Pass args: { component: "Button", module: "L03", paths: ["packages/react/src/components/Button"] }.',
  phases: [{ title: 'Review', detail: 'API, accessibility and platform reviewers in parallel' }],
};

// Add 'docs-manifest-curator' and 'release-steward' here once those agents exist (L09, L10).
const REVIEWERS = [
  {
    key: 'api',
    agentType: 'modular-web:component-api-reviewer',
    focus:
      'the public API: closed variant unions, type-level accessible-name requirements and the type tests that lock them, ref forwarding, controlled/uncontrolled parity, the CSS contract (layers, :where(), data-attribute variants, component tokens), and the semver impact of every exported name',
  },
  {
    key: 'a11y',
    agentType: 'modular-web:wcag-auditor',
    focus:
      'accessibility: native element choice, the *.a11y.ts contract against the actual behaviour, keyboard and focus handling, target size, contrast via tokens, forced-colors, and whether the unit axe test and stories cover every designed state',
  },
  {
    key: 'platform',
    agentType: 'modular-web:modern-web-curator',
    focus:
      'platform fit: consult the modern-web-guidance skill first, then check for a native HTML/CSS feature that should replace custom code or ARIA, and for CSS that breaks consumer overrides',
  },
];

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Repo-relative path' },
          line: { type: 'integer' },
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          title: { type: 'string' },
          misuse: {
            type: 'string',
            description: 'The concrete misuse this allows, or the failure a user hits',
          },
          fix: { type: 'string' },
          adr: {
            type: 'boolean',
            description: 'True if this is architecture-level and should become an ADR',
          },
        },
        required: ['file', 'line', 'severity', 'title', 'misuse', 'fix', 'adr'],
      },
    },
  },
  required: ['findings'],
};

const component = args?.component;
const paths = args?.paths ?? [];
if (!component || paths.length === 0) {
  throw new Error('review-component needs args: { component, module, paths: [...] }');
}

const prompt = (
  r,
) => `Review the senui component "${component}" (module ${args.module ?? 'unknown'}).
Files under review: ${paths.join(', ')}.

You are read-only: do not edit, create or delete any file.
Check whether each relevant decision is already locked (catalogue-decisions skill) before
proposing a change to it; a finding that contradicts an accepted ADR must say so and set adr=true.

Focus on ${r.focus}.

Every finding needs a file and line, the concrete misuse it allows (a code snippet a consumer
could write, or the failure a user hits), and a fix. Leave out style preferences that lint or
Prettier already decide. Return an empty list if you find nothing.`;

phase('Review');
const results = await parallel(
  REVIEWERS.map(
    (r) => () =>
      agent(prompt(r), {
        label: `review:${r.key}`,
        phase: 'Review',
        agentType: r.agentType,
        schema: FINDINGS_SCHEMA,
      }).then((res) => (res ? res.findings.map((f) => ({ reviewer: r.key, ...f })) : null)),
  ),
);

const failed = REVIEWERS.filter((_, i) => results[i] === null).map((r) => r.key);
if (failed.length) log(`No result from: ${failed.join(', ')}. Their dimension is unreviewed.`);

const order = { blocker: 0, major: 1, minor: 2 };
const findings = results
  .filter(Boolean)
  .flat()
  .sort((a, b) => order[a.severity] - order[b.severity]);

return { component, unreviewed: failed, findings };
