// L10 acceptance criteria, "Stale runs": each a probe. Edits are made in memory, through the
// `read` the fingerprint takes, so no source file is touched.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { sourceHash, tokenValues, workingTree } from '../packages/react/scripts/source-hash.mjs';
import { runsOf, stamp } from './a11y-stamp.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tree = workingTree(root);
const C = 'packages/react/src/components';
const NAMES = readdirSync(join(root, C)).sort();
const TOKENS = 'packages/tokens/src/senui-start.tokens.json';

let tokens;
before(async () => {
  tokens = await tokenValues([readFileSync(join(root, TOKENS), 'utf8')]);
});

/** `read`, with `path`'s text changed by `edit`. */
function edited(path, edit) {
  const text = tree(path);
  assert.ok(text !== undefined, path);
  const changed = edit(text);
  assert.notEqual(changed, text, `the edit to ${path} changed nothing`);
  return (p) => (p === path ? changed : tree(p));
}

const hashes = (read, t = tokens) =>
  Object.fromEntries(NAMES.map((n) => [n, sourceHash(read, n, t)]));
const changedBy = (read, t) => {
  const was = hashes(tree);
  const now = hashes(read, t);
  return NAMES.filter((n) => was[n] !== now[n]);
};

describe('sourceHash', () => {
  test('a JSDoc-only or type-only edit leaves it unchanged; a behavioural edit changes it', () => {
    const button = `${C}/Button/Button.tsx`;
    const jsdoc = edited(button, (t) =>
      t.replace('/** Visual emphasis.', '/** Visual emphasis, reworded for the probe.'),
    );
    const type = edited(
      button,
      (t) => `${t}\nexport type ProbeOnly = { readonly probe: string };\n`,
    );
    const behaviour = edited(button, (t) => t.replace("type = 'button',", "type = 'submit',"));
    assert.deepEqual(changedBy(jsdoc), []);
    assert.deepEqual(changedBy(type), []);
    // Dialog and AlertDialog render Button (their close and footer buttons).
    assert.deepEqual(changedBy(behaviour), ['AlertDialog', 'Button', 'Dialog']);
  });

  test('an edit to useFieldWiring makes every component that wires a field stale', () => {
    const wiring = 'packages/react/src/internal/field/useFieldWiring.ts';
    const read = edited(wiring, (t) => t.replace(/-control`/, '-input`'));
    const changed = changedBy(read);
    for (const name of ['Checkbox', 'CheckboxGroup', 'Switch', 'TextInput']) {
      assert.ok(changed.includes(name), `${name} isn't stale: ${changed.join(', ')}`);
    }
    for (const name of ['Button', 'Dialog', 'EmptyState']) assert.ok(!changed.includes(name), name);
  });

  test("a parent's runs heard its children: a TextInput edit stales FormField too", () => {
    const read = edited(`${C}/TextInput/TextInput.tsx`, (t) =>
      t.replace("type = 'text'", "type = 'search'"),
    );
    assert.deepEqual(changedBy(read), ['FormField', 'TextInput']);
  });

  test('an announcement with no quote counts whole', () => {
    // Find a component-owned announcement that describes what was heard without quoting it.
    const name = NAMES.find((n) =>
      /announces:\s*'[^'"]+',/.test(tree(`${C}/${n}/${n}.a11y.ts`) ?? ''),
    );
    assert.ok(name, 'no contract has an unquoted announcement');
    const path = `${C}/${name}/${name}.a11y.ts`;
    const read = edited(path, (t) => t.replace(/(announces:\s*')([^'"]+)(',)/, '$1$2 Reworded.$3'));
    assert.ok(changedBy(read).includes(name));
  });

  test('a stylesheet comment is no change; a declaration and a token value are', () => {
    const css = `${C}/Button/Button.css`;
    assert.deepEqual(changedBy(edited(css, (t) => `/* A comment. */\n${t}`)), []);
    assert.deepEqual(
      changedBy(edited(css, (t) => t.replace('display: inline-grid;', 'display: grid;'))),
      // Dialog and AlertDialog load Button.css too.
      ['AlertDialog', 'Button', 'Dialog'],
    );
    const accent = new Map(tokens);
    accent.set('--senui-color-bg-accent', '{"value":"probe"}');
    assert.ok(changedBy(tree, accent).includes('Button'));
  });

  test('in the contract, only what a run checks counts: quoted speech and keys, not prose', () => {
    const contract = `${C}/Button/Button.a11y.ts`;
    const text = tree(contract);
    const quote = /"([^"]+)"/.exec(text.slice(text.indexOf('announces:')))?.[1];
    assert.ok(quote);
    const when = /when: '([^']+)'/.exec(text)?.[1];
    assert.ok(when);
    assert.deepEqual(changedBy(edited(contract, (t) => t.replace(when, `${when}, reworded`))), []);
    assert.deepEqual(changedBy(edited(contract, (t) => t.replace(`"${quote}"`, `"${quote}x"`))), [
      'Button',
    ]);
  });

  test('needs no git: the same answer from any checkout, shallow or full', () => {
    // Everything is read through `read`; nothing in it calls git.
    const source = readFileSync(join(root, 'packages/react/scripts/source-hash.mjs'), 'utf8');
    assert.doesNotMatch(source, /child_process/);
  });
});

describe('a11y:stamp', () => {
  const contract = [
    'export const a11y = x({',
    '  testedWith: [',
    "    { method: 'automated', tool: 'axe', date: '2026-10-17' },",
    '    {',
    "      method: 'keyboard',",
    "      date: '2026-10-17',",
    '    },',
    '    {',
    "      method: 'forced colours',",
    "      date: '2026-10-18',",
    "      sourceHash: 'old',",
    '    },',
    '  ],',
    '});',
  ].join('\n');

  test('writes the hash on its own line under the date, and replaces an old one', () => {
    const out = stamp(contract, [
      [1, 'aaaa'],
      [2, 'bbbb'],
    ]);
    assert.match(out, /date: '2026-10-17',\n {6}sourceHash: 'aaaa',\n {4}\},/);
    assert.match(out, /sourceHash: 'bbbb',/);
    assert.doesNotMatch(out, /'old'/);
    assert.deepEqual(
      runsOf(out).map((r) => r.fields.sourceHash),
      [undefined, 'aaaa', 'bbbb'],
    );
  });

  test('every manual run in the package is stamped', () => {
    for (const name of NAMES) {
      for (const { fields } of runsOf(tree(`${C}/${name}/${name}.a11y.ts`))) {
        if (fields.method === 'automated') assert.equal(fields.sourceHash, undefined, name);
        else assert.match(fields.sourceHash ?? '', /^[0-9a-f]{16}$/, `${name} ${fields.method}`);
      }
    }
  });
});
