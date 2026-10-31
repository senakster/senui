// Where the API diff's baseline comes from (L10 decision 5): the `latest` tarball on npm, fetched
// and checked against the registry's integrity hash, never installed, so none of its code runs.
// A package npm has never seen has no baseline: its first publish is the baseline for the next.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REGISTRY = 'https://registry.npmjs.org';

/**
 * A package's baseline, as a directory laid out like its tarball (`package.json`, `dist/…`), or
 * `null` when npm has never seen the package.
 *
 * @param {string} name The package name.
 * @returns {Promise<{ source: string, dir: string, cleanup: () => void } | null>}
 */
export async function baselineOf(name) {
  const response = await fetch(`${REGISTRY}/${name.replace('/', '%2f')}`, {
    headers: { accept: 'application/vnd.npm.install-v1+json' },
  });
  if (response.status === 404) return null;
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
