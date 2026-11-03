# Implementation checkpoint

Single source of truth for **where the implementation is right now**. Overwritten by the
`implement-module` skill at the end of every run. For history, see `log.md`; for status, see
`docs/PROGRESS.md`.

| Field         | Value                                                                        |
| ------------- | ---------------------------------------------------------------------------- |
| Target app    | repo root (pnpm workspace: `packages/tokens`, `packages/react`, `apps/docs`) |
| Active module | L11 (Motion), in progress                                                    |
| Sub-step      | PR 1 of 2 built and reviewed (`feat/L11-motion-core`), awaiting Emil         |
| Last verified | 2026-11-03: `pnpm check`, `pnpm test`, the Chromium gate                     |
| Updated       | 2026-11-03                                                                   |

## Brief

L00–L10 are done. On npm: `@senakster/senui-tokens` 1.0.0 and `@senakster/senui` 1.0.1, each
tagged. The docs site at `https://senakster.github.io/senui/` reads released, 1.0.1.

L11 (plan `.catalogue/library_catalogue/L11-motion.md`, ADR-0024). Emil: Claude writes the
component files, Emil reviews; two PRs.

- **PR 1** (built, reviewed, triaged): the ADR, the rotation token, `'instant'`, Switch and Button,
  2.3.3 rows, Stylelint, `packages/react/scripts/motion.mjs` with the contract cross-check, the
  gate's motion check, re-pinned exceptions, CONVENTIONS section 13, two changesets.
- **PR 2** (next): the dialog exit fallback from `getComputedTiming().endTime ÷ |playbackRate|` of
  the dialog's and backdrop's animations plus a margin (`internal/dialog/useModalDialog.ts`,
  `EXIT_TIMEOUT_MS`); browser tests for Switch (thumb jumps and reaches its end, colour still
  transitions; read the computed position, a 0 s transition fires no events), Button (960 ms and
  3840 ms by seeking) and Dialog (2 s and backdrop-only overrides stay open until the exit ends; no
  exit closes at once), each under reduce and with the factor at 0 without the media query; the
  Motion docs page (generated per-component table, consumer example story, docs-page gate); re-pin
  Dialog's and AlertDialog's exceptions again.

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

1. Emil: review PR 1 (`feat/L11-motion-core`); commit and open the pull request on his OK.
2. After it merges: PR 2 from a new branch off `main` (see Brief).
