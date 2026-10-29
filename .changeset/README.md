# Changesets

A pull request that changes what a package ships (`@senakster/senui-tokens`, `@senakster/senui`) adds a
changeset: run `pnpm changeset`, pick the bump, and describe the change for someone using the
package. "What a package ships" is its source under `packages/*/src` (not its tests or stories) and
its `exports`; the `changesets` check fails a pull request that changes either without one. If
nothing a consumer gets changes, label the pull request `no-release` instead.

**The bump.** Removing or renaming a prop, export, class or public token is a major, and it must be
preceded by a minor that deprecates it (library principle 7). Anything new is a minor. The API diff
(`pnpm check:api`) fails a bump smaller than the change, and a tokens major needs a components major
(ADR-0021).

**The text** is published as written, in `CHANGELOG.md` on npm and on the docs site's changelog
pages, so it follows the rules for published text (`scripts/check-changesets.mjs` checks them):

- paragraphs only, with inline code: no headings, lists, quotes, code blocks or links;
- no private references (module numbers, scope decisions, reviews) and no names;
- say what changes for the reader, and what to do about it. A deprecation says what replaces what.

**A major** after 1.0.0 gets a migration note as its own docs page,
`apps/docs/src/changelog/migrations/<package>-<major>.mdx` (`senui-2.mdx`), titled
`Changelog/Migrating to <package> <major>.0.0`. The changelog links it from that version's entry, so
the changeset itself stays link-free.
