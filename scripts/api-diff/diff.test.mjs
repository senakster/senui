// L10 acceptance criteria, "API diff": each a probe against the committed baseline. A test changes
// a copy of the baseline the way a pull request would, and checks what the diff concludes.
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { BASELINE } from './baseline.mjs';
import {
  componentFacts,
  compare,
  matchBranches,
  peerMajorProblems,
  tokenFacts,
  verdict,
} from './diff.mjs';
import { narrowed } from './narrowing.mjs';

const base = JSON.parse(readFileSync(join(BASELINE, 'react/dist/components.json'), 'utf8'));
const basePkg = JSON.parse(readFileSync(join(BASELINE, 'react/package.json'), 'utf8'));

/** The differences after `change` edits a copy of the baseline, and what a `bump` makes of them. */
function probe(change, bump = 'minor', { before = base, exceptions = [], aliased } = {}) {
  const after = structuredClone(before);
  change(after);
  const differences = compare(
    componentFacts(before, basePkg),
    componentFacts(after, basePkg, matchBranches(before, after)),
    aliased,
  );
  return { differences, problems: verdict('pkg', differences, bump, exceptions) };
}

const button = (m) => m.components.Button;
const prop = (list, name) => {
  const found = list.find((p) => p.name === name);
  assert.ok(found, name);
  return found;
};

