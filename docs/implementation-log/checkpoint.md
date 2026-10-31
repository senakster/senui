# Implementation checkpoint

Single source of truth for **where the implementation is right now**. Overwritten by the
`implement-module` skill at the end of every run. For history, see `log.md`; for status, see
`docs/PROGRESS.md`.

| Field         | Value                                                                        |
| ------------- | ---------------------------------------------------------------------------- |
| Target app    | repo root (pnpm workspace: `packages/tokens`, `packages/react`, `apps/docs`) |
| Active module | none: L10 done; L11 (Motion) is not planned                                  |
| Sub-step      | —                                                                            |
| Last verified | 2026-10-31: release run 41185796538 (1.0.1); `node --test scripts/` 58       |
| Updated       | 2026-10-31                                                                   |

## Brief

L00–L10 are done. On npm: `@senakster/senui-tokens` 1.0.0 and `@senakster/senui` 1.0.1, each
tagged. The docs site at `https://senakster.github.io/senui/` reads released, 1.0.1.

Releases run from `main` through `release.yml` (CONTRIBUTING.md, "Releasing"): merged changesets
open the Version packages pull request; merging it runs the full gate, then `publish` (trusted
publishing, provenance, Emil approves the `npm` environment), then `tag-and-deploy`.

## In-flight notes

- **The Version packages pull request's checks wait for Emil:** Actions opened it, so approve its
  workflows ("workflows awaiting approval") before it can merge.
- **Tags are created through the API.** It has not yet met a workflow change between a version
  commit and its run. If GitHub refuses, the job prints the manual commands; then
  `gh run rerun <id> --failed`.
- **The full gate runs only at release (ADR-0023)** and takes about an hour. CI keeps 4 workers
  (Emil); slow tests get their own time allowance instead.
- **npm lists `0.0.0-stage`** for both packages, untagged, with no dist-tag. Emil: leave it.
- **Eight `stale-run` exceptions** expire 2027-04-28; re-run those components by hand before then
  (`pnpm a11y:stamp <Name>` the same day).
- **Semantic tokens have no deprecation mark** (`OVERRIDES.md`): the first removal of one needs an
  `api-exceptions.json` entry, or the L01 pipeline gains DTCG `$deprecated`.
- Exceptions: Dialog Fullscreen and LongContent, `color-contrast:incomplete`, expire 2027-04-27.
- Open for TextInput (deferred): the Home/End contract row isn't true on macOS.
- Untested readers: JAWS, VoiceOver and TalkBack.
- Branches of pull requests merged before PR 5's settings still exist on GitHub.

## Next action

1. Emil: commit the L10 field report in the planner repo
   (`docs/field-reports/2026-10-31-library-l10-senui.md`).
2. Plan L11 (Motion) in the planner with Emil, review it, sync it, then `/modular-web:implement-module`.
