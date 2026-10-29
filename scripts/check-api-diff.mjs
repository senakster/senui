// L10 decision 5. Compares each package's public surface with its baseline (npm `latest`, or the
// committed baseline while it is unpublished) and fails when:
// - the pending bump is lower than the largest difference (a removal or narrowing needs a major, an
//   addition a minor). The pending bump comes from the changesets; on the version pull request,
//   where they've been consumed, from the version `package.json` already has;
// - a fact is removed that the baseline didn't mark deprecated, without an entry in
//   `api-exceptions.json`;
// - the tokens package takes a major and the components package doesn't: the components package's
//   peer range on the tokens changes, which Changesets alone bumps only as a patch (L10 PR 1 probe).
//
// Needs built packages (`pnpm build`). `--write-baseline` rewrites the committed baseline.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { baselineOf, writeBaseline } from './api-diff/baseline.mjs';
import {
  componentFacts,
  compare,
  largest,
  matchBranches,
  peerMajorProblems,
  rank,
  tokenFacts,
  verdict,
} from './api-diff/diff.mjs';
import { narrowed } from './api-diff/narrowing.mjs';
import { pendingBumps } from './changesets.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REACT = '@senakster/senui';
const TOKENS = '@senakster/senui-tokens';
const EXCEPTIONS = join(root, 'scripts/api-diff/api-exceptions.json');

if (process.argv.includes('--write-baseline')) {
  writeBaseline(root);
  console.log('api diff: wrote scripts/api-diff/baseline from the built packages');
  process.exit(0);
}

const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
const today = new Date().toISOString().slice(0, 10);

/** The level of the bump from one version to another (`0.3.1` → `1.0.0` is a major). */
function versionBump(from, to) {
  const [a, b] = [from, to].map((v) => v.split('-')[0].split('.').map(Number));
  if (b[0] > a[0]) return 'major';
  if (b[0] === a[0] && b[1] > a[1]) return 'minor';
  if (b[0] === a[0] && b[1] === a[1] && b[2] > a[2]) return 'patch';
  return 'none';
}

const max = (a, b) => (rank(a) >= rank(b) ? a : b);

const { exceptions = [] } = json(EXCEPTIONS);
const problems = [];
for (const e of exceptions) {
  if (!e.package || !e.fact || !e.reason || !/^\d{4}-\d{2}-\d{2}$/.test(e.expires ?? '')) {
    problems.push(
      `api-exceptions.json: every entry needs package, fact, reason and expires: ${JSON.stringify(e)}`,
    );
  } else if (e.expires < today) {
    problems.push(
      `api-exceptions.json: the entry for ${e.package} ${e.fact} expired on ${e.expires}`,
    );
  }
}

// The changeset files, not `changeset status`, which needs git history back to main (CI's
// checkout is shallow). Dependents' bumps aren't counted; a tokens major reaching the components
// package is checked on its own.
const pending = pendingBumps(root);
const used = new Set();
const bumps = {};
const lines = [];

/** Runs one package's diff; the baseline is fetched, read, and cleaned up. */
async function diffPackage(name, dir, facts) {
  let base;
  try {
    base = await baselineOf(name, dir);
  } catch (error) {
    // Offline is only tolerated on a developer's machine; CI must compare.
    if (!process.env.CI && error instanceof TypeError) {
      console.warn(`api diff: skipped, the registry is unreachable (${error.message})`);
      process.exit(0);
    }
    throw error;
  }
  try {
    const pkg = json(join(root, 'packages', dir, 'package.json'));
    const basePkg = json(join(base.dir, 'package.json'));
    const differences = facts(base.dir, pkg, basePkg);
    const bump = max(pending[name] ?? 'none', versionBump(basePkg.version, pkg.version));
    bumps[name] = bump;
    const relevant = exceptions.filter((e) => e.package === name);
    for (const d of differences) {
      if (relevant.some((e) => e.fact === d.key)) used.add(`${name} ${d.key}`);
    }
    problems.push(...verdict(name, differences, bump, relevant));
    lines.push(
      `api diff: ${name} against ${base.source}: ${String(differences.length)} difference(s), largest ${largest(differences)}; pending bump ${bump}`,
      ...differences.map(
        (d) =>
          `  ${d.level.padEnd(5)} ${d.key}: ${d.detail}${d.deprecated ? ' (deprecated in the baseline)' : ''}`,
      ),
    );
  } finally {
    base.cleanup();
  }
}

await diffPackage(REACT, 'react', (baseDir, pkg, basePkg) => {
  const before = json(join(baseDir, 'dist/components.json'));
  const after = json(join(root, 'packages/react/dist/components.json'));
  // A component whose entry is gone while its export stays, deprecated, is an alias (decision 7).
  const aliased = new Set(
    Object.keys(before.components).filter((n) => {
      const e = after.exports.find((x) => x.name === n);
      return !after.components[n] && e?.kind === 'component' && e.deprecated;
    }),
  );
  const differences = compare(
    componentFacts(before, basePkg, undefined, [TOKENS]),
    componentFacts(after, pkg, matchBranches(before, after), [TOKENS]),
    aliased,
  );
  const names = before.exports
    .filter((e) => e.kind === 'type')
    .map((e) => e.name)
    .filter((n) => after.exports.some((e) => e.name === n && e.kind === 'type'));
  for (const { name, direction, message } of narrowed(
    join(baseDir, 'dist'),
    join(root, 'packages/react/dist'),
    names,
  )) {
    const shown = message.split('\n').slice(0, 3).join(' / ');
    // Narrowed breaks code that compiled; widened (a new member) is an addition, as in the manifest.
    differences.push({
      key: `type ${name} ${direction}`,
      change: 'changed',
      level: direction === 'narrowed' ? 'major' : 'minor',
      detail:
        direction === 'narrowed'
          ? `a value of the baseline's type no longer type-checks: ${shown}`
          : `holds values the baseline's didn't: ${shown}`,
      deprecated: false,
    });
  }
  return differences;
});

await diffPackage(TOKENS, 'tokens', (baseDir, pkg, basePkg) =>
  compare(
    tokenFacts(readFileSync(join(baseDir, 'dist/tokens.css'), 'utf8'), basePkg),
    tokenFacts(readFileSync(join(root, 'packages/tokens/dist/tokens.css'), 'utf8'), pkg),
  ),
);

problems.push(...peerMajorProblems(bumps, REACT, TOKENS));
for (const e of exceptions) {
  if (!used.has(`${e.package} ${e.fact}`)) {
    problems.push(
      `api-exceptions.json: the entry for ${e.package} ${e.fact} matches no difference; remove it`,
    );
  }
}

console.log(lines.join('\n'));
if (problems.length > 0) {
  console.error(`api diff failed:\n${problems.map((p) => `  ${p}`).join('\n')}`);
  process.exit(1);
}
