// Where the API diff's baseline comes from (L10 decision 5): the `latest` tarball on npm, fetched
// and checked against the registry's integrity hash, never installed, so none of its code runs.
// While a package has never been published, the committed baseline under `baseline/` stands in:
// the package as it was on `main` when the check was added, trimmed to the files the diff reads.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const BASELINE = join(here, 'baseline');
const REGISTRY = 'https://registry.npmjs.org';

/**
 * A package's baseline, as a directory laid out like its tarball (`package.json`, `dist/…`).
 *
 * @param {string} name The package name.
 * @param {string} dir Its folder name under `baseline/` (`react`, `tokens`).
 * @returns {Promise<{ source: string, dir: string, cleanup: () => void }>}
 */
export async function baselineOf(name, dir) {
  const response = await fetch(`${REGISTRY}/${name.replace('/', '%2f')}`, {
    headers: { accept: 'application/vnd.npm.install-v1+json' },
  });
  if (response.status === 404) {
    const fixture = join(BASELINE, dir);
    if (!existsSync(fixture)) throw new Error(`${name} isn't on npm and has no committed baseline`);
    return { source: 'committed baseline (not on npm yet)', dir: fixture, cleanup: () => {} };
  }
  if (!response.ok) throw new Error(`${name}: the registry answered ${String(response.status)}`);
  const doc = await response.json();
  const version = doc['dist-tags']?.latest;
  const dist = version && doc.versions?.[version]?.dist;
  if (!dist?.tarball || !dist.integrity) throw new Error(`${name}: no tarball for latest`);

  const tarball = Buffer.from(await (await fetch(dist.tarball)).arrayBuffer());
  const [algorithm, expected] = dist.integrity.split('-');
  const actual = createHash(algorithm).update(tarball).digest('base64');
  if (actual !== expected)
    throw new Error(`${name}@${version}: the tarball fails its integrity hash`);

  const out = mkdtempSync(join(tmpdir(), 'senui-baseline-'));
  writeFileSync(join(out, 'package.tgz'), tarball);
  // The bare name, run from its directory: GNU tar reads `C:\…` as a remote host.
  execFileSync('tar', ['-xzf', 'package.tgz'], { cwd: out });
  return {
    source: `npm ${name}@${version}`,
    dir: join(out, 'package'),
    cleanup: () => rmSync(out, { recursive: true, force: true }),
  };
}

/** The manifest fields the diff reads; contracts, stories and prose are left out of the baseline. */
const COMPONENT_FIELDS = [
  'axes',
  'css',
  'deprecated',
  'element',
  'forbidden',
  'name',
  'native',
  'props',
  'rootElement',
];

/**
 * Writes the committed baseline from built packages: `node scripts/check-api-diff.mjs
 * --write-baseline`, on `main`, only while the packages are unpublished.
 *
 * @param {string} root The repository root.
 */
export function writeBaseline(root) {
  rmSync(BASELINE, { recursive: true, force: true });
  for (const [dir, files] of [
    ['react', ['dist/components.json']],
    ['tokens', ['dist/tokens.css']],
  ]) {
    const from = join(root, 'packages', dir);
    const to = join(BASELINE, dir);
    mkdirSync(join(to, 'dist'), { recursive: true });
    const pkg = JSON.parse(readFileSync(join(from, 'package.json'), 'utf8'));
    const trimmed = {
      name: pkg.name,
      version: pkg.version,
      exports: pkg.exports,
      sideEffects: pkg.sideEffects,
      peerDependencies: pkg.peerDependencies,
    };
    writeFileSync(join(to, 'package.json'), `${JSON.stringify(trimmed, null, 2)}\n`);
    for (const file of files) {
      if (file.endsWith('components.json')) {
        const manifest = JSON.parse(readFileSync(join(from, file), 'utf8'));
        const components = Object.fromEntries(
          Object.entries(manifest.components).map(([name, c]) => [
            name,
            Object.fromEntries(COMPONENT_FIELDS.filter((k) => k in c).map((k) => [k, c[k]])),
          ]),
        );
        const kept = {
          package: manifest.package,
          exports: manifest.exports,
          css: { layers: manifest.css.layers },
          components,
        };
        writeFileSync(join(to, file), `${JSON.stringify(kept, null, 2)}\n`);
      } else {
        cpSync(join(from, file), join(to, file));
      }
    }
    if (dir === 'react') {
      const dist = join(from, 'dist');
      for (const entry of readdirSync(dist, { recursive: true, withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith('.d.ts')) continue;
        const file = join(entry.parentPath, entry.name);
        const target = join(to, 'dist', relative(dist, file));
        mkdirSync(dirname(target), { recursive: true });
        cpSync(file, target);
      }
    }
  }
}
