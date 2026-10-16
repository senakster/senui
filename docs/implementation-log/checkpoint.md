# Implementation checkpoint

Single source of truth for **where the implementation is right now**. Overwritten by the
`implement-module` skill at the end of every run. For history, see `log.md`; for status, see
`docs/PROGRESS.md`.

| Field         | Value                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------- |
| Target app    | repo root (pnpm workspace: `packages/tokens`, `packages/react`, `apps/docs`)             |
| Active module | L03 — Button (next; not started). Pair mode: Emil writes the component                   |
| Sub-step      | L02 done and reviewed; waiting on Emil's review, a commit and a PR (CI)                  |
| Last verified | 2026-10-16: `pnpm check`, `pnpm test` (tokens 31, react 44), build-storybook, L02 probes |
| Updated       | 2026-10-16                                                                               |

## In-flight notes

- Branch `feature/Token-pipeline-L001`. L01 is committed (`44705d2`) and pushed, with no PR, so
  neither L01 nor L02 has been through CI. Opening a PR runs it.
- L02 is uncommitted: ADRs 0006–0009, `CONVENTIONS.md`, `src/internal/**`, `src/types.ts`, the
  styles entry, `stylelint.config.mjs`, three `scripts/check-*.mjs`, and config changes. Emil
  reviews the drafts (his call: "Claude drafts, I review"); anything he changes materially that an
  agent proposed becomes an `OVERRIDES.md` row.
- One reviewer suggestion was not applied: typing out positive `tabIndex` values. It wasn't part of
  the accepted triage option. Logged as out in scope-decisions § L02; raise it with Emil if he wants it.
- publint warns that `./styles/*.css` matches no files. That's expected until Button's CSS exists,
  and it doesn't fail the build.
- The `react@19.3.1` exclusion in `pnpm-workspace.yaml` can go once that release has aged past
  pnpm's minimum release age (published 2026-10-14).

## Next action

Emil reviews the L02 drafts, commits, and opens a PR for CI. Then `/modular-web:implement-module`
starts L03: Emil writes Button against `CONVENTIONS.md`; agents review it (scope-decisions § L02,
cross-module notes, lists what Button is the first user of).
