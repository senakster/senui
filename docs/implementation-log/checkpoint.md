# Implementation checkpoint

Single source of truth for **where the implementation is right now**. Overwritten by the
`implement-module` skill at the end of every run. For history, see `log.md`; for status, see
`docs/PROGRESS.md`.

| Field         | Value                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------- |
| Target app    | repo root (pnpm workspace: `packages/tokens`, `packages/react`, `apps/docs`)                  |
| Active module | L08 — Test & a11y gate (in progress)                                                          |
| Sub-step      | PR 1 of 4 built and verified, uncommitted on `feature/a11y-gate-L08`                          |
| Last verified | 2026-10-27: `pnpm check`; `pnpm test` tokens 32, react 648; `pnpm test:gate` 351/351 Chromium |
| Updated       | 2026-10-27                                                                                    |

## Brief

L08 builds the a11y gate: Playwright over the built Storybook, styled by the package's built CSS,
checking every story against its component's contract. Plan: `.catalogue/library_catalogue/L08-test-and-a11y-gate.md`
(synced 2026-10-27). Scope and every deviation: scope-decisions § L08. Harness work: Claude builds,
Emil reviews; Claude may edit component folders where the gate needs it, listing each edit, and a
public-API change goes to Emil first.

**Four PRs (Emil):**

1. **Built, uncommitted:** harness, CSS marker, render wait, axe light/dark, semantics, exceptions, CI step, `pnpm test:gate`.
2. Target size, reflow at 320 px and text spacing, motion (recorded from first paint) with `adaptation.essentialMotion` and its ADR amending ADR-0008 (Button's spinner), RTL (Stylelint lists plus the runtime mirror check; Switch's `:dir(rtl)` thumb), tab walk (focus-not-obscured, AX names), ring measurement (3:1, clipping), resets (vendored normalize- and preflight-style fixtures; `:focus{outline:none}` and `all: unset` remove the ring). Fix the CONVENTIONS reset wording.
3. `forced-colors` tag migration (from the `forcedColors` parameter), Chromium screenshots light and dark, the pinned Playwright container for every gate job, `snapshotPathTemplate`, `gate-full.yml` (main and nightly, three engines), `update-snapshots.yml`. Probe whether the light and dark forced-colours baselines differ.
4. Vitest `ssr` project (Node markup fixtures) and hydration test, the React 18.3 job, `scripts/check-keyboard-trace.mjs` with key-titled browser tests for all 22 contract keys (new browser tests for Switch and CheckboxGroup).

**Invariants (run 2026-10-27):** runtime dependencies are `@senakster/senui-tokens` only; the
docs app's new dev dependencies are `@playwright/test` 1.64.0 and `@types/node` 24.9.2; no
`stylelint-disable` in component CSS; no physical CSS properties in component CSS (for PR 2's
rule); 22 contract keys, 0 key-titled tests (for PR 4).

## In-flight notes

- Gate facts: 113 stories (+ fixture stories later), 351 tests in Chromium; a full run takes ~2 min.
  Engines via `SENUI_GATE_BROWSERS`. Never adopt a running server (`reuseExistingServer: false`).
- Exceptions: Dialog Fullscreen and LongContent, `color-contrast:incomplete`, expire 2027-04-27.
- **Storybook on GitHub Pages (Emil, 2026-10-26): comes with L09.** On a push to `main`, the CI `verify` job uploads the Storybook it builds as a Pages artifact, and a `deploy-storybook` job (`needs: verify`) publishes it to `https://senakster.github.io/senui/`. Claude enables Pages with `gh api -X POST repos/senakster/senui/pages -f build_type=workflow` once merged (Emil's OK).
- **npm publishing (Emil, 2026-10-26):** after L07 to L10; L10 builds the pipeline first. Gaps: no npm login on this machine, no LICENSE in the packages, no `repository`/`homepage`/`bugs`.
- **L09:** the docs generator must handle `semantics.name: 'none'`; it can reuse `gate/stories.ts`'s story-to-contract mapping.
- Untested readers: JAWS, VoiceOver and TalkBack. `react@19.3.1` exclusion in `pnpm-workspace.yaml` can go once that release has aged. Still open from L03: hover/active stories; the squash-only repository setting.

## Next action

Commit PR 1 on `feature/a11y-gate-L08` and open it when Emil asks. Then PR 2.
