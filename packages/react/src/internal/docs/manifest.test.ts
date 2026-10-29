// @vitest-environment node
// L09 decision 8: the checks generation can't cover by itself. The generator runs in tsdown's
// `build:before` hook and fails the build on its own errors (a prop or branch without JSDoc, an
// inline union, private text, an identifier a consumer can't import); this runs it from `src`
// again and checks its output as data.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, test } from 'vitest';
import {
  UNTRACED,
  axeCoverage,
  generate,
  linkErrors,
  type Generated,
} from '../../../scripts/build-docs.mjs';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const read = (path: string) =>
  readFileSync(new URL(path, new URL('../../../', import.meta.url)), 'utf8');

let first: Generated;
beforeAll(async () => {
  first = await generate(root);
}, 120_000);

const file = (path: string) => {
  const content = first.files.get(path);
  if (content === undefined) throw new Error(`not generated: ${path}`);
  return content;
};
const components = () => Object.values(first.manifest.components);
/** A component's page: `docs/<kebab-case name>.md`, the root class without its prefix. */
const pageOf = (component: { css: { rootClass: string } }) =>
  file(`docs/${component.css.rootClass.slice('senui-'.length)}.md`);

describe('the generator', () => {
  test('reports no errors', () => {
    expect(first.errors).toEqual([]);
  });

  test('builds plain data: the manifest survives a JSON round trip', () => {
    expect(JSON.parse(JSON.stringify(first.manifest))).toEqual(first.manifest);
    expect(JSON.parse(file('components.json'))).toEqual(first.manifest);
  });

  test('is deterministic, whatever the program order or line endings', async () => {
    const runs = [
      await generate(root),
      await generate(root, { reorder: true }),
      await generate(root, { crlf: true }),
    ];
    for (const run of runs) {
      expect(run.errors).toEqual([]);
      expect([...run.files.keys()]).toEqual([...first.files.keys()]);
      for (const [path, content] of first.files) expect(run.files.get(path), path).toBe(content);
    }
  }, 240_000);

  test('writes `\\n` line endings, relative paths and no machine paths', () => {
    for (const [path, content] of first.files) {
      expect(content.includes('\r'), path).toBe(false);
      expect(content.includes(root.replaceAll('\\', '/')), path).toBe(false);
      expect(/[A-Z]:[\\/]/.test(content), path).toBe(false);
    }
  });

  test('marks a build unreleased unless SENUI_RELEASE=1', async () => {
    const pkg = JSON.parse(read('package.json')) as { version: string };
    expect(first.manifest.package.released).toBe(false);
    expect(first.manifest.package.version).toMatch(new RegExp(`^${pkg.version}-main\\.`));
    expect(file('llms.txt')).toContain('This build is unreleased');
    const release = await generate(root, { env: { SENUI_RELEASE: '1' } });
    expect(release.manifest.package).toMatchObject({ released: true, version: pkg.version });
  }, 120_000);
});

