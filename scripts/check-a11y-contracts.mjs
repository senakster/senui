// L02 decision 7: every component ships a typed a11y contract. This checks presence and form; the
// contract's content is checked by packages/react/src/internal/a11y/a11y-contracts.test.ts. Fails if:
// - a component directory has no <Name>.a11y.ts exporting `a11y = defineA11yContract<…>()(…)`;
// - the package entry exports anything other than a component or an allow-listed public type file.
// Warns (doesn't fail) when a component's source changed after its last manual a11y run.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'packages/react/src';
const COMPONENTS = join(SRC, 'components');
// Non-component modules the entry may export. Each is public API (CONVENTIONS.md, "Public surface").
const PUBLIC_MODULES = ['./types.js'];
const errors = [];
const warnings = [];

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
    const stale = staleness(name, source);
    if (stale) warnings.push(stale);
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
 * Manual keyboard and screen-reader runs certify the code as it was. If the component's .tsx or .css
 * was committed after the newest such run, say so. Skipped in a shallow clone (CI), where commit
 * dates aren't meaningful. TestRun entries are flat objects, so a regex can read them.
 */
function staleness(name, source) {
  let newestRun = '';
  for (const [run] of source.matchAll(/\{[^{}]*\}/g)) {
    if (!/method:\s*['"](screen reader|keyboard)['"]/.test(run)) continue;
    const date = /date:\s*['"](\d{4}-\d{2}-\d{2})['"]/.exec(run)?.[1] ?? '';
    if (date > newestRun) newestRun = date;
  }
  let changed;
  try {
    if (git('rev-parse', '--is-shallow-repository') === 'true') return undefined;
    changed = git(
      'log',
      '-1',
      '--format=%cs',
      '--',
      join(COMPONENTS, name, `${name}.tsx`),
      join(COMPONENTS, name, `${name}.css`),
    );
  } catch {
    return undefined;
  }
  if (changed && changed > newestRun) {
    return `${name}: source changed ${changed}, after its last manual a11y run (${newestRun || 'none'}). Re-test and update testedWith.`;
  }
  return undefined;
}

function git(...args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

for (const warning of warnings) console.warn(`warning: ${warning}`);
if (errors.length > 0) {
  console.error(`a11y contract check failed:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(`a11y contracts: ${String(dirs.length)} component(s), all with a typed contract.`);
