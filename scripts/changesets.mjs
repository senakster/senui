// Reads the pending changesets in `.changeset/` from the files themselves, with no git and no
// Changesets CLI: CI's checkouts are shallow, and a light job can't install dependencies. Shared by
// the API diff (the pending bump per package) and check-changesets.mjs (the rules for their text).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const BUMPS = ['none', 'patch', 'minor', 'major'];

/**
 * @param {string} root The repository root.
 * @returns {{ file: string, releases: Record<string, string>, body: string, errors: string[] }[]}
 *   One per changeset, with problems reading its front matter.
 */
export function readChangesets(root) {
  const dir = join(root, '.changeset');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .sort()
    .map((file) => {
      const text = readFileSync(join(dir, file), 'utf8').replace(/\r\n?/g, '\n');
      const errors = [];
      const releases = {};
      const front = /^---\n([\s\S]*?)\n---\n?/.exec(text);
      if (!front) return { file, releases, body: text.trim(), errors: ['no front matter'] };
      for (const line of front[1].split('\n').filter((l) => l.trim())) {
        const entry = /^\s*['"]?([^'":]+)['"]?\s*:\s*(\w+)\s*$/.exec(line);
        if (!entry || !BUMPS.includes(entry[2])) {
          errors.push(`can't read "${line}" (want '<package>': major | minor | patch)`);
          continue;
        }
        releases[entry[1]] = entry[2];
      }
      return { file, releases, body: text.slice(front[0].length).trim(), errors };
    });
}

/** Each package's largest pending bump. */
export function pendingBumps(root) {
  const bumps = {};
  for (const { file, releases, errors } of readChangesets(root)) {
    if (errors.length > 0) throw new Error(`.changeset/${file}: ${errors.join('; ')}`);
    for (const [name, type] of Object.entries(releases)) {
      if (BUMPS.indexOf(type) > BUMPS.indexOf(bumps[name] ?? 'none')) bumps[name] = type;
    }
  }
  return bumps;
}
