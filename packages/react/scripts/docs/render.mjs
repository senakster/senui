// Renders the manifest as Markdown: one page per component (`docs/<name>.md`), `llms.txt` and
// `llms-full.txt` (L09 decisions 5 and 6). Every sentence about accessibility is fixed text here,
// rendered from the contract's data, so the wording can't vary between components.
import { TYPE_DISPLAY } from './types.mjs';
import { kebab } from './util.mjs';

/** Decision 5: shown before every list of claims, and in `llms.txt`. */
export const CONFORMANCE =
  "A component can't conform to WCAG on its own; only a page can. Each claim says what the component does toward one WCAG 2.2 success criterion when it is used as documented. A criterion that isn't listed isn't claimed.";

/** Decision 5: the fixed text for each kind of claim. */
export const CLAIM_TEXT = {
  meets: 'Meets: the component satisfies this criterion on its own, used as documented.',
  enables:
    "Enables: the component doesn't satisfy this criterion alone; your app can, by using it as documented.",
};

export const APP_MUST_NOTE = 'Every component lists what your app must still do.';

const LANGUAGE = new Intl.DisplayNames(['en'], { type: 'language' });

const code = (text) => `\`${String(text)}\``;
const list = (items) => items.map((item) => `- ${item}`).join('\n');
const unknown = (value) => `${code(value)} (not described)`;
/** `0.0.0` is the version every build has before the first release. */
const versionText = (version) => (version === '0.0.0' ? 'pre-release build' : version);

