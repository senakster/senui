// The fixed wording of the published docs (L09 decisions 5 and 6), as plain functions of the
// manifest's data. Two renderers use it: `render.mjs` writes it as Markdown (`docs/<name>.md`,
// `llms-full.txt`), and the Storybook docs pages (`apps/docs/src/blocks/`) render the same strings
// as HTML. Neither renderer words a sentence itself, so the two can't drift apart.
//
// Strings use inline code (`x`) and links ([text](url)), nothing else; links to other components
// and stories come from the caller (`docLink`, `storyLink`), because a docs page and a Markdown
// file link to different places. This module runs in Node and in the browser: it imports nothing.

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

/**
 * Display names for recurring non-exported aliases, by their expanded text. Used by the renderers
 * only; the manifest keeps the type.
 */
export const TYPE_DISPLAY = {
  'Exclude<ReactNode, boolean | null | undefined>':
    'visible content: anything React renders except null, undefined or a boolean',
};

/** The section headings both renderers use, in the docs page's order. */
export const HEADINGS = {
  import: 'Import',
  required: 'Required props',
  appMust: 'Your app must',
  usage: 'Usage',
  useWhen: 'Use it when',
  dontUseWhen: "Don't use it when",
  composition: 'Inside other components',
  props: 'Props',
  everyUse: 'Every use',
  notAccepted: 'Not accepted',
  styling: 'Styling',
  accessibility: 'Accessibility',
  semantics: 'Semantics',
  keyboard: 'Keyboard',
  focus: 'Focus',
  announcements: 'Announcements',
  wcag: 'WCAG 2.2 criteria',
  adaptation: 'Adaptation',
  testRuns: 'Test runs',
  knownIssues: 'Known issues',
  stories: 'Stories',
};

const LANGUAGE = new Intl.DisplayNames(['en'], { type: 'language' });

export const code = (text) => `\`${String(text)}\``;
const unknown = (value) => `${code(value)} (not described)`;
/** `0.0.0` is the version every build has before the first release. */
const versionText = (version) => (version === '0.0.0' ? 'pre-release build' : version);

