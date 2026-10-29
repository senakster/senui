// L09: generates the package's machine-readable and Markdown docs from its typed sources, into
// dist: components.json, llms.txt, llms-full.txt, docs/<component>.md and USAGE.md. tsdown runs it
// in its `build:before` hook, after dist is cleaned and before publint checks `exports`.
//
// Reads only src, README.md, package.json, the tokens package, axe-core's rule metadata, the L08
// gate's check list and specs (apps/docs/gate) and git; never dist, never the network. Problems the
// types can't rule out (a prop without JSDoc, an inline union, a private reference in published
// text, an identifier a consumer can't import, a WCAG claim whose automated evidence tests nothing
// about it) are errors that fail the build.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import ts from 'typescript';
import { componentCss } from './docs/css.mjs';
import {
  UNTRACED,
  axeCoverage,
  citingTests,
  claimEvidence,
  gateRun,
  runIds,
} from './docs/evidence.mjs';
import { withModuleLoader } from './docs/load.mjs';
import {
  CLAIM_TEXT,
  CONFORMANCE,
  componentMarkdown,
  llmsFullTxt,
  llmsTxt,
} from './docs/render.mjs';
import { createTypes } from './docs/types.mjs';
import { byCodeUnit, kebab, slash, sortKeys } from './docs/util.mjs';

export { UNTRACED, axeCoverage };

const SCOPE_PACKAGE = '@senakster/senui';
const TOKENS_PACKAGE = '@senakster/senui-tokens';
const SITE_LABEL =
  'The docs site shows the latest build of the default branch, not necessarily this version.';

/**
 * Generates every file in memory.
 *
 * @param {string} rootPath The package root.
 * @param {{ reorder?: boolean, crlf?: boolean, env?: Record<string, string | undefined> }} [options]
 *   `reorder` and `crlf` are test switches (see `createTypes`); `env` defaults to `process.env`.
 * @returns {Promise<{ manifest: object, files: Map<string, string>, errors: string[] }>} `files`
 *   maps a path inside dist to its content.
 */
