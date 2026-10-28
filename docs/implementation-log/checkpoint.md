# Implementation checkpoint

Single source of truth for **where the implementation is right now**. Overwritten by the
`implement-module` skill at the end of every run. For history, see `log.md`; for status, see
`docs/PROGRESS.md`.

| Field         | Value                                                                        |
| ------------- | ---------------------------------------------------------------------------- |
| Target app    | repo root (pnpm workspace: `packages/tokens`, `packages/react`, `apps/docs`) |
| Active module | none. L09 done; L10 (Release, versioning & deprecation) is `not-planned`     |
| Sub-step      | —                                                                            |
| Last verified | 2026-10-28: `pnpm check`; `pnpm test` tokens 32, react 952; CI on `main`     |
| Updated       | 2026-10-28                                                                   |

## Brief

L00–L09 are done. The docs site is live at `https://senakster.github.io/senui/` and deploys on
each push to `main`. Its builds are stamped unreleased (`0.0.0-main.<sha>`).

## In-flight notes

- **Budget (Emil, 2026-10-28):** "Gate (all engines)" is disabled on GitHub. Firefox, WebKit and
  React 18.3 are checked locally until further notice; don't trigger costly CI runs.
- **Stale manual runs:** `check:components` warns that all nine components changed after their
  last manual a11y run, from L09's JSDoc and contract text edits. Turning it into a release error
  is L10's. Whether to re-run the readers first is Emil's call.
- Exceptions: Dialog Fullscreen and LongContent, `color-contrast:incomplete`, expire 2027-04-27.
- Open for TextInput (deferred): the Home/End contract row isn't true on macOS.
- npm publishing comes after L10. Gaps: no npm login on this machine, no LICENSE in the packages,
  no `bugs`.
- Untested readers: JAWS, VoiceOver and TalkBack.
- L10 inherits from L09: the API diff check (needs a published baseline).

## Next action

1. Write the L10 plan in the planner with Emil, then sync it here.
2. Then `/modular-web:implement-module` for L10.
