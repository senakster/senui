// Types for changelog.mjs, so the Storybook docs blocks (apps/docs/src/blocks) can render it.

export interface ChangelogEntry {
  /** The commit Changesets recorded, when it had one. */
  commit?: string;
  /** Inline Markdown: plain text, inline code and links. */
  paragraphs: string[];
  /** `package@version`, for an "Updated dependencies" entry. */
  dependencies?: string[];
}

export interface ChangelogGroup {
  /** `major`, `minor`, `patch`, or `other` for a heading Changesets doesn't write. */
  type: string;
  heading: string;
  entries: ChangelogEntry[];
}

export interface ChangelogVersion {
  version: string;
  groups: ChangelogGroup[];
}

export const BUMP_HEADINGS: readonly (readonly [string, string])[];
export function parseChangelog(text: string): {
  name: string | undefined;
  versions: ChangelogVersion[];
};
export function unreleased(name: string, texts: readonly string[]): ChangelogGroup[];
export function migratesTo(version: string): number | undefined;
