// L10 decisions 4 and 8. Checks the pending changesets in `.changeset/`:
// - each names a published package with a bump (`major`, `minor` or `patch`) and has text;
// - its text is published text: it becomes the changelog on npm and on the docs site, so the rules
//   for every published string apply (no private reference, no person's name, no Markdown but inline
//   code; CONVENTIONS rule 7), and it has no block Markdown at all (headings, lists, quotes, code
//   blocks): the changelog renders each changeset as paragraphs.
//
// `--require <base>` (the `changesets` job, on a pull request): a pull request that changes a
// package's source (`packages/*/src`, not its tests or stories) or its `exports` must add or edit a
// changeset, unless it carries the `no-release` label (`NO_RELEASE=true`).
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// A TypeScript module, loaded by Node's own type stripping so the light `changesets` job needs no
// install. That holds while published-text.ts imports nothing and uses erasable syntax only (no
// enums, no parameter properties); a dependency there would break only that job.
import { publishedTextErrors } from '../packages/react/src/internal/docs/published-text.ts';
import { readChangesets } from './changesets.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The published packages, by name. */
const PACKAGES = readdirSync(join(root, 'packages'))
  .map((dir) => JSON.parse(readFileSync(join(root, 'packages', dir, 'package.json'), 'utf8')))
  .filter((pkg) => !pkg.private)
  .map((pkg) => pkg.name);

/**
 * Block Markdown the published-text rules don't already name (they catch headings and `-`/`*`
 * lists): numbered and `+` lists, quotes, code blocks.
 */
const BLOCKS = [
  [/^\s*\d+[.)]\s/m, 'a numbered list'],
  [/^\s*\+\s/m, 'a list'],
  [/^\s*>/m, 'a block quote'],
  [/^\s*(```|~~~)/m, 'a code block'],
];

/** Problems with the changesets' form and text. */
export function changesetErrors(changesets, packages = PACKAGES) {
  const errors = [];
  for (const { file, releases, body, errors: read } of changesets) {
    const at = `.changeset/${file}`;
    errors.push(...read.map((e) => `${at}: ${e}`));
    if (Object.keys(releases).length === 0 && read.length === 0) {
      errors.push(`${at}: names no package`);
    }
    for (const [name, type] of Object.entries(releases)) {
      if (!packages.includes(name)) errors.push(`${at}: ${name} isn't a published package`);
      if (type === 'none') errors.push(`${at}: ${name}: 'none' releases nothing; remove the line`);
    }
    if (!body) errors.push(`${at}: no text; say what changes for someone using the package`);
    for (const paragraph of body.split(/\n\s*\n/)) {
      errors.push(...publishedTextErrors(at, paragraph));
      for (const [pattern, what] of BLOCKS) {
        // Inline code spans stay on one line, so a fence's backticks are left to be found.
        if (pattern.test(paragraph.replace(/`[^`\n]+`/g, ''))) {
          errors.push(`${at}: ${what}; write it as paragraphs`);
        }
      }
    }
  }
  return [...new Set(errors)];
}

/**
 * L10 decision 8: a major's migration note is `apps/docs/src/changelog/migrations/<short>-<major>.mdx`
 * (`senui-2.mdx`), titled `Changelog/Migrating to <short> <major>.0.0`, which is where the
 * changelog's fixed link for that version points. A file that breaks the convention would leave the
 * link pointing nowhere.
 */
export function migrationErrors(files, packages = PACKAGES) {
  const shorts = packages.map((name) => name.slice(name.indexOf('/') + 1));
  const errors = [];
  for (const [file, text] of files) {
    const at = `apps/docs/src/changelog/migrations/${file}`;
    const m = /^(.+)-(\d+)\.mdx$/.exec(file);
    if (!m || !shorts.includes(m[1]) || Number(m[2]) < 2) {
      errors.push(
        `${at}: name it <package>-<major>.mdx, for a major after 1 (${shorts.join(', ')})`,
      );
      continue;
    }
    const title = `Changelog/Migrating to ${m[1]} ${m[2]}.0.0`;
    if (!text.includes(`<Meta title="${title}"`))
      errors.push(`${at}: its <Meta> title must be "${title}"`);
  }
  return errors;
}

/** Whether a changed path is something a release ships: package source, not tests or stories. */
export function shipsChange(path) {
  if (!/^packages\/[^/]+\/src\//.test(path)) return false;
  return !/\.(test|test-d|browser\.test|stories)\.[cm]?[jt]sx?$/.test(path);
}

const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/** Why a pull request against `base` needs a changeset and has none, or `undefined`. */
function missingChangeset(base) {
  const changed = git('diff', '--name-only', '--no-renames', `${base}...HEAD`)
    .split('\n')
    .filter(Boolean);
  const reasons = changed.filter(shipsChange);
  for (const path of changed.filter((p) => /^packages\/[^/]+\/package\.json$/.test(p))) {
    const exportsAt = (ref) => {
      try {
        return JSON.stringify(JSON.parse(git('show', `${ref}:${path}`)).exports ?? null);
      } catch {
        return 'null';
      }
    };
    if (exportsAt(base) !== exportsAt('HEAD')) reasons.push(`${path} (exports)`);
  }
  if (reasons.length === 0) return undefined;
  // Added or edited, never deleted: removing someone else's changeset isn't describing this change.
  const added = git('diff', '--name-only', '--diff-filter=AM', `${base}...HEAD`, '--', '.changeset')
    .split('\n')
    .some((p) => /^\.changeset\/[^/]+\.md$/.test(p) && p !== '.changeset/README.md');
  if (added) return undefined;
  return reasons;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = changesetErrors(readChangesets(root));
  const migrations = join(root, 'apps/docs/src/changelog/migrations');
  if (existsSync(migrations)) {
    errors.push(
      ...migrationErrors(
        readdirSync(migrations)
          .filter((f) => f.endsWith('.mdx'))
          .map((f) => [f, readFileSync(join(migrations, f), 'utf8')]),
      ),
    );
  }
  const at = process.argv.indexOf('--require');
  if (at >= 0) {
    const base = process.argv[at + 1];
    if (!base) {
      console.error('usage: check-changesets.mjs [--require <base ref>]');
      process.exit(1);
    }
    const reasons = missingChangeset(base);
    if (reasons && process.env.NO_RELEASE !== 'true') {
      errors.push(
        `this pull request changes what a package ships, with no changeset:\n    ${reasons.join('\n    ')}\n  Run \`pnpm changeset\` and describe the change for someone using the package, or, if nothing a consumer gets changes, add the \`no-release\` label.`,
      );
    } else if (reasons) {
      console.log(`changesets: no changeset, and the no-release label says none is needed.`);
    }
  }
  if (errors.length > 0) {
    console.error(`changeset check failed:\n  ${errors.join('\n  ')}`);
    process.exit(1);
  }
  console.log(
    `changesets: ${String(readChangesets(root).length)} pending, each naming a package and written as published text.`,
  );
}
