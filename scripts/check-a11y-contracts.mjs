// L02 decision 7: every component ships a typed a11y contract. This checks presence and form; the
// contract's content is checked by packages/react/src/internal/a11y/a11y-contracts.test.ts. Fails if:
// - a component directory has no <Name>.a11y.ts exporting `a11y = defineA11yContract<…>()(…)`;
// - a component directory has no <Name>.docs.ts exporting `docs = defineComponentDocs<…>()(…)` (L09);
// - the package entry exports anything other than a component or an allow-listed public type file.
// - a manual run has no `sourceHash` (L10 decision 6).
// Warns when a manual run is stale (the component changed since); with `--release` (the release
// gate), that fails too, unless a pinned `stale-run` exception covers it.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sourceHash, tokenValues, workingTree } from '../packages/react/scripts/source-hash.mjs';
import { runsOf } from './a11y-stamp.mjs';

const SRC = 'packages/react/src';
const COMPONENTS = join(SRC, 'components');
const EXCEPTIONS = 'apps/docs/gate/exceptions.json';
const RELEASE = process.argv.includes('--release');
// Non-component modules the entry may export. Each is public API (CONVENTIONS.md, "Public surface").
const PUBLIC_MODULES = ['./types.js', './manifest.js'];
const errors = [];
const warnings = [];
/** Each component's contract text, by name. */
const contracts = new Map();

const stripComments = (ts) => ts.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const dirs = existsSync(COMPONENTS)
  ? readdirSync(COMPONENTS, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
  : [];

for (const name of dirs) {
  const contract = join(COMPONENTS, name, `${name}.a11y.ts`);
  if (!existsSync(contract)) {
    errors.push(`${name}: missing ${contract}`);
    continue;
  }
  const source = stripComments(readFileSync(contract, 'utf8'));
  if (!/\bexport\s+const\s+a11y\s*=\s*defineA11yContract</.test(source)) {
    errors.push(
      `${name}: ${contract} must \`export const a11y = defineA11yContract<${name}Props>()({ … })\``,
    );
  } else {
    contracts.set(name, readFileSync(contract, 'utf8'));
  }

  // L09 decision 3: usage guidance, typed and checked like the contract.
  const docs = join(COMPONENTS, name, `${name}.docs.ts`);
  if (!existsSync(docs)) {
    errors.push(`${name}: missing ${docs}`);
  } else if (
    !/\bexport\s+const\s+docs\s*=\s*defineComponentDocs</.test(
      stripComments(readFileSync(docs, 'utf8')),
    )
  ) {
    errors.push(
      `${name}: ${docs} must \`export const docs = defineComponentDocs<${name}Props, typeof stories>()({ … })\``,
    );
  }
}

// Every module the entry exports from must be a component directory or an allow-listed file, so
// nothing reaches the public API without a contract, and internals never do.
const entry = stripComments(readFileSync(join(SRC, 'index.ts'), 'utf8'));
for (const [, path] of entry.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
  const component = /^\.\/components\/([^/]+)\/\1\.js$/.exec(path);
  if (component ? dirs.includes(component[1]) : PUBLIC_MODULES.includes(path)) continue;
  errors.push(
    `index.ts exports from ${path}; only ./components/<Name>/<Name>.js or ${PUBLIC_MODULES.join(', ')}`,
  );
}

/**
 * L10 decision 6. A manual run certifies the component as it was: its `sourceHash` is the
 * fingerprint of what it tested. Unstamped is an error; stale (today's fingerprint differs) is a
 * warning on pull requests and an error with `--release`, unless a `stale-run` exception in
 * apps/docs/gate/exceptions.json names the component, pinned to today's fingerprint, so any further
 * edit voids it.
 */
async function staleness(sources) {
  const tokenDir = 'packages/tokens/src';
  const tokens = await tokenValues(
    readdirSync(tokenDir)
      .filter((f) => f.endsWith('.tokens.json'))
      .sort()
      .map((f) => readFileSync(join(tokenDir, f), 'utf8')),
  );
  const read = workingTree(process.cwd());
  const { exceptions } = JSON.parse(readFileSync(EXCEPTIONS, 'utf8'));
  const stale = exceptions.filter((e) => e.check === 'stale-run');
  const today = new Date().toISOString().slice(0, 10);
  const LATEST = new Date(Date.now() + 183 * 864e5).toISOString().slice(0, 10);
  const used = new Set();
  for (const [name, source] of sources) {
    const current = sourceHash(read, name, tokens);
    const runs = runsOf(source).map((r) => r.fields);
    const manual = runs.filter((r) => r.method !== 'automated');
    for (const run of manual.filter((r) => r.sourceHash === undefined)) {
      errors.push(
        `${name}: the ${run.method} run of ${run.date} has no sourceHash; run \`pnpm a11y:stamp ${name}\``,
      );
    }
    const old = manual.filter((r) => r.sourceHash !== undefined && r.sourceHash !== current);
    if (old.length === 0) continue;
    const exception = stale.find((e) => e.component === name && e.sourceHash === current);
    if (exception) used.add(exception);
    const what = `${name}: changed since its manual run(s) of ${[...new Set(old.map((r) => r.date))].join(', ')} (sourceHash ${current})`;
    if (exception) warnings.push(`${what}; excepted until ${exception.expires}`);
    else if (RELEASE) {
      errors.push(
        `${what}. Re-run and \`pnpm a11y:stamp ${name}\`, or add a stale-run exception for sourceHash ${current}`,
      );
    } else warnings.push(`${what}. Re-test, or it needs a stale-run exception to release.`);
  }
  for (const e of stale) {
    const label = `exceptions.json: stale-run ${String(e.component)}`;
    if (!sources.has(e.component)) errors.push(`${label}: no such component`);
    if (!e.reason?.trim()) errors.push(`${label}: no reason`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.expires ?? ''))
      errors.push(`${label}: expires is not YYYY-MM-DD`);
    else if (e.expires < today) errors.push(`${label}: expired on ${e.expires}`);
    // Six months at most, as the gate's own exceptions are set: a stale run is a debt to review.
    else if (e.expires > LATEST) errors.push(`${label}: expires after ${LATEST}, six months out`);
    // Pinned to a fingerprint: once the component changes again, the exception says nothing.
    if (sources.has(e.component) && !used.has(e)) {
      (RELEASE ? errors : warnings).push(
        `${label}: pinned to sourceHash ${String(e.sourceHash)}, which no longer matches the component (or it isn't stale); remove it or re-pin it after review`,
      );
    }
  }
}

await staleness(contracts);

for (const warning of warnings) console.warn(`warning: ${warning}`);
if (errors.length > 0) {
  console.error(`a11y contract check failed:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(`a11y contracts: ${String(dirs.length)} component(s), all with a typed contract.`);
