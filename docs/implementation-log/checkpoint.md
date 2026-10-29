# Implementation checkpoint

Single source of truth for **where the implementation is right now**. Overwritten by the
`implement-module` skill at the end of every run. For history, see `log.md`; for status, see
`docs/PROGRESS.md`.

| Field         | Value                                                                         |
| ------------- | ----------------------------------------------------------------------------- |
| Target app    | repo root (pnpm workspace: `packages/tokens`, `packages/react`, `apps/docs`)  |
| Active module | L10 (Release, versioning & deprecation), `in-progress`                        |
| Sub-step      | PR 1 of 5 (package and build) open                                            |
| Last verified | 2026-10-29: `pnpm check`; `pnpm test` tokens 32, react 952; `build-storybook` |
| Updated       | 2026-10-29                                                                    |

## Brief

L00–L09 are done. The docs site is live at `https://senakster.github.io/senui/` and deploys on
each push to `main`. L10 is delivered in five PRs (Emil):

1. Package and build: `unbundle`, tree-shaking and pack checks, tokens as a peer (this PR).
2. API diff check, deprecation data, and the guard that a tokens major forces a components major.
3. `sourceHash`: ADR amending L02, `a11y:stamp`, backfill into the nine contracts (each listed in
   scope-decisions).
4. Changesets job, changeset text check, changelog and migration pages.
5. Release pipeline (`release.yml`, reusable `gate-full`), the `npm` environment and every
   repository setting (with Emil's OK), the 1.0.0 changesets, then Emil's manual first publish.

## In-flight notes

- **Budget (Emil, 2026-10-28):** "Gate (all engines)" is disabled on GitHub. Firefox, WebKit and
  React 18.3 are checked locally; don't trigger costly CI runs. The failing-gate probe runs
  locally, plus a stubbed fast gate job in CI.
- **No manual a11y re-runs before 1.0.0** (Emil).
- **Changesets:** a tokens major bumps the components package only a patch. PR 2's guard.
- **Ruleset:** live since 2026-10-26 and matches `.github/rulesets/main.json`. The repo-level
  squash-only and delete-merged-branches settings are still off: PR 5.
- Exceptions: Dialog Fullscreen and LongContent, `color-contrast:incomplete`, expire 2027-04-27.
- Open for TextInput (deferred): the Home/End contract row isn't true on macOS.
- No npm login on this machine yet (needed for the manual 1.0.0 publish).
- Untested readers: JAWS, VoiceOver and TalkBack.
- The planner repo's L10 changes are uncommitted there; Emil commits them.

## Next action

1. Merge PR 1.
2. PR 2: API diff check, deprecation data, tokens-major guard.