describe('the API diff', () => {
  test('finds nothing between the baseline and itself', () => {
    assert.deepEqual(probe(() => {}).differences, []);
  });

  test('removing a prop with a minor fails', () => {
    const { differences, problems } = probe((m) => {
      button(m).props = button(m).props.filter((p) => p.name !== 'size');
    });
    assert.ok(
      differences.some(
        (d) => d.key === 'Button › ButtonContent[children] › prop size' && d.level === 'major',
      ),
    );
    assert.match(
      problems.join('\n'),
      /breaking changes need a major bump, but the pending bump is minor/,
    );
  });

  test("removing a prop the baseline didn't deprecate fails, even with a major", () => {
    const remove = (m) => {
      button(m).props = button(m).props.filter((p) => p.name !== 'size');
    };
    assert.match(
      probe(remove, 'major').problems.join('\n'),
      /removed without a deprecation release/,
    );

    const deprecated = structuredClone(base);
    prop(button(deprecated).props, 'size').deprecated = { useInstead: 'Use `scale` instead.' };
    assert.deepEqual(probe(remove, 'major', { before: deprecated }).problems, []);
  });

  test('a dated exception lets an undeprecated removal through, in a major', () => {
    const { problems } = probe(
      (m) => {
        button(m).props = button(m).props.filter((p) => p.name !== 'size');
      },
      'major',
      {
        exceptions: ['children', 'aria-label,icon', 'aria-labelledby,icon'].map((d) => ({
          package: 'pkg',
          fact: `Button › ButtonContent[${d.replace(',', '+')}] › prop size`,
        })),
      },
    );
    // The value facts of `size` go too; they need their own entries.
    assert.equal(problems.length, 3, problems.join('\n'));
    assert.ok(
      problems.every((p) => /value size/.test(p)),
      problems.join('\n'),
    );
  });

  test('narrowing a prop from ReactNode to ReactElement fails a minor', () => {
    const dist = join(BASELINE, 'react/dist');
    const changed = mkdtempSync(join(tmpdir(), 'senui-narrow-'));
    try {
      cpSync(dist, changed, { recursive: true });
      const file = join(changed, 'components/EmptyState/EmptyState.d.ts');
      writeFileSync(
        file,
        readFileSync(file, 'utf8').replaceAll(
          'description?: ReactNode;',
          'description?: ReactElement;',
        ),
      );
      const found = narrowed(dist, changed, ['EmptyStateProps', 'ButtonProps']);
      assert.deepEqual(
        found.map((n) => n.name),
        ['EmptyStateProps'],
      );
      assert.match(found[0].message, /description/);
      // The script reports it as a major difference.
      const problems = verdict(
        'pkg',
        [
          {
            key: 'type EmptyStateProps',
            change: 'changed',
            level: 'major',
            detail: '',
            deprecated: false,
          },
        ],
        'minor',
      );
      assert.equal(problems.length, 1);
    } finally {
      rmSync(changed, { recursive: true, force: true });
    }
  });

  test('identical declarations, brands included, show no narrowing', () => {
    const dist = join(BASELINE, 'react/dist');
    const names = base.exports.filter((e) => e.kind === 'type').map((e) => e.name);
    assert.deepEqual(narrowed(dist, dist, names), []);
  });

  test('removing a type-only export fails', () => {
    const { differences, problems } = probe((m) => {
      m.exports = m.exports.filter((e) => e.name !== 'ButtonVariant');
    });
    assert.deepEqual(
      differences.map((d) => [d.key, d.level]),
      [['export ButtonVariant', 'major']],
    );
    assert.ok(problems.length > 0);
  });

  test('adding a forbidden prop fails', () => {
    const { differences, problems } = probe((m) => {
      button(m).forbidden.push({ name: 'title', useInstead: 'Use `aria-label`.' });
    });
    assert.deepEqual(
      differences.map((d) => [d.key, d.level]),
      [['Button › forbidden title', 'major']],
    );
    assert.ok(problems.length > 0);
  });

  test('removing a forbidden prop, or making a prop optional, passes as a minor', () => {
    const lifted = probe((m) => {
      m.components.Checkbox.forbidden = m.components.Checkbox.forbidden.filter(
        (f) => f.name !== 'aria-invalid',
      );
    });
    assert.deepEqual(
      lifted.differences.map((d) => d.level),
      ['minor'],
    );
    assert.deepEqual(lifted.problems, []);

    const optional = probe((m) => {
      prop(button(m).axes[0].branches[0].props, 'children').required = false;
    });
    assert.deepEqual(
      optional.differences.map((d) => [d.detail, d.level]),
      [['now optional', 'minor']],
    );
    assert.deepEqual(optional.problems, []);
  });

  test('making an optional prop required fails a minor', () => {
    const { differences, problems } = probe((m) => {
      prop(button(m).props, 'size').required = true;
    });
    assert.ok(differences.every((d) => d.detail === 'now required' && d.level === 'major'));
    assert.ok(problems.length > 0);
  });

  test('rewording a branch summary or a description shows no difference', () => {
    const { differences } = probe((m) => {
      button(m).axes[0].branches[0].summary = 'Reworded entirely.';
      prop(button(m).props, 'size').description = 'Reworded too.';
      prop(button(m).props, 'size').type = "'sm' | 'md' | 'lg'";
    });
    assert.deepEqual(differences, []);
  });

  test('adding a variant value with a minor passes', () => {
    const { differences, problems } = probe((m) => {
      prop(button(m).props, 'variant').values.push('link');
      button(m).css.dataAttributes['data-variant'].push('link');
    });
    assert.deepEqual(
      differences.map((d) => [d.key, d.level]),
      [
        ["Button › value variant 'link'", 'minor'],
        ["data .senui-button[data-variant='link']", 'minor'],
      ],
    );
    assert.deepEqual(problems, []);
    // …and with no changeset at all, it fails.
    assert.ok(verdict('pkg', differences, 'none').length > 0);
  });

  test('adding an optional prop to a branch without a discriminant is only that prop', () => {
    const { differences } = probe((m) => {
      m.components.Checkbox.axes[0].branches[0].props.push({
        name: 'mixedLabel',
        type: 'string',
        required: false,
        description: 'x',
      });
    });
    assert.deepEqual(
      differences.map((d) => [d.key, d.level]),
      [['Checkbox › CheckboxMixed{indeterminate} › prop mixedLabel', 'minor']],
    );
  });

  test('adding a required prop to an existing branch fails; a new branch is a minor', () => {
    const required = probe((m) => {
      button(m).axes[0].branches[0].props.push({
        name: 'tone',
        type: 'string',
        required: true,
        description: 'x',
      });
    });
    assert.deepEqual(
      required.differences.map((d) => d.level),
      ['major'],
    );

    const branch = probe((m) => {
      button(m).axes[0].branches.push({
        summary: 'Named by a tooltip.',
        discriminant: ['tooltip'],
        props: [{ name: 'tooltip', type: 'string', required: true, description: 'x' }],
        notInBranch: [{ name: 'children' }],
        forbidden: [],
      });
    });
    assert.ok(branch.differences.length > 0);
    assert.ok(
      branch.differences.every((d) => d.level === 'minor'),
      JSON.stringify(branch.differences),
    );
  });

  test('a component kept as a deprecated alias of its replacement is no removal', () => {
    const rename = (m) => {
      m.components.Action = { ...button(m), name: 'Action' };
      delete m.components.Button;
      prop(m.exports, 'Button').deprecated = { useInstead: 'Use `Action` instead.' };
      m.exports.push({ name: 'Action', kind: 'component', description: '' });
    };
    const { problems } = probe(rename, 'minor', { aliased: new Set(['Button']) });
    assert.deepEqual(problems, []);
    // Without the alias, the component's facts read as removed.
    assert.ok(probe(rename, 'minor').problems.length > 0);
  });

  test('package.json: a narrowed peer range, a retargeted subpath or no sideEffects is breaking', () => {
    const facts = (pkg) => componentFacts(base, pkg, undefined, ['@senakster/senui-tokens']);
    const run = (change) => {
      const pkg = structuredClone(basePkg);
      change(pkg);
      return compare(facts(basePkg), facts(pkg)).map((d) => [d.key, d.level]);
    };
    assert.deepEqual(
      run((p) => {
        p.peerDependencies.react = '^19';
      }),
      [['peer react', 'major']],
    );
    assert.deepEqual(
      run((p) => {
        p.peerDependencies.react = `${String(p.peerDependencies.react)} || ^20`;
      }),
      [['peer react', 'minor']],
    );
    assert.deepEqual(
      run((p) => {
        p.exports['./styles.css'] = './dist/other.css';
      }),
      [['subpath ./styles.css', 'major']],
    );
    assert.deepEqual(
      run((p) => {
        delete p.sideEffects;
      }),
      [['sideEffects', 'major']],
    );
    // The tokens peer follows the tokens' own version; peerMajorProblems covers it.
    assert.deepEqual(
      run((p) => {
        p.peerDependencies['@senakster/senui-tokens'] = '^2.0.0';
      }),
      [],
    );
  });

  test('reordering the layers is breaking', () => {
    const { differences } = probe((m) => {
      m.css.layers = [...m.css.layers].reverse();
    });
    assert.deepEqual(
      differences.map((d) => [d.key, d.level]),
      [['layer order', 'major']],
    );
  });

  test("an alias still has to keep its old component's class, tokens and data values", () => {
    const { differences } = probe(
      (m) => {
        delete m.components.Button;
        prop(m.exports, 'Button').deprecated = { useInstead: 'Use `Action` instead.' };
      },
      'minor',
      { aliased: new Set(['Button']) },
    );
    assert.ok(differences.some((d) => d.key === 'class .senui-button'));
    assert.ok(differences.some((d) => d.key === 'token --senui-button-bg'));
    assert.ok(differences.some((d) => d.key === "data .senui-button[data-variant='danger']"));
    assert.ok(differences.every((d) => /^(class|token|data) /.test(d.key)));
  });

  test('a type handed to consumer code fails when it narrows, and is a minor when it widens', () => {
    const dist = join(BASELINE, 'react/dist');
    const changed = mkdtempSync(join(tmpdir(), 'senui-narrow-'));
    const file = join(changed, 'internal/dialog/useModalDialog.d.ts');
    const reason = /export type DialogCloseReason =[^;]*;/;
    try {
      cpSync(dist, changed, { recursive: true });
      const text = readFileSync(file, 'utf8');
      assert.match(text, reason);
      writeFileSync(
        file,
        text.replace(reason, (t) => t.replace(/;$/, " | 'timeout';")),
      );
      assert.deepEqual(
        narrowed(dist, changed, ['DialogCloseReason', 'DistributiveOmit']).map((n) => [
          n.name,
          n.direction,
        ]),
        [['DialogCloseReason', 'widened']],
      );
      writeFileSync(file, text.replace(reason, "export type DialogCloseReason = 'escape';"));
      assert.deepEqual(
        narrowed(dist, changed, ['DialogCloseReason']).map((n) => [n.name, n.direction]),
        [['DialogCloseReason', 'narrowed']],
      );
    } finally {
      rmSync(changed, { recursive: true, force: true });
    }
  });

  test('a tokens major forces a components major', () => {
    const pkgs = ['@scope/components', '@scope/tokens'];
    assert.equal(peerMajorProblems({ [pkgs[0]]: 'patch', [pkgs[1]]: 'major' }, ...pkgs).length, 1);
    assert.equal(peerMajorProblems({ [pkgs[0]]: 'minor', [pkgs[1]]: 'major' }, ...pkgs).length, 1);
    assert.deepEqual(peerMajorProblems({ [pkgs[0]]: 'major', [pkgs[1]]: 'major' }, ...pkgs), []);
    assert.deepEqual(peerMajorProblems({ [pkgs[0]]: 'none', [pkgs[1]]: 'minor' }, ...pkgs), []);
  });

  test('a removed semantic token is breaking for the tokens package', () => {
    const css = readFileSync(join(BASELINE, 'tokens/dist/tokens.css'), 'utf8');
    const differences = compare(
      tokenFacts(css, {}),
      tokenFacts(css.replace(/--senui-color-bg-backdrop\s*:[^;]+;/g, ''), {}),
    );
    assert.deepEqual(
      differences.map((d) => [d.key, d.level]),
      [['token --senui-color-bg-backdrop', 'major']],
    );
  });
});
