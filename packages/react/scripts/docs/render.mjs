// Renders the manifest as Markdown: one page per component (`docs/<name>.md`), `llms.txt` and
// `llms-full.txt` (L09 decisions 5 and 6). Every sentence comes from `wording.mjs`, the same
// functions the Storybook docs pages render, so the wording can't vary between components or
// between the Markdown and the docs site.
import { kebab } from './util.mjs';
import {
  APP_MUST_NOTE,
  CONFORMANCE,
  HEADINGS,
  NO_KEYS,
  NO_OWN_PROPS,
  NO_REQUIRED_PROPS,
  NOTHING_TO_DO,
  adaptationRows,
  announcementItems,
  appMustItems,
  axisHeading,
  branchNotes,
  claimText,
  code,
  compositionText,
  deprecatedText,
  dontUseText,
  examplesText,
  focusItems,
  forbiddenText,
  keyboardRows,
  knownIssueItems,
  nativeText,
  noKnownIssuesText,
  propText,
  relatedText,
  requiredItems,
  semanticsItems,
  storiesIntro,
  stylesText,
  stylingItems,
  testRunRows,
} from './wording.mjs';

export { CLAIM_TEXT, CONFORMANCE } from './wording.mjs';

const list = (items) => items.map((item) => `- ${item}`).join('\n');

/**
 * Renders one component's page. `path(target)` turns a path from the package's `dist` root into a
 * link relative to the page; `depth` is the page's top heading level.
 */
export function componentMarkdown(manifest, component, { path, depth = 1 }) {
  const h = (level, text) => `${'#'.repeat(depth + level - 1)} ${text}`;
  const docLink = (name) =>
    manifest.components[name] ? `[${name}](${path(`docs/${kebab(name)}.md`)})` : code(name);
  const contract = component.accessibility;
  const out = [];
  const section = (...lines) => out.push(lines.filter((l) => l !== undefined).join('\n\n'));

  // 1. Summary and 2. import.
  section(
    h(1, component.name),
    component.deprecated ? deprecatedText(component.deprecated) : undefined,
    component.summary,
    h(2, HEADINGS.import),
    ['```ts', component.import, '```'].join('\n'),
    stylesText(manifest, component, path),
  );

  // 3. Required props.
  const required = requiredItems(component).map((item) =>
    item.items ? `${item.text}\n${item.items.map((i) => `  - ${i}`).join('\n')}` : item.text,
  );
  section(h(2, HEADINGS.required), required.length > 0 ? list(required) : NO_REQUIRED_PROPS);

  // 4. Your app must.
  section(
    h(2, HEADINGS.appMust),
    list(appMustItems(component).map((item) => item.text)) || NOTHING_TO_DO,
  );

  // 5. Usage guidance.
  const composition = component.composition.length > 0;
  section(
    h(2, HEADINGS.usage),
    component.description,
    h(3, HEADINGS.useWhen),
    list(component.useWhen),
    h(3, HEADINGS.dontUseWhen),
    list(component.dontUseWhen.map((d) => dontUseText(d, docLink))),
    composition ? h(3, HEADINGS.composition) : undefined,
    composition ? list(component.composition.map((c) => compositionText(c, docLink))) : undefined,
    relatedText(component, docLink),
    examplesText(component, (story) => story.latestSite),
  );

  // 6. Props.
  section(
    h(2, HEADINGS.props),
    nativeText(component),
    h(3, HEADINGS.everyUse),
    component.props.length > 0 ? list(component.props.map(propText)) : NO_OWN_PROPS,
    component.forbidden.length > 0 ? h(3, HEADINGS.notAccepted) : undefined,
    component.forbidden.length > 0 ? list(component.forbidden.map(forbiddenText)) : undefined,
    ...component.axes.flatMap((axis) => [
      h(3, axisHeading(axis)),
      axis.description,
      ...axis.branches.flatMap((branch) => [
        h(4, branch.summary),
        branch.deprecated ? deprecatedText(branch.deprecated) : undefined,
        list([...branch.props.map(propText), ...branchNotes(branch)]),
      ]),
    ]),
  );

  // Styling (public CSS surface).
  section(h(2, HEADINGS.styling), list(stylingItems(manifest, component, docLink)));

  // 7. Accessibility.
  section(
    h(2, HEADINGS.accessibility),
    CONFORMANCE,
    h(3, HEADINGS.semantics),
    list(semanticsItems(contract)),
    h(3, HEADINGS.keyboard),
    contract.keyboard.length > 0
      ? list(keyboardRows(contract).map((k) => `${k.keys}: ${k.action}`))
      : NO_KEYS,
    h(3, HEADINGS.focus),
    list(focusItems(contract.focus)),
    h(3, HEADINGS.announcements),
    list(announcementItems(contract, component.testRuns).map((a) => a.text)),
    h(3, HEADINGS.wcag),
    list(contract.wcag.map((claim, i) => claimText(manifest, component, claim, i))),
    h(3, HEADINGS.adaptation),
    list(adaptationRows(contract.adaptation).map((row) => `${row.label}: ${row.text}`)),
    h(3, HEADINGS.testRuns),
    list(
      testRunRows(manifest, component).map((row) =>
        [
          `${row.id ? `${row.id}: ` : ''}${row.text}`,
          ...(row.checks ?? []).map((c) => `  - ${c}`),
        ].join('\n'),
      ),
    ),
    h(3, HEADINGS.knownIssues),
    contract.knownIssues.length > 0
      ? list(knownIssueItems(contract))
      : noKnownIssuesText(contract, component.testRuns),
  );

  // 8. Stories.
  section(
    h(2, HEADINGS.stories),
    storiesIntro(manifest),
    list(component.stories.map((s) => `[${s.title}](${s.latestSite}) (${code(s.id)})`)),
  );

  return `${out.join('\n\n')}\n`;
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
    list(
      names.map((n) => {
        const { deprecated, summary } = manifest.components[n];
        return `[${n}](docs/${kebab(n)}.md): ${deprecated ? `${deprecatedText(deprecated)} ` : ''}${summary}`;
      }),
    ),
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