describe('the manifest', () => {
  test('lists every entry export, with its kind', () => {
    const entry = read('src/index.ts');
    const names = [...entry.matchAll(/export (?:type )?\{([^}]+)\}/g)].flatMap(([, list]) =>
      (list ?? '')
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean),
    );
    expect(first.manifest.exports.map((e) => e.name).sort()).toEqual([...names].sort());
    const kinds = Object.fromEntries(first.manifest.exports.map((e) => [e.name, e.kind]));
    expect(kinds).toMatchObject({
      Button: 'component',
      focusFirstInvalid: 'function',
      ButtonProps: 'type',
    });
  });

  test('gives each component its axes, never the cross product', () => {
    const axes = Object.fromEntries(
      components().map((c) => [
        c.name,
        c.axes.map((a) => `${a.name}:${String(a.branches.length)}`),
      ]),
    );
    expect(axes).toEqual({
      AlertDialog: ['DialogName:3', 'DialogOpenState:2'],
      Button: ['ButtonContent:3'],
      Checkbox: ['CheckboxMixed:2', 'CheckboxName:3'],
      CheckboxGroup: [],
      Dialog: ['DialogName:3', 'DialogCloseButton:2', 'DialogOpenState:2'],
      EmptyState: [],
      FormField: [],
      Switch: ['CheckboxName:3'],
      TextInput: ['TextInputName:3'],
    });
  });

  test('lists Checkbox’s forbidden `aria-invalid` with what to use instead', () => {
    expect(first.manifest.components.Checkbox?.forbidden).toContainEqual({
      name: 'aria-invalid',
      useInstead: 'Use `error`.',
    });
  });

  test('records where props land when the root and the native element differ', () => {
    expect(first.manifest.components.Checkbox).toMatchObject({
      element: 'input',
      rootElement: 'div',
      native: { element: 'input' },
    });
  });

  test('carries Checkbox’s composition rule for CheckboxGroup', () => {
    expect(first.manifest.components.Checkbox?.composition).toContainEqual(
      expect.objectContaining({ parent: 'CheckboxGroup', required: ['value'] }),
    );
    expect(file('docs/checkbox.md')).toContain('Inside [CheckboxGroup](checkbox-group.md)');
  });

  test('takes WCAG levels from the 2.2 table', () => {
    expect(first.manifest.wcag.criteria['2.4.7']).toMatchObject({ level: 'AA' });
    expect(first.manifest.wcag.criteria['4.1.2']).toMatchObject({
      level: 'A',
      understanding: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
    });
  });

  test('prints no type that names an identifier a consumer can’t import', () => {
    // A second, independent check of the generator's own: every capitalised identifier in a
    // printed type is an entry export, a React type or a TypeScript lib type.
    const exported = new Set(first.manifest.exports.map((e) => e.name));
    const react = read('node_modules/@types/react/index.d.ts');
    const lib = ['Exclude', 'HTMLElement', 'HTMLHeadingElement', 'Readonly', 'ReadonlyArray'];
    const printed = components().flatMap((c) => [
      ...c.props,
      ...c.axes.flatMap((a) =>
        a.branches.flatMap((b) => [...b.props, ...(b.requiresOneOf ?? []).flat()]),
      ),
    ]);
    for (const prop of printed) {
      for (const [id] of prop.type.matchAll(/\b[A-Z][A-Za-z0-9]*\b/g)) {
        const known =
          exported.has(id) ||
          lib.includes(id) ||
          new RegExp(`\\b(type|interface) ${id}\\b`).test(react);
        expect(known, `${prop.name}: ${prop.type} names ${id}`).toBe(true);
      }
    }
  });
});

describe('evidence (decision 5)', () => {
  test('the gate is one automated run, with every check its specs run', () => {
    const { gate } = first.manifest;
    expect(gate).toMatchObject({ id: 'gate', method: 'automated' });
    expect(gate.checks.map((c) => c.name)).toEqual(
      expect.arrayContaining(['axe', 'semantics', 'target size', 'tab walk', 'resets', 'motion']),
    );
    expect(gate.checks.find((c) => c.name === 'tab walk')?.criteria).toContain('2.4.11');
    // The axe check's criteria come from axe-core's rule tags, not a written list.
    expect(gate.checks.find((c) => c.name === 'axe')?.criteria).toContain('1.4.3');
  });

  test('every claim names the runs it rests on, and every run id exists', () => {
    for (const component of components()) {
      const ids = new Set([...component.testRuns.map((r) => r.id), first.manifest.gate.id]);
      expect(
        component.wcagEvidence.map((e) => e.criterion),
        component.name,
      ).toEqual(component.accessibility.wcag.map((c) => c.criterion));
      for (const evidence of component.wcagEvidence) {
        expect(evidence.runs.length, `${component.name} ${evidence.criterion}`).toBeGreaterThan(0);
        for (const id of evidence.runs) expect(ids.has(id), `${component.name}: ${id}`).toBe(true);
      }
    }
  });

  test('automated evidence for a criterion axe doesn’t test rests on the gate where it checks it', () => {
    const dialog = first.manifest.components.Dialog?.wcagEvidence.find(
      (e) => e.criterion === '2.4.11',
    );
    expect(dialog?.axeRules).toEqual([]);
    expect(dialog?.runs).toContain('gate');
    expect(dialog?.gateChecks).toContain('tab walk');
    expect(file('docs/dialog.md')).toContain('`gate`: tab walk');
  });

  test('a test named for its criterion is evidence, and untraced claims are flagged', () => {
    const textInput = first.manifest.components.TextInput?.wcagEvidence.find(
      (e) => e.criterion === '3.3.8',
    );
    expect(textInput?.tests).toEqual([
      'paste is not prevented, and the pasted value reaches onChange (WCAG 3.3.8)',
    ]);
    const flagged = components().flatMap((c) =>
      c.wcagEvidence.filter((e) => e.untraced).map((e) => `${c.name} ${e.criterion}`),
    );
    expect(flagged.sort()).toEqual([...UNTRACED].sort());
    expect(UNTRACED).toEqual([]);
    // A test in one component's file is evidence for the component its describe names.
    const group = first.manifest.components.CheckboxGroup?.wcagEvidence.find(
      (e) => e.criterion === '3.3.1',
    );
    expect(group?.tests).toContain(
      'blocks the submit, focuses the first box, and shows the message on the group (WCAG 3.3.1)',
    );
    const button = first.manifest.components.Button?.wcagEvidence.find(
      (e) => e.criterion === '2.5.2',
    );
    expect(button?.tests).toEqual([
      'activates on the up event, and a press released off it does nothing (WCAG 2.5.2)',
    ]);
  });

  test('axe coverage comes from axe-core’s rule metadata', () => {
    const { rules } = axeCoverage(root, ['wcag2aa']);
    expect(rules['1.4.3']).toEqual(['color-contrast']);
    expect(rules['2.4.11']).toBeUndefined();
  });
});

