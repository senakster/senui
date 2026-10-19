# Implementation checkpoint

Single source of truth for **where the implementation is right now**. Overwritten by the
`implement-module` skill at the end of every run. For history, see `log.md`; for status, see
`docs/PROGRESS.md`.

| Field         | Value                                                                             |
| ------------- | --------------------------------------------------------------------------------- |
| Target app    | repo root (pnpm workspace: `packages/tokens`, `packages/react`, `apps/docs`)      |
| Active module | L05 — Checkbox / Switch (next; no plan yet). L04 done 2026-10-19                  |
| Sub-step      | L04 done and uncommitted; waiting on a commit, PR and merge                       |
| Last verified | 2026-10-19: `pnpm check`; `pnpm test` (tokens 32, react 265/265); build-storybook |
| Updated       | 2026-10-19                                                                        |

## What is uncommitted

Everything since PR #2. The work is on `feature/button-review-L03`, which is already merged, so it
needs a new branch:

- L04: `components/FormField/`, `components/TextInput/`, `internal/testing/stories.ts`, the entry
  exports and CSS imports, `useNameCheck`, and the changeset `add-formfield-textinput.md`.
- An L03 defect fix: Button stories now pass their args through, and a test checks every story with
  controls (scope-decisions § L03, "Defects found later").
- ADR-0011 and its index row, CLAUDE.md's locked-decisions row, and the CONVENTIONS changes (rules
  3, 5 and 11, and the stories rule).
- `vitest.config.ts`: the `SENUI_BROWSERS` switch (scope-decisions § L00).
- Implementation log, PROGRESS and scope decisions.

## In-flight notes

- **L05 has no plan** (`not-planned` in PROGRESS). Already decided for it: Checkbox and Switch take
  `field?: FormFieldBinding` and call `useFormFieldControl` (ADR-0011). Checkbox passes native
  `checked` / `onChange` through (CONVENTIONS rule 5, L04 deviation 7); Switch decides when it gets
  there.
- Cross-browser runs: `SENUI_BROWSERS=chromium,firefox,webkit` with the browser project. Firefox and
  WebKit are installed on this machine; CI stays Chromium-only until L08 decides the gate's engines.
- The `react@19.3.1` exclusion in `pnpm-workspace.yaml` can go once that release has aged past
  pnpm's minimum release age (published 2026-10-14).
- Still open from L03: hover/active stories (pseudo-states addon, needs an ADR); the squash-only
  repository setting (`.github/rulesets/README.md`).

## Next action

Commit on a new branch, open a PR, and squash-merge when `verify` is green. Then run
`/modular-web:implement-module`. L05 needs a plan before it can start: write or sync one upstream.
