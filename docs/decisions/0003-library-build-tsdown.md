# 0003 — Library build tool: tsdown

- **Status:** Accepted
- **Date:** 2026-10-15
- **Deciders:** senakster (solo call, no review required)
- **Affects modules:** L00, L01, L03, L10

## Context

L00 leaves the build tool as an open question: tsup or Vite library mode, with tsup recommended
because the library has no app-level bundling needs. The build has a small job. Each package emits
ESM plus `.d.ts`, CSS is copied as an asset rather than bundled into JS, and nothing else.

Since that plan was written, tsup's own README has said the project is no longer actively
maintained, and it points users to tsdown. A dependency that every publish runs through should
not start out unmaintained.

## Decision

Both packages are built with **tsdown**.

- Output is ESM only, with `.d.ts` emitted alongside.
- CSS is not imported from JS. Stylesheets are copied into `dist/` and exposed through `exports`,
  so consumers decide how to load them (ADR-0001).
- tsdown's `publint` check runs in the build, so a broken `exports` map fails locally instead of on
  npm.

**Rejected:**

- **tsup.** It's the plan's default and it's stable, but its maintainers have stepped back from
  it. Bugs in it, or a TypeScript major it can't handle, would have no upstream fix.
- **Vite library mode.** Storybook and Vitest already bring in Vite, so there's no new dependency.
  But `.d.ts` emission needs a separate plugin, and library mode is built around bundling apps. It
  would be more configuration for the same output.

## Consequences

- tsdown is pre-1.0 (0.23 at adoption), so minor versions can break config. The version is pinned
  exactly and upgraded on purpose.
- It runs on Rolldown, which is a different bundler from the Vite instance Storybook uses. I
  accept two bundlers because neither one's output reaches the other.
- tsup's migration guide maps its config almost one to one, so moving back would be cheap.
- **Revisit when:** tsdown stalls or breaks a release, CSS needs real processing in the build
  rather than copying, or the library starts shipping a format other than ESM.
