// L10 decision 8: the changelog the docs site renders, read from Changesets' default format.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import {
  migratesTo,
  parseChangelog,
  unreleased,
} from '../packages/react/scripts/docs/changelog.mjs';

const fixture = readFileSync(
  new URL('../apps/docs/gate/fixtures/changelog/CHANGELOG.md', import.meta.url),
  'utf8',
);

describe('parseChangelog', () => {
  const log = parseChangelog(fixture);

  test('reads the package, its versions newest first, and each bump group', () => {
    assert.equal(log.name, '@senakster/senui');
    assert.deepEqual(
      log.versions.map((v) => [v.version, v.groups.map((g) => g.type)]),
      [
        ['2.0.0', ['major', 'patch']],
        ['1.1.0', ['minor', 'patch']],
        ['1.0.0', ['major']],
      ],
    );
  });

  test('keeps an entry’s paragraphs apart, with its commit', () => {
    const [entry, uncommitted] = log.versions[1].groups[0].entries;
    assert.equal(entry.commit, '9a8b7c6');
    assert.equal(entry.paragraphs.length, 3);
    assert.match(entry.paragraphs[2], /^Styles: /);
    assert.equal(uncommitted.commit, undefined);
    assert.deepEqual(uncommitted.paragraphs, ['Add `EmptyState`, with no commit recorded.']);
  });

  test('reads dependency updates as a list of package versions', () => {
    const deps = log.versions[1].groups[1].entries[0];
    assert.equal(deps.commit, 'abcdef1');
    assert.deepEqual(deps.dependencies, [
      '@senakster/senui-tokens@1.1.0',
      '@senakster/senui-tokens-extra-long-package-name-for-wrapping@1.1.0',
    ]);
    assert.deepEqual(deps.paragraphs, []);
  });

  test('merges a group’s dependency updates into one entry', () => {
    const [group] = parseChangelog(
      [
        '# @senakster/senui',
        '## 1.0.0',
        '### Patch Changes',
        '- Updated dependencies [e7d4d8c]',
        '- Updated dependencies [e7d4d8c]',
        '- Updated dependencies [7952797]',
        '  - @senakster/senui-tokens@1.0.0',
      ].join('\n'),
    ).versions[0].groups;
    assert.deepEqual(group.entries, [
      { paragraphs: [], dependencies: ['@senakster/senui-tokens@1.0.0'], commit: 'e7d4d8c' },
    ]);
  });

  test('an empty or missing changelog has no versions', () => {
    assert.deepEqual(parseChangelog(''), { name: undefined, versions: [] });
  });
});

describe('unreleased', () => {
  const pending = [
    "---\n'@senakster/senui': minor\n'@senakster/senui-tokens': major\n---\n\nFirst paragraph.\n\nSecond\nparagraph.\n",
    "---\n'@senakster/senui': major\n---\n\nRemove `kind`.\n",
    "---\n'@senakster/senui-tokens': patch\n---\n\nTokens only.\n",
  ];

  test("groups one package's pending changesets by bump, largest first", () => {
    assert.deepEqual(unreleased('@senakster/senui', pending), [
      { type: 'major', heading: 'Major Changes', entries: [{ paragraphs: ['Remove `kind`.'] }] },
      {
        type: 'minor',
        heading: 'Minor Changes',
        entries: [{ paragraphs: ['First paragraph.', 'Second paragraph.'] }],
      },
    ]);
  });

  test('is empty when nothing is pending for the package', () => {
    assert.deepEqual(unreleased('@senakster/senui', [pending[2]]), []);
    assert.deepEqual(unreleased('@senakster/senui', []), []);
  });
});

test('a migration note belongs to majors after the first', () => {
  assert.equal(migratesTo('2.0.0'), 2);
  assert.equal(migratesTo('1.0.0'), undefined);
  assert.equal(migratesTo('2.1.0'), undefined);
});
