# Implementation checkpoint

Single source of truth for **where the implementation is right now**. Overwritten by the
`implement-module` skill at the end of every run. For history, see `log.md`; for status, see
`docs/PROGRESS.md`.

| Field         | Value                                                                           |
| ------------- | ------------------------------------------------------------------------------- |
| Target app    | repo root (pnpm workspace: `packages/tokens`, `packages/react`, `apps/docs`)    |
| Active module | L08 — Test & a11y gate (next; not planned upstream). L07 done 2026-10-27        |
| Sub-step      | L07 done, uncommitted on `feature/empty-state-L07`                              |
| Last verified | 2026-10-27: `pnpm check`; `pnpm test` tokens 32, react 648/648; build-storybook |
| Updated       | 2026-10-27                                                                      |

## Brief

L07 (EmptyState) is done and uncommitted on `feature/empty-state-L07`, branched from `origin/main`
(`f9d66ca`). Some of its files were staged outside this session; check `git status` before
committing.

**What the commit holds:**

- `packages/react/src/components/EmptyState/` (component, CSS, contract, unit, type and browser
  tests, 14 stories); entry export and CSS import; `.changeset/add-empty-state.md`
- tokens `size.illustration.sm/lg`
- ADR-0016 and its check in `scripts/check-component-css.mjs`; CLAUDE.md row
- L02 tooling: `semantics.name: 'none'` in `A11yContract` and the contract check;
  `internal/dom/focusable.ts` (`firstFocusable`, moved from `internal/dialog/`)
- docs: PROGRESS, log, scope-decisions, this checkpoint

**L08** has no plan upstream yet (`not-planned` in PROGRESS). Starting it needs a plan from the
planner, then a re-sync (implement-module, "Re-syncing a library project"). Its inputs are already
recorded as cross-module notes: the `forcedColors` story parameter (L03, L07), the Vitest browser
commands (L06), the cross-engine switch, the focus-ring reset spec (L02), and the 414 px default
viewport (L07).

## In-flight notes

- **Storybook on GitHub Pages (Emil, 2026-10-26): comes with L09**, not before. On a push to `main`, the CI `verify` job uploads the Storybook it already builds as a Pages artifact, and a `deploy-storybook` job (`needs: verify`) publishes it. Site: `https://senakster.github.io/senui/`. Claude enables Pages with `gh api -X POST repos/senakster/senui/pages -f build_type=workflow` once the workflow is merged (Emil's OK, 2026-10-26).
- **npm publishing (Emil, 2026-10-26): keep the module order.** Publish only after L07 to L10; L10 sets up the pipeline first. Gaps: no npm login on this machine, no LICENSE in the packages (`files: ["dist"]`), no `repository`/`homepage`/`bugs`; five pending changesets, all minor.
- **L09:** the docs generator must handle `semantics.name: 'none'` (new in L07).
- **Planner feedback from L07:** a story with a play function can't host a manual run (Storybook runs it on open, and the reader announces "Component test …"); a 300 ms status debounce reads every letter to a screen-reader user typing with key echo.
- Cross-browser: `SENUI_BROWSERS=chromium,firefox,webkit`. CI stays Chromium-only until L08. EmptyState's browser tests have run in Chromium only.
- `check-a11y-contracts` warns about every earlier component after the rename merge: only import paths and package names changed.
- Untested readers: JAWS, VoiceOver and TalkBack.
- `react@19.3.1` exclusion in `pnpm-workspace.yaml` can go once that release has aged.
- Still open from L03: hover/active stories (pseudo-states addon); the squash-only repository setting.

## Next action

Commit L07 on `feature/empty-state-L07` and open a PR when Emil asks. Then L08, once its plan
exists upstream.
