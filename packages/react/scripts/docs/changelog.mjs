// L10 decision 8: reads a package's changelog for the docs site. Changesets' default generator
// writes `CHANGELOG.md` as:
//
//   # <package>
//   ## <version>
//   ### Major Changes | Minor Changes | Patch Changes
//   - <commit>: <first paragraph>          (the commit is left out when Changesets has none)
//     <further lines and paragraphs, indented two spaces>
//   - Updated dependencies [<commits>]
//     - <package>@<version>
//
// That is the generator `.changeset/config.json` names (`@changesets/cli/changelog`). A
// GitHub-linking generator writes `[#12](…) [`abc`](…) Thanks [@user]!: text` instead, which this
// doesn't read; L10 decision 8 rules it out (it adds links and names).
//
// Pending changesets (`.changeset/*.md`) become the Unreleased section. Changeset text is published
// text with no block Markdown (check-changesets.mjs), so an entry is paragraphs of inline Markdown.
// Runs in the browser (the docs blocks) and in Node (its tests): no imports.

/** Bump types, largest first, with the heading Changesets gives each. */
export const BUMP_HEADINGS = [
  ['major', 'Major Changes'],
  ['minor', 'Minor Changes'],
  ['patch', 'Patch Changes'],
];

/**
 * @typedef {{ commit?: string, paragraphs: string[], dependencies?: string[] }} ChangelogEntry
 * @typedef {{ type: string, heading: string, entries: ChangelogEntry[] }} ChangelogGroup
 * @typedef {{ version: string, groups: ChangelogGroup[] }} ChangelogVersion
 */

/**
 * @param {string} text A `CHANGELOG.md`.
 * @returns {{ name: string | undefined, versions: ChangelogVersion[] }}
 */
export function parseChangelog(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let name;
  const versions = [];
  let group;
  let entry;
  let paragraph = [];
  const flush = () => {
    if (entry && paragraph.length > 0) entry.paragraphs.push(paragraph.join(' '));
    paragraph = [];
  };
  for (const line of lines) {
    const heading = /^(#{1,3}) (.+)$/.exec(line);
    if (heading) {
      flush();
      entry = undefined;
      const [, hashes, title] = heading;
      if (hashes === '#') name = title.trim();
      else if (hashes === '##') {
        versions.push({ version: title.trim(), groups: [] });
        group = undefined;
      } else {
        const type = BUMP_HEADINGS.find(([, h]) => h === title.trim())?.[0] ?? 'other';
        group = { type, heading: title.trim(), entries: [] };
        versions.at(-1)?.groups.push(group);
      }
      continue;
    }
    const item = /^- (.*)$/.exec(line);
    if (item && group) {
      flush();
      const deps = /^Updated dependencies(?: \[([^\]]*)\])?\s*$/.exec(item[1]);
      if (deps) {
        // Changesets writes one such line per changeset, and lists the versions under the last
        // only: one entry per group, or the page shows empty lists.
        const shared = group.entries.find((e) => e.dependencies);
        if (shared) {
          entry = shared;
          continue;
        }
        entry = { paragraphs: [], dependencies: [] };
        if (deps[1]) entry.commit = deps[1].split(',')[0]?.trim();
      } else {
        const commit = /^([0-9a-f]{7,40}): (.*)$/.exec(item[1]);
        entry = { paragraphs: [], ...(commit ? { commit: commit[1] } : {}) };
        paragraph.push((commit ? commit[2] : item[1]).trim());
      }
      group.entries.push(entry);
      continue;
    }
    if (!entry) continue;
    const nested = /^ {2}- (.+)$/.exec(line);
    if (nested && entry.dependencies) {
      entry.dependencies.push(nested[1].trim());
    } else if (line.trim() === '') {
      flush();
    } else {
      paragraph.push(line.trim());
    }
  }
  flush();
  return { name, versions };
}

/**
 * The pending changesets for one package, grouped by bump, largest first.
 *
 * @param {string} name The package.
 * @param {string[]} texts The `.changeset/*.md` files (not the README).
 * @returns {ChangelogGroup[]}
 */
export function unreleased(name, texts) {
  const byType = new Map();
  for (const text of texts) {
    const normal = text.replace(/\r\n?/g, '\n');
    const front = /^---\n([\s\S]*?)\n---\n?/.exec(normal);
    if (!front) continue;
    const type = front[1]
      .split('\n')
      .map((l) => /^\s*['"]?([^'":]+)['"]?\s*:\s*(\w+)\s*$/.exec(l))
      .find((m) => m?.[1] === name)?.[2];
    if (!type || type === 'none') continue;
    const paragraphs = normal
      .slice(front[0].length)
      .trim()
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
      .filter(Boolean);
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type).push({ paragraphs });
  }
  return BUMP_HEADINGS.filter(([type]) => byType.has(type)).map(([type, heading]) => ({
    type,
    heading,
    entries: byType.get(type),
  }));
}

/** Whether a version is a major release with something to migrate: `2.0.0`, not `1.0.0`. */
export function migratesTo(version) {
  const m = /^(\d+)\.0\.0$/.exec(version);
  return m !== null && Number(m[1]) >= 2 ? Number(m[1]) : undefined;
}
