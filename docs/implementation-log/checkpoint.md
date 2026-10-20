# Implementation checkpoint

Single source of truth for **where the implementation is right now**. Overwritten by the
`implement-module` skill at the end of every run. For history, see `log.md`; for status, see
`docs/PROGRESS.md`.

| Field         | Value                                                                             |
| ------------- | --------------------------------------------------------------------------------- |
| Target app    | repo root (pnpm workspace: `packages/tokens`, `packages/react`, `apps/docs`)      |
| Active module | L06 — Dialog (next; plan-ready). L05 done 2026-10-20                              |
| Sub-step      | L05 committed on `feature/checkbox-switch-L05`; waiting on a PR and merge         |
| Last verified | 2026-10-20: `pnpm check`; `pnpm test` (tokens 32, react 415/415); build-storybook |
| Updated       | 2026-10-20                                                                        |

## State

- L05 is done and committed on `feature/checkbox-switch-L05` (not pushed). It also carries
  ADR-0012 and ADR-0013 and the TextInput change ADR-0013 implies.
- The planner repo has the L03–L05 lessons committed on `feedback/library-l03-l05` (not pushed): a
  field report, revised L02/L04/L05 plans, the wcag-auditor and component-api-reviewer agents, and
  implement-module rules 35–40. Once that reaches the plugin, `catalogue-status` here will report
  L02, L04 and L05 as `updated-upstream`: re-sync then (copy the plans and rewrite
  `.catalogue-sync.json`, as on 2026-10-19).

## In-flight notes

- L06 (Dialog) plan is synced. The planner's ADR-0015 (dialog scroll lock) was written with it;
  check it with `catalogue-decisions` before starting.
- Cross-browser: `SENUI_BROWSERS=chromium,firefox,webkit` with the browser project. Firefox and
  WebKit are installed on this machine; CI stays Chromium-only until L08.
- Untested readers: JAWS, VoiceOver and TalkBack (L05 contracts make no claims for them).
- `react@19.3.1` exclusion in `pnpm-workspace.yaml` can go once that release has aged.
- Still open from L03: hover/active stories (pseudo-states addon); the squash-only repository
  setting.

## Next action

Push `feature/checkbox-switch-L05` and open a PR (squash-merge when `verify` is green), and decide
on the planner branch. Then run `/modular-web:implement-module` to start L06 (Dialog).