/** Joins `a`, `b` and `c`, with "or" (or "and") before the last. */
export function series(items, last = 'or') {
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

// --- 2. Import ------------------------------------------------------------------------------

/** The sentence after the import line. `path` makes a link from a path in `dist`. */
export function stylesText(manifest, component, path) {
  return `Load the styles once: ${manifest.css.importOrder.map(code).join(', then ')}. For this component alone, load ${code(component.css.stylesheet)} after the tokens. See [Usage](${path('USAGE.md')}).`;
}

// --- 3. Required props ----------------------------------------------------------------------

/**
 * The required props: each item is a line, and an axis's item lists its branches as `items`.
 *
 * @returns {{ text: string, items?: string[] }[]}
 */
export function requiredItems(component) {
  const contract = component.accessibility;
  return [
    ...component.props
      .filter((p) => p.required)
      .map((p) => ({
        text: `${code(p.name)}: ${p.description}`,
      })),
    ...component.axes.map((axis) => ({
      text: `${code(axis.name)}, one of:`,
      items: axis.branches.map((b) => {
        const needs = b.props.filter((p) => p.required).map((p) => code(p.name));
        return needs.length > 0 ? `${withoutStop(b.summary)}: ${needs.join(', ')}.` : b.summary;
      }),
    })),
    ...contract.requiredProps.map((r) => ({
      text: `${r.props.length > 1 ? `One of ${series(r.props.map(code))}` : code(r.props[0])}${r.when ? `, when ${code(r.when)} is set` : ''}: ${r.why}`,
    })),
  ];
}

export const NO_REQUIRED_PROPS = 'None.';

// --- 4. Your app must -----------------------------------------------------------------------

/**
 * What the app must still do: the responsibilities, then the announcements the app owns. Each
 * item carries the `language` of the speech it quotes, when it has one.
 *
 * @returns {{ text: string, language?: string }[]}
 */
export function appMustItems(component) {
  return [
    ...component.consumerResponsibilities.map((text) => ({ text })),
    ...component.accessibility.announcements
      .filter((a) => a.owner === 'consumer')
      .map((a) => ({
        text: `Announce, ${lowerFirst(a.when)} (${mechanismText(a)}): ${a.announces}`,
        ...(a.language ? { language: a.language } : {}),
      })),
  ];
}

export const NOTHING_TO_DO = 'Nothing beyond using the component as documented.';

// --- 5. Usage -------------------------------------------------------------------------------

export function dontUseText(d, docLink) {
  return `${d.when} ${alternativeText(d.alternative, docLink)}`;
}

function alternativeText(alt, docLink) {
  const note = alt.note ? ` ${alt.note}` : '';
  if (alt.component) return `Instead: ${docLink(alt.component)}.${note}`;
  if (alt.element) return `Instead: ${code(`<${alt.element}>`)}.${note}`;
  if (alt.pattern) return `Instead: the [ARIA pattern](${alt.pattern}).${note}`;
  if (alt.none !== undefined) return `Instead: nothing. ${alt.none}`;
  return '';
}

export function compositionText(c, docLink) {
  return [
    `Inside ${docLink(c.parent)}:`,
    c.ignored?.length ? `ignores ${series(c.ignored.map(code), 'and')};` : '',
    c.required?.length ? `requires ${series(c.required.map(code), 'and')}.` : '',
    c.note,
  ]
    .filter(Boolean)
    .join(' ');
}

/** `Related: …`, or undefined when nothing is related. */
export function relatedText(component, docLink) {
  return component.related.length > 0
    ? `Related: ${component.related.map(docLink).join(', ')}.`
    : undefined;
}

/** `storyLink(story)` makes a link to one of the component's stories. */
export function examplesText(component, storyLink) {
  return `Examples: ${component.examples
    .map((name) => {
      const story = component.stories.find((s) => s.name === name);
      return story ? `[${story.title}](${storyLink(story)})` : code(name);
    })
    .join(', ')} (on the docs site, which shows the latest build).`;
}

// --- 6. Props -------------------------------------------------------------------------------

/** The native attributes, in one paragraph. */
export function nativeText(component) {
  const { native } = component;
  return [
    `${component.name} accepts the native attributes of ${code(`<${native.element}>`)}, which get them with the ref${
      native.omitted.length > 0 ? `, except ${series(native.omitted.map(code), 'and')}` : ''
    }.`,
    native.overridden.length > 0
      ? `It declares ${series(native.overridden.map(code), 'and')} itself, with the meaning below.`
      : undefined,
    component.rootElement !== native.element
      ? `${code('className')} and ${code('style')} go on the root ${code(`<${component.rootElement}>`)}.`
      : undefined,
  ]
    .filter(Boolean)
    .join(' ');
}

export const NO_OWN_PROPS = 'No props of its own.';

/**
 * One prop's facts, each as text: the parts of `propText`'s sentence, for a table row.
 *
 * @returns {{ name: string, required: string, type: string, default?: string, description: string }}
 */
export function propCells(p) {
  const literal = (v) => code(typeof v === 'string' ? `'${v}'` : v);
  // L10 decision 7: deprecation is stated in words, first in the description.
  const deprecated = [
    ...(p.deprecated ? [deprecatedText(p.deprecated)] : []),
    ...Object.entries(p.deprecatedValues ?? {}).map(
      ([value, d]) =>
        `${literal(p.values?.find((v) => String(v) === value) ?? value)} is deprecated. ${d.useInstead}`,
    ),
  ];
  return {
    name: code(p.name),
    required: p.required ? 'required' : 'optional',
    type: `${typeText(p.type)}${
      p.values && !p.type.startsWith("'") ? `, one of ${p.values.map(literal).join(', ')}` : ''
    }`,
    ...(p.default !== undefined ? { default: code(p.default) } : {}),
    description: [...deprecated, p.description].filter(Boolean).join(' '),
  };
}

/** "Deprecated. Use `variant` instead." Always text: never only a strike-through or a colour. */
export function deprecatedText(d) {
  return `Deprecated. ${d.useInstead}`;
}

/** One prop as a sentence. */
export function propText(p) {
  const cells = propCells(p);
  return [
    `${cells.name}: ${cells.required}, ${cells.type}`,
    cells.default !== undefined ? `, default ${cells.default}` : '',
    '.',
    cells.description ? ` ${cells.description}` : '',
  ].join('');
}

export function forbiddenText(f) {
  return `${code(f.name)}: ${f.useInstead}`;
}

/** An axis's heading: `ButtonContent: one of 3`. */
export function axisHeading(axis) {
  return `${axis.name}: one of ${String(axis.branches.length)}`;
}

/** What a branch says beyond its props: other prop sets it needs, and what it doesn't accept. */
export function branchNotes(branch) {
  return [
    ...(branch.requiresOneOf
      ? [
          `Also requires one of: ${branch.requiresOneOf
            .map((set) => set.map((p) => `${code(p.name)} (${typeText(p.type)})`).join(' and '))
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
  ];
}

// --- Styling --------------------------------------------------------------------------------

export function stylingItems(manifest, component, docLink) {
  const data = Object.entries(component.css.dataAttributes);
  const deprecated = component.css.deprecated ?? {};
  const mark = (name, text) =>
    deprecated[name] ? `${text} (${deprecatedText(deprecated[name])})` : text;
  const classes = Object.keys(deprecated).filter((n) => n.startsWith('.'));
  return [
    `Root class: ${code(`.${component.css.rootClass}`)}, on the ${code(`<${component.rootElement}>`)}.`,
    ...classes.map((c) => `Also renders ${mark(c, code(c))}.`),
    data.length > 0
      ? `Data attributes: ${data.map(([name, values]) => `${code(name)} (${values.map((v) => mark(`[${name}='${v}']`, code(v))).join(', ')})`).join('; ')}.`
      : 'Data attributes: none.',
    component.css.tokens.length > 0
      ? `Component tokens: ${component.css.tokens.map((t) => mark(t, code(t))).join(', ')}.`
      : 'Component tokens: none of its own.',
    `Stylesheet: ${code(component.css.stylesheet)}.`,
    component.css.cssIncludes.length > 0
      ? `It imports the stylesheet of ${series(component.css.cssIncludes.map(docLink), 'and')}, so it works alone.`
      : undefined,
    manifest.css.partClasses,
  ].filter(Boolean);
}

// --- 7. Accessibility -----------------------------------------------------------------------

export function semanticsItems(contract) {
  const { semantics } = contract;
  const name =
    semantics.name === 'none'
      ? 'no accessible name (by design)'
      : `from ${series(semantics.name.sources.map((s) => (s === 'content' ? 'its content' : s === 'label-element' ? 'a `<label>`' : code(s))))}; ${semantics.name.required ? 'required' : 'not required'}`;
  return [
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
  ].filter(Boolean);
}

/** Each key binding: its keys (as inline code) and what they do. */
export function keyboardRows(contract) {
  return contract.keyboard.map((k) => ({ keys: k.keys.map(code).join(', '), action: k.action }));
}

export const NO_KEYS = 'Not focusable itself, so it has no keys of its own.';

export function focusItems(focus) {
  const lines = [`Tab stop: ${TAB_STOP[focus.tabStop] ?? unknown(focus.tabStop)}.`];
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

/**
 * Every announcement, split by owner: one the component makes was observed with a reader; one
 * the app makes points to Your app must. Each carries the `language` of the speech it quotes.
 *
 * @returns {{ text: string, language?: string }[]}
 */
export function announcementItems(contract) {
  const runs = contract.testedWith;
  return contract.announcements.map((a) => {
    let text;
    if (a.owner === 'component') {
      const run = heardIn(a, runs);
      const speech = a.language ? ` Quoted speech is in ${languageName(a.language)}.` : '';
      const observed = run
        ? ` Observed with ${run.at} ${run.atVersion}, ${run.browser} ${run.browserVersion}, ${run.os}, ${run.date}; other readers may differ.`
        : '';
      text = `${a.when} (${mechanismText(a)}): ${sentence(a.announces)}${speech}${observed}`;
    } else {
      text = `${a.when} (${mechanismText(a)}): your app announces this; see Your app must.`;
    }
    return { text, ...(a.language ? { language: a.language } : {}) };
  });
}

/** One WCAG claim, as a sentence: the criterion, the fixed claim text, how, and its evidence. */
export function claimText(manifest, component, claim, i) {
  const criterion = manifest.wcag.criteria[claim.criterion];
  const title = criterion
    ? `${claim.criterion} ${criterion.title} (Level ${criterion.level}, [Understanding ${claim.criterion}](${criterion.understanding}))`
    : claim.criterion;
  return `${title}. ${CLAIM_TEXT[claim.claim] ?? unknown(claim.claim)} How: ${claim.how} Evidence, by run (see Test runs): ${evidenceText(claim, component.wcagEvidence[i], component)}`;
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

/** Each adaptation value: its label and what it means. */
export function adaptationRows(adaptation) {
  return [
    ...Object.keys(ADAPTATION_LABEL).map((key) => {
      const value = adaptation[key];
      return { label: ADAPTATION_LABEL[key], text: `${ADAPTATION[key][value] ?? unknown(value)}.` };
    }),
    ...(adaptation.essentialMotion
      ? [
          {
            label: 'Essential motion',
            text: `${ESSENTIAL_MOTION[adaptation.essentialMotion] ?? unknown(adaptation.essentialMotion)}.`,
          },
        ]
      : []),
  ];
}

/**
 * Each test run: its id (as inline code, or empty) and what it was. The gate's run comes last,
 * with its checks.
 *
 * @returns {{ id: string, text: string, checks?: string[] }[]}
 */
export function testRunRows(manifest, component) {
  const contract = component.accessibility;
  return [
    ...contract.testedWith.map((run, i) =>
      runRow(run, component.testRuns[i], manifest.package.version),
    ),
    gateRunRow(manifest.gate),
  ];
}

function runRow(run, status, currentVersion) {
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
  return {
    id: status?.id ? code(status.id) : '',
    text: `${method}, ${run.date}${what ? ` (${what})` : ''}${result}.${version}${stale}`,
  };
}

/** The gate's run, with its checks and the criteria each tests. */
function gateRunRow(gate) {
  return {
    id: code(gate.id),
    text: `${METHOD[gate.method] ?? unknown(gate.method)}, ${gate.tool}, on every story and every docs page. ${gate.when} Its checks:`,
    checks: gate.checks.map(
      (c) =>
        `${c.name} (${code(c.spec)}): ${c.checks}.${c.criteria.length > 0 ? ` WCAG ${c.criteria.join(', ')}.` : ''}`,
    ),
  };
}

/** The known issues, or the fixed "none" line dated by the latest run. */
export function knownIssueItems(contract) {
  return contract.knownIssues.map((k) => `${k.issue} Workaround: ${k.workaround}`);
}

export function noKnownIssuesText(contract) {
  const lastRunDate =
    contract.testedWith
      .map((r) => r.date)
      .sort()
      .at(-1) ?? '';
  return `None known as of ${lastRunDate}.`;
}

// --- 8. Stories -----------------------------------------------------------------------------

export function storiesIntro(manifest) {
  return `On the docs site, which shows the latest build of the default branch, not necessarily this version (${code(manifest.package.version)}):`;
}
