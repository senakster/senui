// L10 decisions 1 and 3: what a release does, step by step, for `.github/workflows/release.yml`.
//
//   node scripts/release.mjs detect            what main holds that npm or the tags don't
//   node scripts/release.mjs publish <dir>     publishes the gated tarballs in <dir>, tokens first
//   node scripts/release.mjs tag               tags each version npm has and git doesn't
//
// Every decision reads the registry and the tags as they are when it runs, never what an earlier
// step attempted, so a re-run after a partial publish does only what is missing, and a tag or a
// site deploy follows what npm actually has.
//
// A package npm has never seen is a first publish: it is done by hand (decision 1: 1.0.0 without
// provenance, then trusted publishing is configured), so `publish` skips it and says so.
import { execFileSync } from 'node:child_process';
import { appendFileSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readChangesets } from './changesets.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = 'https://registry.npmjs.org';

/** The published packages, in publish order: the tokens before the package that peers on them. */
export function workspacePackages(dir = root) {
  const all = readdirSync(join(dir, 'packages'))
    .map((d) => JSON.parse(readFileSync(join(dir, 'packages', d, 'package.json'), 'utf8')))
    .filter((pkg) => !pkg.private);
  const dependsOnAnother = (pkg) =>
    Object.keys({ ...pkg.peerDependencies, ...pkg.dependencies }).some((n) =>
      all.some((other) => other.name === n),
    );
  const dirOf = (name) =>
    readdirSync(join(dir, 'packages')).find(
      (d) =>
        JSON.parse(readFileSync(join(dir, 'packages', d, 'package.json'), 'utf8')).name === name,
    );
  return [...all.filter((p) => !dependsOnAnother(p)), ...all.filter(dependsOnAnother)].map(
    (pkg) => ({ name: pkg.name, version: pkg.version, dir: `packages/${dirOf(pkg.name)}` }),
  );
}

