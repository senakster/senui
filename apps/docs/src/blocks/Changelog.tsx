/// <reference types="vite/client" />
import type { ReactNode } from 'react';
import { sanitize } from 'storybook/internal/csf';
import { Inline } from './Inline';
import { siteHref } from './manifest';
import {
  migratesTo,
  parseChangelog,
  unreleased,
  type ChangelogEntry,
  type ChangelogGroup,
} from '../../../../packages/react/scripts/docs/changelog.mjs';

// L10 decision 8: each package's changelog, as Changesets writes it at release, and what is pending.
// Read at build time: the site is built from `main`, so it shows the released versions and, as
// Unreleased, the changesets not yet released. A package with no release yet has no CHANGELOG.md.
const CHANGELOGS = import.meta.glob<string>('../../../../packages/*/CHANGELOG.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const CHANGESETS = Object.entries(
  import.meta.glob<string>('../../../../.changeset/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
)
  .filter(([path]) => !path.endsWith('/README.md'))
  .map(([, text]) => text);
// A major's migration note is its own docs page, `migrations/<short name>-<major>.mdx`, titled
// `Changelog/Migrating to <short name> <major>.0.0` (checked by check-changesets.mjs). Only the
// file names are needed: read raw, so the MDX isn't compiled a second time.
const MIGRATIONS = new Set(
  Object.keys(
    import.meta.glob('../changelog/migrations/*.mdx', {
      query: '?raw',
      import: 'default',
      eager: true,
    }),
  ).map((path) => path.slice(path.lastIndexOf('/') + 1, -'.mdx'.length)),
);

const text = (value: string) => <Inline text={value} href={siteHref} />;

/** The package name without its scope: `@senakster/senui-tokens` → `senui-tokens`. */
const shortName = (name: string) => name.slice(name.indexOf('/') + 1);

/** A docs page's path, from its title, with Storybook's own id rules. */
const docsPath = (title: string) => `?path=/docs/${sanitize(title)}--docs`;

/**
 * A heading and what follows. Not a named region: one landmark per release would bury the page's
 * own landmarks as the changelog grows; the `<h2>`s are the way through it.
 */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Entry({ entry }: { entry: ChangelogEntry }) {
  if (entry.dependencies) {
    return (
      <li>
        <p>Updated dependencies:</p>
        <ul>
          {entry.dependencies.map((dep) => (
            <li key={dep}>
              <code>{dep}</code>
            </li>
          ))}
        </ul>
      </li>
    );
  }
  return (
    <li>
      {entry.paragraphs.map((paragraph, i) => (
        // Paragraphs of one entry have no identity of their own; their order is fixed.
        <p key={i}>
          {text(paragraph)}
          {/* After the words, not before: a reader spells a hash out character by character. */}
          {i === 0 && entry.commit ? (
            <>
              {' '}
              (commit <code>{entry.commit}</code>)
            </>
          ) : null}
        </p>
      ))}
    </li>
  );
}

/**
 * Each bump type's entries. Every release repeats "Patch Changes", so each `<h3>` also says, to a
 * screen reader's list of headings, which release it belongs to; the visible text stays the same.
 */
function Groups({ groups, release }: { groups: readonly ChangelogGroup[]; release: string }) {
  return groups.map((group) => (
    <div key={group.heading}>
      <h3>
        {group.heading}
        <span className="docs-visually-hidden"> in {release}</span>
      </h3>
      <ul className="docs-changelog__entries">
        {group.entries.map((entry, i) => (
          // Entries are in release order and never reorder.
          <Entry key={i} entry={entry} />
        ))}
      </ul>
    </div>
  ));
}

/**
 * One package's changelog page: its own `<h1>` ("`<package>` changelog"; Changesets' `# <package>`
 * heading is dropped), Unreleased first with a designed empty state, then each version as an `<h2>`
 * with its bump types as `<h3>`s. A major after the first links its migration note.
 */
export function Changelog({ name }: { name: string }) {
  const released = Object.values(CHANGELOGS)
    .map(parseChangelog)
    .find((log) => log.name === name);
  const pending = unreleased(name, CHANGESETS);
  const short = shortName(name);
  return (
    // The project's docs styles, as on a component page, not Storybook's MDX theme.
    <div className="docs-page sb-unstyled docs-changelog">
      <h1>
        <code>{name}</code> changelog
      </h1>
      <p>
        Every release of <code>{name}</code>, newest first, as published to npm. Breaking changes
        come only in a major version, after a minor that deprecates what they remove.
      </p>
      <Section title="Unreleased">
        {pending.length > 0 ? (
          <Groups groups={pending} release="Unreleased" />
        ) : (
          <p className="docs-changelog__empty">Nothing unreleased.</p>
        )}
      </Section>
      {released && released.versions.length > 0 ? (
        released.versions.map((version) => {
          const major = migratesTo(version.version);
          const migration = major !== undefined && MIGRATIONS.has(`${short}-${String(major)}`);
          return (
            <Section key={version.version} title={version.version}>
              {migration ? (
                <p>
                  {text(
                    `[Migration guide for \`${name}\` ${version.version}](${docsPath(`Changelog/Migrating to ${short} ${version.version}`)})`,
                  )}
                </p>
              ) : null}
              <Groups groups={version.groups} release={version.version} />
            </Section>
          );
        })
      ) : (
        <Section title="Released">
          <p className="docs-changelog__empty">No release yet.</p>
        </Section>
      )}
    </div>
  );
}
