# Implementation checkpoint

Single source of truth for **where the implementation is right now**. Overwritten by the
`implement-module` skill at the end of every run. For history, see `log.md`; for status, see
`docs/PROGRESS.md`.

| Field         | Value                                                                             |
| ------------- | --------------------------------------------------------------------------------- |
| Target app    | repo root (pnpm workspace: `packages/tokens`, `packages/react`, `apps/docs`)      |
| Active module | L02 — Component API conventions (next; not started)                               |
| Sub-step      | L01 done and reviewed; waiting on a commit and a PR (CI)                          |
| Last verified | 2026-10-16: `pnpm check`, `pnpm test` (31), build-storybook, L01 invariants green |
| Updated       | 2026-10-16                                                                        |

## In-flight notes

- Branch `feature/Token-pipeline-L001`, pushed, with no PR. `ci.yml` only runs on PRs and on pushes
  to `main`, so L01 has not been through CI yet. Opening a PR runs it.
- Uncommitted: the review work (ADR-0005, pipeline and checker changes, the redrafted
  `src/senui-start.tokens.json`, docs, tests). The min-check fix is part of it, so commit it so it
  can't be lost again.
- L01 review decisions are all closed (Emil, 2026-10-16):
  1. Token names are accepted as the public API. Values are a generic starting point, to be tuned
     later; retuning a value is not a breaking change, but renaming a token is.
  2. The focus-ring pair against `bg.accent` is replaced by the mandatory ring offset
     (`OVERRIDES.md`, first row; ADR-0005).
  3. ADR-0004's line-count trigger is replaced by ADR-0005's trigger on the Style Dictionary
     workaround code (about 90 lines today; revisit at about 150).
- The `react@19.3.1` exclusion in `pnpm-workspace.yaml` can go once that release has aged past
  pnpm's minimum release age (published 2026-10-14).

## Next action

Emil commits L01 (fill the `OVERRIDES.md` commit column with that hash), and opens a PR to get it
through CI. Then run
`/modular-web:implement-module` to start L02.
