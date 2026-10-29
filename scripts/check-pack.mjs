// L10 decision 9. Packs each published package exactly as release does (`pnpm pack`, which runs
// prepack and rewrites `workspace:` ranges) and checks what's inside the tarball:
// - every file matches an allowed pattern, and the required files are there;
// - no `workspace:` range survives in the packed package.json;
// - the components package names the tokens package as a peer, at the tokens' own version;
// - attw: every code entry's types resolve under node16 (ESM) and bundler resolution (ADR-0020).
//   node10 and node16-from-CJS are out by design (ESM only, ADR-0003), and the asset subpaths
//   (CSS, .txt, .md) are files to load, never modules TypeScript imports.
//
// Needs a built workspace (`pnpm build`).
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS = '@senakster/senui-tokens';

// What a tarball may hold. CHANGELOG.md exists from the first `changeset version` on.
const PACKAGES = {
  'packages/react': {
    required: ['package.json', 'README.md', 'LICENSE'],
    allowed: [
      /^(package\.json|README\.md|LICENSE|CHANGELOG\.md)$/,
      /^dist\/.+\.(js|d\.ts|css|json|md|txt)$/,
    ],
    assets: ['./styles.css', './llms.txt', './llms-full.txt', './USAGE.md'],
  },
  'packages/tokens': {
    required: ['package.json', 'README.md', 'LICENSE'],
    allowed: [/^(package\.json|README\.md|LICENSE|CHANGELOG\.md)$/, /^dist\/.+\.(js|d\.ts|css)$/],
    assets: ['./tokens.css'],
  },
};

const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: 'utf8' });
// pnpm is a .cmd shim on Windows, which only a shell can start; the destination is our own temp path.
const pnpmPack = (dest, cwd) =>
  execSync(`pnpm pack --pack-destination "${dest}"`, { cwd, encoding: 'utf8' });

const errors = [];
const packed = {};
const out = mkdtempSync(join(tmpdir(), 'senui-pack-'));
try {
  for (const [dir, rules] of Object.entries(PACKAGES)) {
    const before = new Set(readdirSync(out));
    pnpmPack(out, join(root, dir));
    const tgz = readdirSync(out).find((f) => !before.has(f));
    const file = join(out, tgz);
    // tar gets the bare name, run from its directory: GNU tar reads `C:\…` as a remote host.
    const files = run('tar', ['-tzf', tgz], out)
      .split(/\r?\n/)
      .filter((f) => f && !f.endsWith('/'))
      .map((f) => f.replace(/^package\//, ''));
    const manifest = JSON.parse(run('tar', ['-xOzf', tgz, 'package/package.json'], out));
    packed[manifest.name] = manifest;

    for (const f of files) {
      if (!rules.allowed.some((re) => re.test(f)))
        errors.push(`${manifest.name}: unexpected file in the tarball: ${f}`);
    }
    // CHANGELOG.md exists from the first `changeset version` on, and then it ships too.
    const changelog = existsSync(join(root, dir, 'CHANGELOG.md')) ? ['CHANGELOG.md'] : [];
    for (const f of [...rules.required, ...changelog]) {
      if (!files.includes(f)) errors.push(`${manifest.name}: the tarball is missing ${f}`);
    }
    const text = JSON.stringify(manifest);
    if (text.includes('workspace:'))
      errors.push(`${manifest.name}: the packed package.json still has a workspace: range`);

    try {
      execSync(
        `pnpm exec attw "${file}" --profile esm-only --format table-flipped --exclude-entrypoints ${rules.assets.join(' ')}`,
        { cwd: root, encoding: 'utf8', stdio: 'pipe' },
      );
    } catch (e) {
      errors.push(
        `${manifest.name}: attw found type resolution problems:\n${String(e.stdout).trim()}`,
      );
    }
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}

const react = packed['@senakster/senui'];
const tokens = packed[TOKENS];
if (react && tokens) {
  const peer = react.peerDependencies?.[TOKENS];
  if (peer !== `^${tokens.version}`) {
    errors.push(
      `@senakster/senui: peer ${TOKENS} is ${peer ?? 'missing'}, expected ^${tokens.version}`,
    );
  }
  if (react.dependencies?.[TOKENS])
    errors.push(`@senakster/senui: ${TOKENS} must be a peer, not a dependency`);
}

if (errors.length) {
  console.error(`pack check failed:\n${errors.map((e) => `  ${e}`).join('\n')}`);
  process.exit(1);
}
console.log(
  `pack: ${Object.keys(packed).join(', ')} hold only the expected files, with no workspace: range, and their types resolve (attw).`,
);