export async function generate(
  rootPath,
  { reorder = false, crlf = false, env = process.env } = {},
) {
  const root = slash(rootPath).replace(/\/$/, '');
  const src = `${root}/src`;
  // The L08 gate's check list and specs, in the docs app (decision 5).
  const gateDir = `${dirname(dirname(root)).replaceAll('\\', '/')}/apps/docs/gate`;
  const pkg = JSON.parse(readFileSync(`${root}/package.json`, 'utf8'));
  const types = createTypes(root, { reorder, crlf });
  const errors = types.errors;
  const names = types.componentDirs;

  const loaded = await withModuleLoader(root, async (load) => {
    const { publishedTextErrors } = await load('/src/internal/docs/published-text.ts');
    const { WCAG22 } = await load('/src/internal/a11y/wcag.ts');
    const { toId, storyNameFromExport, isExportStory } = await import('storybook/internal/csf');
    const components = {};
    for (const name of names) {
      const base = `/src/components/${name}/${name}`;
      const { a11y } = await load(`${base}.a11y.ts`);
      const { docs } = await load(`${base}.docs.ts`);
      const stories = await load(`${base}.stories.tsx`);
      components[name] = { a11y, docs, stories };
    }
    const { AXE_TAGS } = await load('/src/internal/testing/axe-tags.ts');
    const gateList = await load(`/@fs/${gateDir}/checks.ts`);
    return {
      publishedTextErrors,
      WCAG22,
      toId,
      storyNameFromExport,
      isExportStory,
      components,
      AXE_TAGS,
      gateList,
    };
  });
  const { publishedTextErrors, WCAG22, toId, storyNameFromExport, isExportStory, AXE_TAGS } =
    loaded;
  // Decision 5: the axe rules a component's own automated run includes, and the gate's run.
  const unitAxe = axeCoverage(root, AXE_TAGS);
  const gate = gateRun(gateDir, loaded.gateList, root, errors);
  const untracedSeen = new Set();
  // Decision 5: the components' tests that name the criteria they test.
  const cited = citingTests(`${src}/components`, names);

  const released = env.SENUI_RELEASE === '1';
  const sha = git(root, 'rev-parse', '--short=7', 'HEAD');
  // In CI, git must work: without it the site says `-main.unknown` and every run's "changed since"
  // goes blank. That shipped once, when the container's git refused a checkout it doesn't own.
  if (!released && !sha && env.CI) {
    errors.push('git: no commit found (in a container, mark the checkout as a safe.directory)');
  }
  const version = released ? pkg.version : `${pkg.version}-main.${sha ?? 'unknown'}`;
  const site = String(pkg.homepage ?? '').replace(/\/?$/, '/');
  if (!/^https:\/\//.test(site)) errors.push('package.json: `homepage` must be the docs site URL');
  const shallow = git(root, 'rev-parse', '--is-shallow-repository') !== 'false';

  /** Published text: the rules contracts and `.docs.ts` follow apply to JSDoc too (decision 8). */
  const checkText = (where, text) => {
    if (!text) return;
    // Code blocks are code, like inline code spans.
    errors.push(...publishedTextErrors(where, text.replace(/```[\s\S]*?```/g, '')));
  };

  const components = {};
  const criteria = new Set();
  for (const name of names) {
    const { a11y, docs, stories } = loaded.components[name];
    const props = types.componentProps(name);
    if (!props) continue;
    const css = componentCss(src, name, errors);
    const markup = types.markup(name, css.rootClass);
    if (!markup.rootElement)
      errors.push(`${name}: no element renders the root class .${css.rootClass}`);
    if (props.element !== a11y.semantics.element) {
      errors.push(
        `${name}: the props take <${String(props.element)}>'s native attributes, but the contract's element is <${a11y.semantics.element}>`,
      );
    }
    // Every data attribute a selector names must be one the component renders.
    for (const [attr, values] of css.selectors) {
      const rendered = markup.dataAttributes[attr];
      if (!rendered) errors.push(`${name}.css: selects [${attr}], which ${name} never renders`);
      else
        for (const value of values) {
          if (!rendered.includes(value)) {
            errors.push(`${name}.css: selects [${attr}='${value}'], a value ${name} never renders`);
          }
        }
    }

    const where = `${name}Props`;
    // The component's code, without comments: a `deprecate()` call in a comment warns nobody.
    const source = readFileSync(`${src}/components/${name}/${name}.tsx`, 'utf8').replace(
      /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
      '',
    );
    errors.push(...deprecationErrors(name, props, css, markup, source));
    for (const p of props.props) checkText(`${where}.${p.name}`, p.description);
    for (const f of props.forbidden) checkText(`${where}.${f.name}`, f.useInstead);
    for (const axis of props.axes) {
      checkText(`${where} › ${axis.name}`, axis.description);
      axis.branches.forEach((b, i) => {
        const at = `${where} › ${axis.name} branch ${String(i + 1)}`;
        checkText(at, b.summary);
        for (const p of b.props) checkText(`${at}.${p.name}`, p.description);
        for (const f of b.forbidden) checkText(`${at}.${f.name}`, f.useInstead);
        for (const n of b.notInBranch) checkText(`${at}.${n.name}`, n.note);
      });
    }

    // The guidance as authored, without its `component` (the manifest names it already).
    const usage = Object.fromEntries(Object.entries(docs).filter(([key]) => key !== 'component'));
    const meta = stories.default;
    const storyList = Object.keys(stories)
      .filter((key) => key !== 'default' && isExportStory(key, meta))
      .map((key) => {
        const story = stories[key];
        const id = toId(meta.id ?? meta.title, storyNameFromExport(key));
        return {
          id,
          name: key,
          title: story.name ?? storyNameFromExport(key),
          args: serialiseArgs({ ...meta.args, ...story.args }),
          latestSite: `${site}?path=/story/${id}`,
        };
      })
      .sort((a, b) => byCodeUnit(a.id, b.id));

    const changed = shallow
      ? null
      : git(
          root,
          'log',
          '-1',
          '--format=%cs',
          '--',
          `src/components/${name}/${name}.tsx`,
          `src/components/${name}/${name}.css`,
        ) || null;

    for (const claim of a11y.wcag) criteria.add(claim.criterion);
    const ids = runIds(a11y.testedWith);
    const deprecated = types.exports.find((e) => e.name === name)?.deprecated;
    // A deprecated component warns when rendered, like a deprecated prop (CONVENTIONS rule 8).
    if (deprecated && !new RegExp(`\\bdeprecate\\(\\s*['"\`]${name}['"\`]`).test(source)) {
      errors.push(
        `${name}: the export is @deprecated, but ${name}.tsx never calls deprecate('${name}', …)`,
      );
    }
    components[name] = {
      name,
      import: `import { ${name} } from '${SCOPE_PACKAGE}';`,
      ...(deprecated ? { deprecated } : {}),
      ...usage,
      element: a11y.semantics.element,
      ...(a11y.semantics.role ? { role: a11y.semantics.role } : {}),
      rootElement: markup.rootElement ?? props.element ?? '',
      native: props.native,
      props: props.props,
      forbidden: props.forbidden,
      axes: props.axes,
      css: {
        rootClass: css.rootClass,
        dataAttributes: markup.dataAttributes,
        tokens: css.tokens,
        stylesheet: `${SCOPE_PACKAGE}/styles/${name}.css`,
        cssIncludes: css.includes,
        ...(Object.keys(css.deprecated).length > 0 ? { deprecated: css.deprecated } : {}),
      },
      stories: storyList,
      consumerResponsibilities: a11y.consumerResponsibilities,
      accessibility: a11y,
      testRuns: a11y.testedWith.map((run, i) => ({
        id: ids[i],
        sourceChangedSince: changed === null ? null : changed > run.date,
      })),
      wcagEvidence: claimEvidence(
        name,
        a11y,
        ids,
        gate,
        unitAxe.rules,
        cited[name] ?? {},
        errors,
        untracedSeen,
      ),
    };
  }
  // Storybook shows each story's JSDoc (or its `docs.description`) on the docs page, so the same
  // rules apply to it.
  for (const name of names) {
    const file = `src/components/${name}/${name}.stories.tsx`;
    for (const [where, text] of storyDescriptions(`${root}/${file}`)) {
      checkText(`${file} ${where}`, text);
    }
  }
  for (const e of types.exports) checkText(`export ${e.name}`, e.description);
  checkText('gate', gate.tool);
  for (const check of gate.checks) checkText(`gate check '${check.name}'`, check.checks);
  for (const name of names) {
    for (const evidence of components[name]?.wcagEvidence ?? []) {
      for (const title of evidence.tests) checkText(`${name} test title`, title);
    }
  }
  for (const key of UNTRACED) {
    if (!untracedSeen.has(key)) {
      errors.push(`evidence.mjs: UNTRACED lists '${key}', which is now traced: remove it`);
    }
  }

  const tokensPkg = JSON.parse(
    readFileSync(`${root}/node_modules/${TOKENS_PACKAGE}/package.json`, 'utf8'),
  );
  const { tokens } = await import(TOKENS_PACKAGE);
  // A peer (L10 decision 2): consumers install the tokens themselves, so there's one copy.
  const range = pkg.peerDependencies?.[TOKENS_PACKAGE];
  if (!range) errors.push(`package.json: ${TOKENS_PACKAGE} must be a peer dependency`);
  const layers = /@layer\s+([^;]+);/.exec(readFileSync(`${src}/styles/layers.css`, 'utf8'));

  const manifest = sortKeys({
    schemaVersion: 1,
    package: { name: pkg.name, version, released },
    conformance: CONFORMANCE,
    site: { url: site, label: SITE_LABEL },
    exports: types.exports,
    tokens: {
      package: TOKENS_PACKAGE,
      versionRange: workspaceRange(range, tokensPkg.version),
      names: Object.values(tokens)
        .map((t) => t.cssVar)
        .sort(byCodeUnit),
    },
    css: {
      importOrder: [`${TOKENS_PACKAGE}/tokens.css`, `${SCOPE_PACKAGE}/styles.css`],
      perComponent: `Instead of ${SCOPE_PACKAGE}/styles.css, load ${SCOPE_PACKAGE}/styles/<Name>.css for each component you use, after ${TOKENS_PACKAGE}/tokens.css.`,
      layers: layers ? layers[1].split(',').map((l) => l.trim()) : [],
      partClasses:
        'Classes with a double underscore (`.senui-button__label`) are internal parts, not public API, and may change in any release.',
    },
    gate,
    wcag: {
      version: '2.2',
      claims: CLAIM_TEXT,
      axe: { version: unitAxe.version, tags: [...AXE_TAGS], rules: unitAxe.rules },
      criteria: Object.fromEntries(
        [...criteria].sort(byCodeUnit).map((c) => {
          const entry = WCAG22[c];
          if (!entry) errors.push(`WCAG criterion ${c} isn't in the 2.2 table`);
          return [
            c,
            {
              level: entry?.level ?? '',
              title: entry?.title ?? '',
              understanding: `https://www.w3.org/WAI/WCAG22/Understanding/${slug(entry?.title ?? c)}.html`,
            },
          ];
        }),
      ),
    },
    components,
  });

  const usage = readFileSync(`${root}/README.md`, 'utf8').replace(/\r\n?/g, '\n');
  const files = new Map();
  files.set('components.json', `${JSON.stringify(manifest, null, 2)}\n`);
  files.set('llms.txt', llmsTxt(manifest));
  files.set('llms-full.txt', llmsFullTxt(manifest, usage));
  files.set('USAGE.md', usage);
  for (const name of names) {
    if (!manifest.components[name]) continue;
    files.set(
      `docs/${kebab(name)}.md`,
      componentMarkdown(manifest, manifest.components[name], { path: fromDocs }),
    );
  }
  errors.push(...linkErrors(files));
  return { manifest, files, errors: [...new Set(errors)] };
}

/**
 * Generates the files into `<root>/dist`. Throws, failing the build, on any error.
 *
 * @param {string} root The package root.
 */
export async function buildDocs(root) {
  const { files, errors } = await generate(root);
  if (errors.length > 0) {
    throw new Error(`docs generation failed:\n  ${errors.join('\n  ')}`);
  }
  const dist = `${slash(root)}/dist`;
  rmSync(`${dist}/docs`, { recursive: true, force: true });
  for (const [path, content] of files) {
    mkdirSync(dirname(`${dist}/${path}`), { recursive: true });
    writeFileSync(`${dist}/${path}`, content);
  }
  console.log(`docs: wrote ${String(files.size)} files into dist`);
}

/**
 * Every relative link in the Markdown and `llms` files must name a generated file (never a
 * leading slash, never outside dist), so it resolves in `node_modules` and under a site subpath.
 *
 * @param {Map<string, string>} files
 */
export function linkErrors(files) {
  const errors = [];
  const base = 'https://example.github.io/repo/';
  for (const [path, content] of files) {
    if (!/\.(md|txt)$/.test(path)) continue;
    const text = content.replace(/```[\s\S]*?```/g, '');
    for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^[a-z]+:/.test(target) || target.startsWith('#')) continue;
      if (target.startsWith('/')) {
        errors.push(`${path}: link '${target}' starts with a slash`);
        continue;
      }
      const url = new URL(target, new URL(path, base));
      const inDist = url.href.startsWith(base) ? url.href.slice(base.length) : undefined;
      if (inDist === undefined) errors.push(`${path}: link '${target}' leaves the package`);
      else if (!files.has(decodeURIComponent(inDist.split('#')[0]))) {
        errors.push(`${path}: link '${target}' names no generated file`);
      }
    }
  }
  return errors;
}