describe('the published files', () => {
  test('every link resolves inside dist, and under a site subpath', () => {
    expect(linkErrors(first.files)).toEqual([]);
    expect(
      linkErrors(new Map([['docs/a.md', '[x](b.md) [y](/llms.txt) [z](../../out.md)']])),
    ).toEqual([
      "docs/a.md: link 'b.md' names no generated file",
      "docs/a.md: link '/llms.txt' starts with a slash",
      "docs/a.md: link '../../out.md' leaves the package",
    ]);
  });

  test('llms.txt opens with a title and a summary carrying the conformance preamble', () => {
    const [title, summary] = file('llms.txt').split('\n\n');
    expect(title).toBe('# @senakster/senui');
    expect(summary).toMatch(/^> /);
    expect(summary).toContain("A component can't conform to WCAG on its own; only a page can.");
    expect(summary).toContain('Every component lists what your app must still do.');
    expect(file('llms-full.txt')).toContain(first.manifest.conformance);
  });

  test('each component page puts Your app must before Props, and llms-full has every page', () => {
    for (const component of components()) {
      const page = pageOf(component);
      expect(page.startsWith(`# ${component.name}\n`), component.name).toBe(true);
      const must = page.indexOf('\n## Your app must\n');
      const props = page.indexOf('\n## Props\n');
      expect(must, component.name).toBeGreaterThan(0);
      expect(must, component.name).toBeLessThan(props);
      expect(page).toContain(first.manifest.conformance);
      expect(file('llms-full.txt')).toContain(`\n## ${component.name}\n`);
    }
  });

  test('component-owned speech is "observed"; consumer-owned never is', () => {
    for (const component of components()) {
      const page = pageOf(component);
      const must = page.slice(page.indexOf('## Your app must'), page.indexOf('## Usage'));
      expect(must, component.name).not.toMatch(/observed/i);
      for (const a of component.accessibility.announcements) {
        if (a.owner === 'component') expect(page).toContain(`${a.when} (mechanism:`);
      }
    }
    expect(file('docs/button.md')).toContain('Quoted speech is in Danish (`da`).');
    expect(file('docs/button.md')).toContain('other readers may differ');
  });

  test('shows the package version each run tested, next to this one', () => {
    expect(file('docs/button.md')).toContain(
      `Package version tested: pre-release build; this version: ${first.manifest.package.version}.`,
    );
  });

  test('always renders Known issues', () => {
    for (const component of components()) {
      expect(pageOf(component)).toMatch(
        /### Known issues\n\n(None known as of \d{4}-\d{2}-\d{2}(; manual runs predate later changes)?\.|- )/,
      );
    }
  });
});