/** The versions npm has of a package, or `null` when npm has never seen it. */
export async function registryVersions(name) {
  const response = await fetch(`${REGISTRY}/${name.replace('/', '%2f')}`, {
    headers: { accept: 'application/vnd.npm.install-v1+json' },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`${name}: the registry answered ${String(response.status)}`);
  return Object.keys((await response.json()).versions ?? {});
}

/** `@scope/name@1.0.0`, the tag Changesets writes for a release. */
export const tagOf = ({ name, version }) => `${name}@${version}`;

/**
 * What a release still has to do, from the packages on `main`, what npm has, and the tags.
 *
 * @param {{ name: string, version: string }[]} packages In publish order.
 * @param {Record<string, string[] | null>} npm Each package's versions on npm, `null` if none.
 * @param {string[]} tags The repository's tags.
 * @param {(pkg: { name: string, version: string }) => boolean} [atVersionCommit] Whether this
 *   commit is the one that set the package's version.
 * @param {boolean} [manual] Run by hand: a pending first publish is gated on any commit, so a gate
 *   that failed at the version commit can be run again after the fix is merged.
 */
export function plan(packages, npm, tags, atVersionCommit = () => true, manual = false) {
  // `0.0.0` is the version before any release, never one to publish; without this, every push
  // before 1.0.0 would read as a release and run the full gate.
  const first = packages.filter((p) => npm[p.name] === null && p.version !== '0.0.0');
  const publish = packages.filter((p) => npm[p.name] !== null && !npm[p.name].includes(p.version));
  const untagged = packages.filter(
    (p) => npm[p.name]?.includes(p.version) === true && !tags.includes(tagOf(p)),
  );
  return {
    first,
    publish,
    untagged,
    /**
     * Anything to gate: unfinished publishes or tags, or the commit that set a version npm has
     * never seen (gated once, for the manual first publish; later pushes don't re-run the gate
     * while it is pending).
     */
    release:
      publish.length + untagged.length > 0 ||
      (first.length > 0 && manual) ||
      first.some(atVersionCommit),
    /** Every package's version is on npm: the site may say "released". */
    allPublished: packages.every((p) => npm[p.name]?.includes(p.version) === true),
  };
}

async function npmState(packages) {
  return Object.fromEntries(
    await Promise.all(packages.map(async (p) => [p.name, await registryVersions(p.name)])),
  );
}

const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/** The repository's tags on the remote: a shallow checkout has none of its own. */
function remoteTags() {
  return git('ls-remote', '--tags', 'origin')
    .split('\n')
    .map((line) => line.split('\trefs/tags/')[1])
    .filter((tag) => tag && !tag.endsWith('^{}'));
}

/**
 * The commit that set a package's current version: the oldest commit of the newest unbroken run of
 * commits whose `package.json` has it. Its tag belongs there, not on whatever commit a later
 * release run checked out (needs full history).
 */
export function versionCommit(pkg, repo = root) {
  const path = `${pkg.dir}/package.json`;
  const inRepo = (...args) =>
    execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  let found;
  for (const commit of inRepo('log', '--format=%H', '--', path).split('\n').filter(Boolean)) {
    let version;
    try {
      version = JSON.parse(inRepo('show', `${commit}:${path}`)).version;
    } catch {
      version = undefined;
    }
    if (version === pkg.version) found = commit;
    else if (found) break;
  }
  if (!found) throw new Error(`${tagOf(pkg)}: no commit sets this version`);
  return found;
}

/** Trusted publishing (OIDC) needs npm 11.5.1 or later; checked before the gate, not after. */
export function assertNpm() {
  const [major, minor, patch] = execFileSync('npm', ['--version'], {
    encoding: 'utf8',
    shell: true,
  })
    .trim()
    .split('.')
    .map(Number);
  if (major < 11 || (major === 11 && (minor < 5 || (minor === 5 && patch < 1)))) {
    throw new Error(
      `npm ${String(major)}.${String(minor)}.${String(patch)} can't publish with OIDC; 11.5.1 or later`,
    );
  }
}

/** Writes `key=value` lines for the workflow, and prints them. */
function output(values) {
  const lines = Object.entries(values).map(
    ([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`,
  );
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);
  console.log(lines.join('\n'));
}

async function detect() {
  const packages = workspacePackages();
  const head = git('rev-parse', 'HEAD').trim();
  const p = plan(
    packages,
    await npmState(packages),
    remoteTags(),
    (pkg) => versionCommit(pkg) === head,
    process.env.GITHUB_EVENT_NAME === 'workflow_dispatch',
  );
  if (p.publish.length > 0) assertNpm();
  const names = (list) => list.map(tagOf);
  for (const pkg of p.first) {
    console.log(
      `${tagOf(pkg)}: npm has never seen ${pkg.name}; the first publish is manual (CONTRIBUTING.md, "Releasing")`,
    );
  }
  output({
    pending: String(readChangesets(root).length > 0),
    release: String(p.release),
    publish: names(p.publish),
    first: names(p.first),
    untagged: names(p.untagged),
  });
}

/** Each tarball in `dir`, read from its own `package.json`. */
function tarballs(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.tgz'))
    .map((file) => {
      // The bare name, run from its directory: GNU tar reads `C:\…` as a remote host.
      const pkg = JSON.parse(
        execFileSync('tar', ['-xOzf', file, 'package/package.json'], {
          cwd: dir,
          encoding: 'utf8',
        }),
      );
      return { file: join(dir, file), name: pkg.name, version: pkg.version };
    });
}

/**
 * Which tarballs to publish now, in order: those whose version npm lacks, never a first publish.
 * Throws if a tarball's version isn't what `main` says, since then the gated build isn't this one.
 */
export function publishPlan(packages, found, npm) {
  return packages.flatMap((pkg) => {
    const tgz = found.find((t) => t.name === pkg.name);
    if (!tgz) throw new Error(`no gated tarball for ${pkg.name}`);
    if (tgz.version !== pkg.version) {
      throw new Error(`${pkg.name}: the tarball is ${tgz.version}, main says ${pkg.version}`);
    }
    if (npm[pkg.name] === null || npm[pkg.name].includes(pkg.version)) return [];
    if (pkg.version === '0.0.0') return [];
    return [tgz];
  });
}

async function publish(dir) {
  assertNpm();
  const packages = workspacePackages();
  const todo = publishPlan(packages, tarballs(dir), await npmState(packages));
  if (todo.length === 0)
    console.log('publish: npm already has every version, or each is a manual first publish');
  for (const tgz of todo) {
    console.log(`publish: ${tagOf(tgz)}`);
    // The packed tarball, never a folder: only `pnpm pack` rewrote the `workspace:` ranges.
    execFileSync('npm', ['publish', tgz.file, '--access', 'public', '--provenance'], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
  }
}

/**
 * Creates a tag through GitHub's API, not `git push`: a pushed ref whose workflow files differ from
 * the default branch's (a workflow changed after the version commit) needs the `workflows`
 * permission, which Actions' token can never have, and the 1.0.0 tags were refused that way.
 */
async function createTag(name, sha) {
  const response = await fetch(
    `https://api.github.com/repos/${String(process.env.GITHUB_REPOSITORY)}/git/refs`,
    {
      method: 'POST',
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${String(process.env.GITHUB_TOKEN)}`,
        'x-github-api-version': '2022-11-28',
      },
      body: JSON.stringify({ ref: `refs/tags/${name}`, sha }),
    },
  );
  if (!response.ok) {
    throw new Error(
      `${name}: GitHub answered ${String(response.status)}: ${await response.text()}\n` +
        `Push it by hand (CONTRIBUTING.md, "Releasing"): git tag ${name} ${sha} && git push origin refs/tags/${name}`,
    );
  }
}

/**
 * Tags each version npm has, at the commit that set it. `expected` (the versions `publish` just
 * published) is waited for, up to five minutes: npm's cached package document can lag a publish.
 */
async function tag(expected) {
  const packages = workspacePackages();
  let npm = await npmState(packages);
  const has = (t) => packages.some((p) => tagOf(p) === t && npm[p.name]?.includes(p.version));
  for (let waited = 0; !expected.every(has) && waited < 300; waited += 15) {
    console.log(`tag: waiting for npm to list ${expected.filter((t) => !has(t)).join(', ')}`);
    await new Promise((done) => setTimeout(done, 15_000));
    npm = await npmState(packages);
  }
  const p = plan(packages, npm, remoteTags());
  for (const pkg of p.untagged) {
    await createTag(tagOf(pkg), versionCommit(pkg));
    console.log(`tag: ${tagOf(pkg)}`);
  }
  output({ allPublished: String(p.allPublished) });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, arg] = process.argv.slice(2);
  if (command === 'detect') await detect();
  else if (command === 'publish' && arg) await publish(resolve(arg));
  // EXPECT: the versions the publish job published, as JSON (the detect job's `publish` output).
  else if (command === 'tag') await tag(JSON.parse(process.env.EXPECT || '[]'));
  else {
    console.error('usage: release.mjs detect | publish <dir> | tag');
    process.exit(1);
  }
}