/**
 * L10 decision 7: what makes a deprecation real, not just documented. A deprecated prop warns when
 * passed (`deprecate('<Name>', '<prop>', …)` in the component); a deprecated data-attribute value
 * still renders, beside its replacement; a deprecated class still renders.
 *
 * @param {string} name
 * @param {{ props: any[], axes: any[] }} props
 * @param {{ deprecated: Record<string, { useInstead: string }> }} css
 * @param {{ dataAttributes: Record<string, string[]> }} markup
 * @param {string} source The component's `.tsx`.
 */
export function deprecationErrors(name, props, css, markup, text) {
  const errors = [];
  // A call in a comment doesn't warn anyone.
  const source = text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
  const all = [
    ...props.props,
    ...props.axes.flatMap((a) =>
      a.branches.flatMap((b) => [...b.props, ...(b.requiresOneOf ?? []).flat()]),
    ),
  ];
  for (const prop of new Set(all.filter((p) => p.deprecated).map((p) => p.name))) {
    const call = new RegExp(`\\bdeprecate\\(\\s*['"\`]${name}['"\`]\\s*,\\s*['"\`]${prop}['"\`]`);
    if (!call.test(source)) {
      errors.push(
        `${name}: prop '${prop}' is @deprecated, but ${name}.tsx never calls deprecate('${name}', '${prop}', …)`,
      );
    }
  }
  for (const [from, { useInstead }] of Object.entries(css.deprecated)) {
    const to = /`([^`]+)`/.exec(useInstead)?.[1] ?? '';
    const data = /^\[(data-[a-z-]+)='([^']*)'\]$/;
    if (from.startsWith('[')) {
      for (const item of [from, to]) {
        const [, attr = '', value = ''] = data.exec(item) ?? [];
        if (!markup.dataAttributes[attr]?.includes(value)) {
          errors.push(
            `${name}.css: deprecated ${from} needs both values rendered, but ${name} never renders ${item}`,
          );
        }
      }
    } else if (
      from.startsWith('.') &&
      !new RegExp(`(^|[^a-z0-9_-])${from.slice(1)}(?![a-z0-9_-])`).test(source)
    ) {
      errors.push(`${name}.css: deprecated class ${from} must still render until its major`);
    }
  }
  return errors;
}

/** A path from the dist root, as a link from a page in `docs/`. */
const fromDocs = (target) =>
  target.startsWith('docs/') ? target.slice('docs/'.length) : `../${target}`;

/** `workspace:^` as pnpm publishes it: the range against the workspace package's version. */
function workspaceRange(spec, version) {
  const match = /^workspace:(.*)$/.exec(spec);
  if (!match) return spec;
  const [, rest] = match;
  if (rest === '^' || rest === '~') return `${rest}${version}`;
  if (rest === '*') return version;
  return rest;
}

/** The Understanding page's file name for a criterion's title. */
function slug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Story args as JSON. Values JSON can't hold are named, so the manifest stays data. */
function serialiseArgs(value) {
  if (typeof value === 'function') return '[function]';
  if (value === null || typeof value !== 'object') return value;
  if ('$$typeof' in value) return '[React element]';
  if (Array.isArray(value)) return value.map(serialiseArgs);
  const out = {};
  for (const key of Object.keys(value).sort(byCodeUnit)) {
    if (value[key] !== undefined) out[key] = serialiseArgs(value[key]);
  }
  return out;
}

/**
 * The text a stories file publishes on its docs page: the JSDoc of the meta and of every exported
 * story, and any `docs.description.story` or `.component` string, by where it is.
 *
 * @param {string} path
 * @returns {[string, string][]}
 */
export function storyDescriptions(path) {
  const text = readFileSync(path, 'utf8');
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out = [];
  const jsDoc = (node) =>
    (node.jsDoc ?? [])
      .map((doc) =>
        typeof doc.comment === 'string'
          ? doc.comment
          : (ts.getTextOfJSDocComment(doc.comment) ?? ''),
      )
      .join('\n\n')
      .trim();
  const descriptions = (node, where) => {
    const visit = (n) => {
      if (
        ts.isPropertyAssignment(n) &&
        ['story', 'component'].includes(n.name.getText(source)) &&
        ts.isObjectLiteralExpression(n.parent) &&
        ts.isPropertyAssignment(n.parent.parent) &&
        n.parent.parent.name.getText(source) === 'description' &&
        (ts.isStringLiteral(n.initializer) || ts.isNoSubstitutionTemplateLiteral(n.initializer))
      ) {
        out.push([`${where} docs.description.${n.name.getText(source)}`, n.initializer.text]);
      }
      ts.forEachChild(n, visit);
    };
    visit(node);
  };
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      const name = declaration.name.getText(source);
      const exported = statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      if (!exported && name !== 'meta') continue;
      const where = name === 'meta' ? 'meta' : `story ${name}`;
      const doc = jsDoc(statement);
      if (doc) out.push([where, doc]);
      if (declaration.initializer) descriptions(declaration.initializer, where);
    }
  }
  return out;
}

function git(cwd, ...args) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return undefined;
  }
}
