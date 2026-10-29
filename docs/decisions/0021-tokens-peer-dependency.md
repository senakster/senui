# 0021 — The tokens package is a peer dependency, and its majors are components majors

- **Status:** Accepted
- **Date:** 2026-10-29
- **Deciders:** senakster (Emil's call while planning L10, 2026-10-28; no review required)
- **Affects modules:** L01, L09, L10

## Context

Consumers load the tokens themselves (`@import '@senakster/senui-tokens/tokens.css'`), and the
components' stylesheets read those custom properties. There must be exactly one copy of the tokens
in an app, at a version the components were built against.

As a regular dependency, the tokens package could be installed twice (the app's own copy and the
components' copy), and the app's `tokens.css` would be whichever copy it imported. Changesets also
treats a regular internal dependency's major as a patch for its dependent
(`updateInternalDependencies: "patch"`), so a tokens major would reach consumers as a components
patch: v1 CSS under v2 components, failing silently on missing custom properties.

L10 PR 1 probed the peer case with both packages at `1.0.0`: a tokens minor leaves the components
package alone, but a tokens **major** still bumps it only a **patch** (`1.0.1`), rewriting its peer
range to `^2`. A peer range that drops the old major is a breaking change for consumers, and
Changesets doesn't treat it as one.

## Decision

- **`@senakster/senui-tokens` is a peer dependency** of `@senakster/senui` (`workspace:^`, packed as
  `^<tokens version>`), and a dev dependency in the workspace. The install line names both.
- **The manifest's tokens range is the peer range** (`tokens.versionRange` in `components.json`);
  the docs build fails without the peer entry.
- **Majors travel together:** a pending tokens major requires a pending components major, checked
  by `scripts/check-api-diff.mjs` (`peerMajorProblems`), since Changesets alone would make it a
  patch. The components changeset says what the tokens major changes for it.
- `scripts/check-pack.mjs` checks the packed peer range is `^<tokens version>` and that the tokens
  aren't also a regular dependency.

## Consequences

- Consumers install two packages, and a package manager that doesn't install peers automatically
  warns until they do. The README says why.
- A tokens major is always a components major, even when no component reads the changed tokens.
  That costs a major in the rare case it wasn't needed, and never ships a silent break.
- Not using Changesets' `linked` or `fixed` groups: those would also tie minors and patches
  together, and the packages version independently (L10 decision 2).
- **Revisit when:** Changesets bumps a peer dependent's major on a peer major by itself (then the
  guard can go), the components stop reading the tokens at runtime (the peer could become
  optional), or the two packages merge into one.