/** Joins `a`, `b` and `c`, with "or" (or "and") before the last. */
function series(items, last = 'or') {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${last} ${String(items.at(-1))}`;
}

/** A language tag as a reader says it: "English (`en`)". */
function languageName(tag) {
  let name;
  try {
    name = LANGUAGE.of(tag);
  } catch {
    name = undefined;
  }
  return name && name !== tag ? `${name} (${code(tag)})` : code(tag);
}

const ADAPTATION = {
  targetSize: {
    'min-24': 'every target is at least 24×24 CSS px (WCAG 2.5.8)',
    'spacing-exception':
      'targets smaller than 24×24 CSS px meet the spacing exception of WCAG 2.5.8',
    'not-a-target': 'not a pointer target',
  },
  activatesOn: {
    click: 'activates on click, the up event (WCAG 2.5.2)',
    pointerup: 'activates on pointer up (WCAG 2.5.2)',
    'not-activatable': 'nothing to activate',
  },
  forcedColors: {
    border: 'states stay visible in forced-colours mode through borders and outlines',
    'system-colour': 'states stay visible in forced-colours mode through system colours',
    'no-states': 'no visual states that forced-colours mode could hide',
  },
  rtl: {
    mirrors: 'layout and arrow keys mirror in right-to-left text',
    'direction-neutral': 'nothing to mirror in right-to-left text',
  },
  textOverflow: {
    wraps: 'text wraps when space runs out (WCAG 1.4.10, 1.4.12)',
    truncates: 'text is truncated when space runs out',
  },
  reducedMotion: {
    'motion-factor':
      'movement is scaled by `--senui-motion-reduce`, so it stops when the user asks for reduced motion',
    'no-motion': 'nothing moves, whatever the motion setting',
  },
};
const ADAPTATION_LABEL = {
  targetSize: 'Target size',
  activatesOn: 'Activation',
  forcedColors: 'Forced colours',
  rtl: 'Right to left',
  textOverflow: 'Text overflow',
  reducedMotion: 'Reduced motion',
};
const ESSENTIAL_MOTION = {
  'progress-rotation':
    'one animation is kept under reduced motion, on purpose: an in-place rotation that shows work is in progress (ADR-0017)',
};
const TAB_STOP = {
  none: 'never focused',
  native: 'in the native tab order',
  roving: 'one tab stop, with a roving tabindex inside',
  activedescendant: 'one tab stop, with `aria-activedescendant` inside',
  programmatic: 'focused only by script, never by Tab',
};
const ON_OPEN = {
  'first-focusable': 'focus moves to the first focusable element',
  container: 'focus moves to the container',
  'named-element': 'focus moves to an element you name',
};
const RESTORE = {
  trigger: 'focus returns to the element that opened it',
  'trigger-or-fallback':
    'focus returns to the element that opened it, or to a fallback when that is gone',
};
const MECHANISM = {
  'live-region': 'live region',
  focus: 'focus',
  'focus-move': 'focus move',
  'state-change': 'state change',
  'name-change': 'name change',
  reading: 'reading order',
};
const METHOD = {
  automated: 'Automated',
  'screen reader': 'Screen reader',
  keyboard: 'Keyboard',
  'forced colours': 'Forced colours',
  'resize-200': 'Resize to 200%',
  'reflow-320': 'Reflow at 320 CSS px',
  'text-spacing': 'Text spacing',
  'reduced-motion': 'Reduced motion',
  'pointer-touch': 'Pointer and touch',
  'voice control': 'Voice control',
};
const TAB_STOP_TEXT = (value) => TAB_STOP[value] ?? unknown(value);

/**
 * Renders one component's page. `path(target)` turns a path from the package's `dist` root into a
 * link relative to the page; `depth` is the page's top heading level.
 */
export function componentMarkdown(manifest, component, { path, depth = 1 }) {
  const h = (level, text) => `${'#'.repeat(depth + level - 1)} ${text}`;
  const docLink = (name) =>
    manifest.components[name] ? `[${name}](${path(`docs/${kebab(name)}.md`)})` : code(name);
  const contract = component.accessibility;
  const runs = contract.testedWith;
  const lastRunDate =
    runs
      .map((r) => r.date)
      .sort()
      .at(-1) ?? '';
  const out = [];
  const section = (...lines) => out.push(lines.filter((l) => l !== undefined).join('\n\n'));

  // 1. Summary and 2. import.
  section(
    h(1, component.name),
    component.summary,
    h(2, 'Import'),
    ['```ts', component.import, '```'].join('\n'),
    `Load the styles once: ${manifest.css.importOrder.map(code).join(', then ')}. For this component alone, load ${code(component.css.stylesheet)} after the tokens. See [Usage](${path('USAGE.md')}).`,
  );

  // 3. Required props.
  const required = component.props.filter((p) => p.required);
  const requiredLines = [
    ...required.map((p) => `${code(p.name)}: ${p.description}`),
    ...component.axes.map(
      (axis) =>
        `${code(axis.name)}, one of:\n${axis.branches
          .map((b) => {
            const needs = b.props.filter((p) => p.required).map((p) => code(p.name));
            return `  - ${needs.length > 0 ? `${withoutStop(b.summary)}: ${needs.join(', ')}.` : b.summary}`;
          })
          .join('\n')}`,
    ),
    ...contract.requiredProps.map(
      (r) =>
        `${r.props.length > 1 ? `One of ${series(r.props.map(code))}` : code(r.props[0])}${r.when ? `, when ${code(r.when)} is set` : ''}: ${r.why}`,
    ),
  ];
  section(h(2, 'Required props'), requiredLines.length > 0 ? list(requiredLines) : 'None.');

  // 4. Your app must.
  const consumerAnnouncements = contract.announcements.filter((a) => a.owner === 'consumer');
  section(
    h(2, 'Your app must'),
    list([
      ...component.consumerResponsibilities,
      ...consumerAnnouncements.map(
        (a) => `Announce, ${lowerFirst(a.when)} (${mechanismText(a)}): ${a.announces}`,
      ),
    ]) || 'Nothing beyond using the component as documented.',
  );

  // 5. Usage guidance.
  section(
    h(2, 'Usage'),
    component.description,
    h(3, 'Use it when'),
    list(component.useWhen),
    h(3, "Don't use it when"),
    list(component.dontUseWhen.map((d) => `${d.when} ${alternativeText(d.alternative, docLink)}`)),
    component.composition.length > 0 ? h(3, 'Inside other components') : undefined,
    component.composition.length > 0
      ? list(
          component.composition.map((c) =>
            [
              `Inside ${docLink(c.parent)}:`,
              c.ignored?.length ? `ignores ${series(c.ignored.map(code), 'and')};` : '',
              c.required?.length ? `requires ${series(c.required.map(code), 'and')}.` : '',
              c.note,
            ]
              .filter(Boolean)
              .join(' '),
          ),
        )
      : undefined,
    component.related.length > 0
      ? `Related: ${component.related.map(docLink).join(', ')}.`
      : undefined,
    `Examples: ${component.examples
      .map((name) => {
        const story = component.stories.find((s) => s.name === name);
        return story ? `[${story.title}](${story.latestSite})` : code(name);
      })
      .join(', ')} (on the docs site, which shows the latest build).`,
  );

  // 6. Props.
  const { native } = component;
  const nativeLines = [
    `${component.name} accepts the native attributes of ${code(`<${native.element}>`)}, which get them with the ref${
      native.omitted.length > 0 ? `, except ${series(native.omitted.map(code), 'and')}` : ''
    }.`,
    native.overridden.length > 0
      ? `It declares ${series(native.overridden.map(code), 'and')} itself, with the meaning below.`
      : undefined,
    component.rootElement !== native.element
      ? `${code('className')} and ${code('style')} go on the root ${code(`<${component.rootElement}>`)}.`
      : undefined,
  ].filter(Boolean);
  section(
    h(2, 'Props'),
    nativeLines.join(' '),
    h(3, 'Every use'),
    component.props.length > 0 ? list(component.props.map(propText)) : 'No props of its own.',
    component.forbidden.length > 0 ? h(3, 'Not accepted') : undefined,
    component.forbidden.length > 0
      ? list(component.forbidden.map((f) => `${code(f.name)}: ${f.useInstead}`))
      : undefined,
    ...component.axes.flatMap((axis) => [
      h(3, `${axis.name}: one of ${String(axis.branches.length)}`),
      axis.description,
      ...axis.branches.flatMap((branch) => [
        h(4, branch.summary),
        list([
          ...branch.props.map(propText),
          ...(branch.requiresOneOf
            ? [
                `Also requires one of: ${branch.requiresOneOf
                  .map((set) =>
                    set.map((p) => `${code(p.name)} (${typeText(p.type)})`).join(' and '),
                  )
                  .join('; ')}.`,
              ]
            : []),
          ...branch.forbidden.map((f) => `Not accepted: ${code(f.name)}. ${f.useInstead}`),
          ...(branch.notInBranch.length > 0
            ? [
                `Not in this branch: ${branch.notInBranch
                  .map((n) => (n.note ? `${code(n.name)} (${n.note})` : code(n.name)))
                  .join(', ')}.`,
              ]
            : []),
        ]),
      ]),
    ]),
  );

  // Styling (public CSS surface).
  const data = Object.entries(component.css.dataAttributes);
  section(
    h(2, 'Styling'),
    list(
      [
        `Root class: ${code(`.${component.css.rootClass}`)}, on the ${code(`<${component.rootElement}>`)}.`,
        data.length > 0
          ? `Data attributes: ${data.map(([name, values]) => `${code(name)} (${values.map(code).join(', ')})`).join('; ')}.`
          : 'Data attributes: none.',
        component.css.tokens.length > 0
          ? `Component tokens: ${component.css.tokens.map(code).join(', ')}.`
          : 'Component tokens: none of its own.',
        `Stylesheet: ${code(component.css.stylesheet)}.`,
        component.css.cssIncludes.length > 0
          ? `It imports the stylesheet of ${series(component.css.cssIncludes.map(docLink), 'and')}, so it works alone.`
          : undefined,
        manifest.css.partClasses,
      ].filter(Boolean),
    ),
  );

  // 7. Accessibility.
  const { semantics } = contract;
  const name =
    semantics.name === 'none'
      ? 'no accessible name (by design)'
      : `from ${series(semantics.name.sources.map((s) => (s === 'content' ? 'its content' : s === 'label-element' ? 'a `<label>`' : code(s))))}; ${semantics.name.required ? 'required' : 'not required'}`;
  section(
    h(2, 'Accessibility'),
    CONFORMANCE,
    h(3, 'Semantics'),
    list(
      [
        `Element: ${code(`<${semantics.element}>`)}${semantics.role ? `, with role ${code(semantics.role)}` : ', with its native role'}.`,
        semantics.pattern ? `Pattern: [${semantics.pattern}](${semantics.pattern}).` : undefined,
        `Accessible name: ${name}.`,
        ...semantics.states.map((s) => `State ${code(s.attribute)}: ${s.when}.`),
        ...semantics.relationships.map(
          (r) =>
            `${code(r.attribute)} points to ${r.target}; wired by ${r.owner === 'component' ? 'the component' : r.owner === 'consumer' ? 'your app' : unknown(r.owner)}.`,
        ),
        semantics.hiddenFromAT.length > 0
          ? `Hidden from assistive technology: ${series(semantics.hiddenFromAT, 'and')}.`
          : undefined,
        semantics.notes,
      ].filter(Boolean),
    ),
    h(3, 'Keyboard'),
    contract.keyboard.length > 0
      ? list(contract.keyboard.map((k) => `${k.keys.map(code).join(', ')}: ${k.action}`))
      : 'Not focusable itself, so it has no keys of its own.',
    h(3, 'Focus'),
    list(focusLines(contract.focus)),
    h(3, 'Announcements'),
    list(
      contract.announcements.map((a) =>
        a.owner === 'component'
          ? componentAnnouncement(a, runs)
          : `${a.when} (${mechanismText(a)}): your app announces this; see Your app must.`,
      ),
    ),
    h(3, 'WCAG 2.2 criteria'),
    list(
      contract.wcag.map((claim, i) => {
        const criterion = manifest.wcag.criteria[claim.criterion];
        const title = criterion
          ? `${claim.criterion} ${criterion.title} (Level ${criterion.level}, [Understanding ${claim.criterion}](${criterion.understanding}))`
          : claim.criterion;
        return `${title}. ${CLAIM_TEXT[claim.claim] ?? unknown(claim.claim)} How: ${claim.how} Evidence, by run (see Test runs): ${evidenceText(claim, component.wcagEvidence[i], component)}`;
      }),
    ),
    h(3, 'Adaptation'),
    list([
      ...Object.keys(ADAPTATION_LABEL).map((key) => {
        const value = contract.adaptation[key];
        return `${ADAPTATION_LABEL[key]}: ${ADAPTATION[key][value] ?? unknown(value)}.`;
      }),
      ...(contract.adaptation.essentialMotion
        ? [
            `Essential motion: ${ESSENTIAL_MOTION[contract.adaptation.essentialMotion] ?? unknown(contract.adaptation.essentialMotion)}.`,
          ]
        : []),
    ]),
    h(3, 'Test runs'),
    list([
      ...runs.map((run, i) => runText(run, component.testRuns[i], manifest.package.version)),
      gateRunText(manifest.gate),
    ]),
    h(3, 'Known issues'),
    contract.knownIssues.length > 0
      ? list(contract.knownIssues.map((k) => `${k.issue} Workaround: ${k.workaround}`))
      : `None known as of ${lastRunDate}.`,
  );

  // 8. Stories.
  section(
    h(2, 'Stories'),
    `On the docs site, which shows the latest build of the default branch, not necessarily this version (${code(manifest.package.version)}):`,
    list(component.stories.map((s) => `[${s.title}](${s.latestSite}) (${code(s.id)})`)),
  );

  return `${out.join('\n\n')}\n`;
}

const withoutStop = (text) => text.replace(/\.$/, '');
/** Text that ends a sentence, with a full stop added when it has none. */
const sentence = (text) => (/[.!?]$/.test(text) ? text : `${text}.`);

function lowerFirst(text) {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function mechanismText(a) {
  const mechanism = MECHANISM[a.mechanism] ?? unknown(a.mechanism);
  return `mechanism: ${a.politeness ? `${mechanism}, ${a.politeness}` : mechanism}`;
}

function typeText(type) {
  return TYPE_DISPLAY[type] ?? code(type);
}

function propText(p) {
  const parts = [
    `${code(p.name)}: ${p.required ? 'required' : 'optional'}, ${typeText(p.type)}`,
    p.values && !p.type.startsWith("'")
      ? `, one of ${p.values.map((v) => code(typeof v === 'string' ? `'${v}'` : v)).join(', ')}`
      : '',
    p.default !== undefined ? `, default ${code(p.default)}` : '',
    '.',
    p.description ? ` ${p.description}` : '',
  ];
  return parts.join('');
}

function alternativeText(alt, docLink) {
  const note = alt.note ? ` ${alt.note}` : '';
  if (alt.component) return `Instead: ${docLink(alt.component)}.${note}`;
  if (alt.element) return `Instead: ${code(`<${alt.element}>`)}.${note}`;
  if (alt.pattern) return `Instead: the [ARIA pattern](${alt.pattern}).${note}`;
  if (alt.none !== undefined) return `Instead: nothing. ${alt.none}`;
  return '';
}

function focusLines(focus) {
  const lines = [`Tab stop: ${TAB_STOP_TEXT(focus.tabStop)}.`];
  if (focus.indicator !== undefined) {
    lines.push(
      typeof focus.indicator === 'string'
        ? focus.indicator === 'focus-ring'
          ? 'Indicator: the token focus ring, an outline with an offset (ADR-0005).'
          : `Indicator: ${unknown(focus.indicator)}.`
        : `Indicator: ${focus.indicator.description} (${focus.indicator.exception}).`,
    );
  }
  const m = focus.management;
  if (m?.onOpen) lines.push(`On open: ${ON_OPEN[m.onOpen] ?? unknown(m.onOpen)}.`);
  if (m?.trap !== undefined)
    lines.push(m.trap ? 'Focus stays inside while it is open.' : 'Focus is not kept inside.');
  if (m?.restore) lines.push(`On close: ${RESTORE[m.restore] ?? unknown(m.restore)}.`);
  return lines;
}

/** The screen-reader run an announcement was heard in: its language's latest run. */
function heardIn(announcement, runs) {
  const readers = runs.filter(
    (r) =>
      r.method === 'screen reader' &&
      (announcement.language === undefined || r.language === announcement.language),
  );
  return readers.reduce((latest, r) => (latest && latest.date >= r.date ? latest : r), undefined);
}

function componentAnnouncement(a, runs) {
  const run = heardIn(a, runs);
  const speech = a.language ? ` Quoted speech is in ${languageName(a.language)}.` : '';
  const observed = run
    ? ` Observed with ${run.at} ${run.atVersion}, ${run.browser} ${run.browserVersion}, ${run.os}, ${run.date}; other readers may differ.`
    : '';
  return `${a.when} (${mechanismText(a)}): ${sentence(a.announces)}${speech}${observed}`;
}

function runText(run, status, currentVersion) {
  const method = METHOD[run.method] ?? unknown(run.method);
  const result =
    run.result === undefined
      ? ''
      : run.result === 'pass'
        ? ': pass'
        : run.result === 'pass-with-known-issues'
          ? ': pass with known issues (see Known issues below)'
          : `: ${unknown(run.result)}`;
  let what;
  if (run.method === 'automated') what = run.tool;
  else if (run.method === 'screen reader')
    what = `${run.at} ${run.atVersion}, ${run.browser} ${run.browserVersion}, ${run.os}; speech in ${languageName(run.language)}`;
  else if (run.method === 'keyboard') what = `${run.browser}, ${run.os}`;
  else what = run.detail;
  const version = run.packageVersion
    ? ` Package version tested: ${versionText(run.packageVersion)}; this version: ${currentVersion}.`
    : '';
  const stale = status?.sourceChangedSince ? ' Component changed since this run.' : '';
  const id = status?.id ? `${code(status.id)}: ` : '';
  return `${id}${method}, ${run.date}${what ? ` (${what})` : ''}${result}.${version}${stale}`;
}

/** The gate's run, with its checks and the criteria each tests. */
function gateRunText(gate) {
  const checks = gate.checks.map(
    (c) =>
      `  - ${c.name} (${code(c.spec)}): ${c.checks}.${c.criteria.length > 0 ? ` WCAG ${c.criteria.join(', ')}.` : ''}`,
  );
  return [
    `${code(gate.id)}: ${METHOD[gate.method] ?? unknown(gate.method)}, ${gate.tool}, on every story of every component. ${gate.when} Its checks:`,
    ...checks,
  ].join('\n');
}

/** Which runs a claim rests on, and what in each tests its criterion. */
function evidenceText(claim, evidence, component) {
  if (!evidence) return `${claim.evidence.join(', ')}.`;
  const parts = claim.evidence.map((method) => {
    const runs = component.accessibility.testedWith
      .map((run, i) => (run.method === method ? component.testRuns[i]?.id : undefined))
      .filter((id) => id !== undefined && evidence.runs.includes(id));
    if (method !== 'automated') return `${method} (${runs.map(code).join(', ') || 'no run'})`;
    const inside = [
      evidence.axeRules.length > 0 ? `axe rules ${evidence.axeRules.map(code).join(', ')}` : '',
      evidence.tests.length > 0 ? `tests ${evidence.tests.map((t) => `"${t}"`).join(', ')}` : '',
    ].filter(Boolean);
    const own = runs.map(code).join(', ') + (inside.length > 0 ? `: ${inside.join('; ')}` : '');
    const gate =
      evidence.gateChecks.length > 0 ? `; ${code('gate')}: ${evidence.gateChecks.join(', ')}` : '';
    return `automated (${own}${gate})`;
  });
  const flag = evidence.untraced
    ? ' Flag: no axe rule, gate check or test named for this criterion is known to test it, so its automated evidence is untraced.'
    : '';
  return `${parts.join(', ')}.${flag}`;
}

/** Demotes every heading outside code fences by `by` levels. */
export function demote(markdown, by) {
  let fenced = false;
  return markdown
    .split('\n')
    .map((line) => {
      if (/^\s*```/.test(line)) fenced = !fenced;
      return !fenced && /^#{1,6} /.test(line) ? `${'#'.repeat(by)}${line}` : line;
    })
    .join('\n');
}

