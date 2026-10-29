// L10 acceptance criteria, "Changesets": the text rules and what needs a changeset.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { changesetErrors, migrationErrors, shipsChange } from './check-changesets.mjs';

const PACKAGES = ['@scope/components', '@scope/tokens'];
const one = (body, releases = { '@scope/components': 'minor' }) =>
  changesetErrors([{ file: 'x.md', releases, body, errors: [] }], PACKAGES);

describe('changeset text', () => {
  test('plain paragraphs with inline code pass, several of them', () => {
    assert.deepEqual(
      one('Add `Thing`, a native `<div>`.\n\nIts `size` takes `sm` or `md`.\n\nStyles: `x.css`.'),
      [],
    );
  });

  test('a private reference, a name, a heading or a list fails', () => {
    assert.ok(one('Built in L07, see the plan.').some((e) => /private module reference/.test(e)));
    assert.ok(one('Thanks to Emil for this.').some((e) => /person's name/.test(e)));
    assert.ok(one('# Thing\n\nAdd it.').length > 0);
    assert.ok(one('Add:\n\n- one\n- two').length > 0);
    assert.ok(one('Add:\n\n+ one').some((e) => /a list/.test(e)));
    assert.ok(one('Steps:\n\n1. one').some((e) => /numbered list/.test(e)));
    assert.ok(one('> quoted').some((e) => /block quote/.test(e)));
    assert.ok(one('```ts\ncode\n```').some((e) => /code block/.test(e)));
    assert.ok(one('See [the docs](https://example.com).').length > 0);
  });

  test('inline code may hold anything', () => {
    assert.deepEqual(one('Use `- not a list` and `# not a heading` and `L07`.'), []);
  });

  test('the front matter names a published package and a real bump, and there is text', () => {
    assert.ok(
      one('Text.', { '@scope/other': 'minor' }).some((e) => /isn't a published package/.test(e)),
    );
    assert.ok(
      one('Text.', { '@scope/components': 'none' }).some((e) => /releases nothing/.test(e)),
    );
    assert.ok(one('').some((e) => /no text/.test(e)));
    assert.ok(one('Text.', {}).some((e) => /names no package/.test(e)));
  });
});

describe('migration notes', () => {
  test('are named and titled where the changelog links them', () => {
    const page = (title) => `<Meta title="${title}" />\n\nText.`;
    assert.deepEqual(
      migrationErrors(
        [['components-2.mdx', page('Changelog/Migrating to components 2.0.0')]],
        PACKAGES,
      ),
      [],
    );
    assert.equal(
      migrationErrors([['components-2.mdx', page('Changelog/Components 2')]], PACKAGES).length,
      1,
    );
    assert.equal(migrationErrors([['other-2.mdx', page('x')]], PACKAGES).length, 1);
    assert.equal(migrationErrors([['components-1.mdx', page('x')]], PACKAGES).length, 1);
  });
});

describe('what needs a changeset', () => {
  test("a package's source does; its tests, type tests and stories don't", () => {
    assert.equal(shipsChange('packages/react/src/components/Button/Button.tsx'), true);
    assert.equal(shipsChange('packages/react/src/components/Button/Button.css'), true);
    assert.equal(shipsChange('packages/react/src/components/Button/Button.a11y.ts'), true);
    assert.equal(shipsChange('packages/tokens/src/senui-start.tokens.json'), true);
    assert.equal(shipsChange('packages/react/src/components/Button/Button.test.tsx'), false);
    assert.equal(shipsChange('packages/react/src/components/Button/Button.test-d.tsx'), false);
    assert.equal(
      shipsChange('packages/react/src/components/Button/Button.browser.test.tsx'),
      false,
    );
    assert.equal(shipsChange('packages/react/src/components/Button/Button.stories.tsx'), false);
    assert.equal(shipsChange('packages/react/scripts/build-docs.mjs'), false);
    assert.equal(shipsChange('apps/docs/src/blocks/Props.tsx'), false);
  });
});
