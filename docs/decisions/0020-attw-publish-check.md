# 0020 — Published types are checked with attw

- **Status:** Accepted
- **Date:** 2026-10-28
- **Deciders:** senakster (Emil's call while planning L10; no review required)
- **Affects modules:** L00, L10

## Context

Before L10, `publint` was the only check on what the packages publish. It runs in every tsdown
build and catches a malformed `exports` map or an entry whose file doesn't exist. It doesn't
resolve types as a consumer's TypeScript does, so a build that ships JavaScript without its
`.d.ts`, or declarations that `node16` resolution can't reach, passes it.

Principle 2 asks for an ADR for every new dependency, naming the alternative it beat. The
alternatives:

- **`publint` alone:** kept, but it can't see type resolution.
- **A hand-written check:** a `tsc` program per resolution mode that imports every entry. That
  means reimplementing what attw already does, including wildcard subpaths and the difference
  between `node16` and `bundler` resolution.

## Decision

- **`@arethetypeswrong/cli` 0.18.5**, pinned exactly, as a root dev dependency.
- **It runs in `scripts/check-pack.mjs`** on the tarballs `pnpm pack` produces, which are the bytes
  a release publishes, not the working tree.
- **Profile `esm-only`:** `node16` (from ESM) and `bundler` must resolve every code entry. `node10`
  and `node16` from CommonJS are out by design: both packages are ESM-only (ADR-0003).
- **Asset subpaths are excluded by name:** `styles.css`, `llms.txt`, `llms-full.txt` and
  `USAGE.md` in the components package, and `tokens.css` in the tokens package. They are files to
  load, never modules TypeScript imports, so attw reports them as unresolvable. Wildcard subpaths
  (`styles/*.css`, `docs/*.md`) aren't analysed by attw.
- **`publint` stays** in the build.

## Consequences

- **Probed:** removing `dist/index.d.ts` from the components tarball fails with "No types" for
  `node16` and `bundler`.
- **Maintenance:** a new asset subpath in `exports` must be added to the check's exclusions, or the
  check fails on it. That's deliberate: a new subpath is public surface and should be looked at.
- **Cost:** one pack and one attw run per package, in `pnpm check`.
- **Revisit when:** `publint` gains type resolution, attw goes unmaintained or stops supporting the
  installed TypeScript major, or a package ships CommonJS (ADR-0003 reopened).