/** The blockquote summary `llms.txt` and `llms-full.txt` open with. */
function intro(manifest) {
  const { name, version, released } = manifest.package;
  const build = released
    ? `This describes version ${version}.`
    : `This build is unreleased: version ${version}, from a commit that isn't a published release, so what it describes may not be on npm yet.`;
  return [
    `# ${name}`,
    `> ${build} React components on plain CSS and design tokens. Each component publishes its props, its styling surface and its accessibility contract. ${CONFORMANCE} ${APP_MUST_NOTE}`,
  ].join('\n\n');
}

export function llmsTxt(manifest) {
  const names = Object.keys(manifest.components);
  return `${[
    intro(manifest),
    '## Docs',
    list([
      '[Usage](USAGE.md): install, loading the CSS, theming, server rendering, and what the library leaves to your page',
      '[Manifest](components.json): every component as JSON: props by branch, CSS surface, stories and the whole accessibility contract. Its type is `Manifest`, exported from the package',
    ]),
    '## Components',
    list(names.map((n) => `[${n}](docs/${kebab(n)}.md): ${manifest.components[n].summary}`)),
    '## Optional',
    list(['[Everything in one file](llms-full.txt): the usage guide and every component page']),
  ].join('\n\n')}\n`;
}

export function llmsFullTxt(manifest, usage) {
  const names = Object.keys(manifest.components);
  return `${[
    intro(manifest),
    demote(usage.trim(), 1),
    ...names.map((n) =>
      componentMarkdown(manifest, manifest.components[n], { path: (p) => p, depth: 2 }).trim(),
    ),
  ].join('\n\n')}\n`;
}
