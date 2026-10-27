# Implementation checkpoint

Single source of truth for **where the implementation is right now**. Overwritten by the
`implement-module` skill at the end of every run. For history, see `log.md`; for status, see
`docs/PROGRESS.md`.

| Field         | Value                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------- |
| Target app    | repo root (pnpm workspace: `packages/tokens`, `packages/react`, `apps/docs`)                    |
| Active module | L08 — Test & a11y gate (in progress)                                                            |
| Sub-step      | PRs 1–3 merged (#8, #9, #10); PR 4 built and verified, uncommitted on `feature/a11y-gate-L08-4` |
| Last verified | 2026-10-27: `pnpm check`; `pnpm test` tokens 32, react 886 (also on React 18.3); gate 1378      |
| Updated       | 2026-10-27                                                                                      |

## Brief

L08 builds the a11y gate: Playwright over the built Storybook, styled by the package's built CSS,
checking every story against its component's contract. Plan: `.catalogue/library_catalogue/L08-test-and-a11y-gate.md`
(synced 2026-10-27). Scope and every deviation: scope-decisions § L08. Harness work: Claude builds,
Emil reviews; Claude may edit component folders where the gate needs it, listing each edit, and a
public-API change goes to Emil first.

**Four PRs (Emil):**

1. **Merged (#8):** harness, CSS marker, render wait, axe light/dark, semantics, exceptions, CI step, `pnpm test:gate`.
2. **Merged (#9):** contract-derived checks, ADR-0017, ADR-0018.
3. **Merged (#10):** forced colours, the pinned container, `gate-full.yml`, `update-snapshots.yml`. On `main`, CI passed; the first three-engine gate failed 5 of 3,918 (fixed in PR 4).
4. **Built, uncommitted:** `check-keyboard-trace.mjs` (22 keys traced), the Vitest `ssr` project and hydration test (run-id manifest), the `react-18` job in `gate-full.yml` with in-test version asserts, the `useControllableState` fix (recorded under L02), the three-engine fixes, CONVENTIONS. Review: 18/18 accepted. Detail: scope-decisions § L08, "PR 4".

## In-flight notes

- Gate facts: 113 stories; 1378 passed, 122 skipped in Chromium locally (~8 min). PR 3's CI run took 9 min 35 s.
- `main`'s three-engine run takes ~45 min. The `react-18` job runs alongside it and has never run in CI yet.
- Exceptions: Dialog Fullscreen and LongContent, `color-contrast:incomplete`, expire 2027-04-27.
- Open for L04/TextInput (Emil deferred it): the Home/End contract row isn't true on macOS (scope-decisions § L04, cross-module notes).
- **Storybook on GitHub Pages (Emil, 2026-10-26): comes with L09.** On a push to `main`, the CI `verify` job uploads the Storybook it builds as a Pages artifact, and a `deploy-storybook` job (`needs: verify`) publishes it to `https://senakster.github.io/senui/`. Claude enables Pages with `gh api -X POST repos/senakster/senui/pages -f build_type=workflow` once merged (Emil's OK).
- **npm publishing (Emil, 2026-10-26):** after L07 to L10; L10 builds the pipeline first. Gaps: no npm login on this machine, no LICENSE in the packages, no `repository`/`homepage`/`bugs`.
- **L09:** the docs generator must handle `semantics.name: 'none'`; it can reuse `gate/stories.ts`'s story-to-contract mapping.
- Untested readers: JAWS, VoiceOver and TalkBack. `react@19.3.1` exclusion in `pnpm-workspace.yaml` can go once that release has aged. Still open from L03: hover/active stories; the squash-only repository setting.

## Next action

With Emil's OK:

1. Commit PR 4 on `feature/a11y-gate-L08-4` and open it.
2. After merge, watch `main`'s "Gate (all engines)" run: three engines plus the first CI run of `react-18`.
3. When it is green: record the PR gate job's duration as its budget (acceptance criterion), tick L08's criteria, and mark L08 done in PROGRESS.
