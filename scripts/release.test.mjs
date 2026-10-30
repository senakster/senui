// L10 acceptance criteria, "Publishing" and "Release gate": what a release does, against fixture
// registry states. No network, no npm.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { plan, publishPlan, tagOf, versionCommit } from './release.mjs';

const TOKENS = '@scope/tokens';
const COMPONENTS = '@scope/components';
const at = (version) => [
  { name: TOKENS, version },
  { name: COMPONENTS, version },
];
const tgz = (version) => at(version).map((p) => ({ ...p, file: `${p.name}-${version}.tgz` }));

describe('plan', () => {
  test('a push with nothing to release does nothing', () => {
    const p = plan(
      at('1.0.0'),
      { [TOKENS]: ['1.0.0'], [COMPONENTS]: ['1.0.0'] },
      at('1.0.0').map(tagOf),
    );
    assert.deepEqual([p.release, p.publish, p.first, p.untagged], [false, [], [], []]);
    assert.equal(p.allPublished, true);
  });

  test('before the first release (0.0.0) nothing is a release', () => {
    const p = plan(at('0.0.0'), { [TOKENS]: null, [COMPONENTS]: null }, []);
    assert.equal(p.release, false);
  });

  test('1.0.0 on main, npm has never seen either: both are manual first publishes', () => {
    const p = plan(at('1.0.0'), { [TOKENS]: null, [COMPONENTS]: null }, []);
    assert.deepEqual(p.first.map(tagOf), ['@scope/tokens@1.0.0', '@scope/components@1.0.0']);
    assert.deepEqual([p.release, p.publish, p.allPublished], [true, [], false]);
  });

  test('a pending first publish gates its own version commit only, not every later push', () => {
    const npm = { [TOKENS]: null, [COMPONENTS]: null };
    assert.equal(plan(at('1.0.0'), npm, [], () => true).release, true);
    assert.equal(plan(at('1.0.0'), npm, [], () => false).release, false);
  });

  test('run by hand, a pending first publish is gated on a later commit too', () => {
    const npm = { [TOKENS]: null, [COMPONENTS]: null };
    assert.equal(plan(at('1.0.0'), npm, [], () => false, true).release, true);
    assert.equal(plan(at('0.0.0'), npm, [], () => false, true).release, false);
  });

  test('after the manual first publish, the versions npm has get their tags', () => {
    const p = plan(at('1.0.0'), { [TOKENS]: ['1.0.0'], [COMPONENTS]: ['1.0.0'] }, []);
    assert.deepEqual(p.untagged.map(tagOf), ['@scope/tokens@1.0.0', '@scope/components@1.0.0']);
    assert.equal(p.allPublished, true);
  });

  test('a partial publish: only the missing package is left, and only the published one is tagged', () => {
    const p = plan(
      at('1.1.0'),
      { [TOKENS]: ['1.0.0', '1.1.0'], [COMPONENTS]: ['1.0.0'] },
      at('1.0.0').map(tagOf),
    );
    assert.deepEqual(p.publish.map(tagOf), ['@scope/components@1.1.0']);
    assert.deepEqual(p.untagged.map(tagOf), ['@scope/tokens@1.1.0']);
    assert.equal(p.allPublished, false);
  });
});

describe('publishPlan', () => {
  test('publishes, tokens first, exactly the versions npm lacks', () => {
    const todo = publishPlan(at('1.1.0'), tgz('1.1.0'), {
      [TOKENS]: ['1.0.0'],
      [COMPONENTS]: ['1.0.0'],
    });
    assert.deepEqual(todo.map(tagOf), ['@scope/tokens@1.1.0', '@scope/components@1.1.0']);
  });

  test('a re-run after a partial publish publishes only the missing package', () => {
    const todo = publishPlan(at('1.1.0'), tgz('1.1.0'), {
      [TOKENS]: ['1.0.0', '1.1.0'],
      [COMPONENTS]: ['1.0.0'],
    });
    assert.deepEqual(todo.map(tagOf), ['@scope/components@1.1.0']);
  });

  test('never a first publish: that one is manual', () => {
    assert.deepEqual(
      publishPlan(at('1.0.0'), tgz('1.0.0'), { [TOKENS]: null, [COMPONENTS]: null }),
      [],
    );
  });

  test('refuses a tarball that is not the version on main', () => {
    assert.throws(
      () =>
        publishPlan(at('1.1.0'), tgz('1.0.9'), { [TOKENS]: ['1.0.0'], [COMPONENTS]: ['1.0.0'] }),
      /the tarball is 1\.0\.9, main says 1\.1\.0/,
    );
    assert.throws(
      () => publishPlan(at('1.1.0'), tgz('1.1.0').slice(0, 1), { [TOKENS]: [], [COMPONENTS]: [] }),
      /no gated tarball for @scope\/components/,
    );
  });
});

describe('versionCommit', () => {
  test('is the commit that set the version, not a later one', () => {
    const repo = mkdtempSync(join(tmpdir(), 'senui-release-'));
    const run = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
    const write = (version, extra = '') =>
      writeFileSync(
        join(repo, 'packages/p/package.json'),
        JSON.stringify({ name: 'p', version, extra }),
      );
    try {
      run('init', '-q');
      run('config', 'user.email', 'probe@example.com');
      run('config', 'user.name', 'probe');
      mkdirSync(join(repo, 'packages/p'), { recursive: true });
      const commit = (message) => {
        run('add', '-A');
        run('commit', '-qm', message);
        return run('rev-parse', 'HEAD');
      };
      write('1.0.0');
      const v1 = commit('1.0.0');
      write('1.0.0', 'unrelated edit');
      commit('later edit');
      writeFileSync(join(repo, 'other.txt'), 'x');
      commit('elsewhere');
      assert.equal(versionCommit({ name: 'p', version: '1.0.0', dir: 'packages/p' }, repo), v1);
      // A later version starts its own run: its tag belongs on the commit that set it.
      write('1.1.0');
      const v11 = commit('1.1.0');
      write('1.1.0', 'again');
      commit('after 1.1.0');
      assert.equal(versionCommit({ name: 'p', version: '1.1.0', dir: 'packages/p' }, repo), v11);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});
