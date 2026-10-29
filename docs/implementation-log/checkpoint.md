# Implementation checkpoint

Single source of truth for **where the implementation is right now**. Overwritten by the
`implement-module` skill at the end of every run. For history, see `log.md`; for status, see
`docs/PROGRESS.md`.

| Field         | Value                                                                        |
| ------------- | ---------------------------------------------------------------------------- |
| Target app    | repo root (pnpm workspace: `packages/tokens`, `packages/react`, `apps/docs`) |
| Active module | L10 (Release, versioning & deprecation), `in-progress`                       |
| Sub-step      | PR 5 of 5 (release pipeline) open; settings await Emil; PRs 1 to 4 merged    |
| Last verified | 2026-10-29: `pnpm check`; `pnpm test` 32 + 955 + 56; a version-PR dry run    |
| Updated       | 2026-10-29                                                                   |

## Brief

L00–L09 are done. The docs site is live at `https://senakster.github.io/senui/` and deploys on
each push to `main`. L10 is delivered in five PRs (Emil):

1. Package and build: `unbundle`, tree-shaking and pack checks, tokens as a peer (#21, merged).
2. API diff check, deprecation data, and the guard that a tokens major forces a components major
   (#22, merged).
3. `sourceHash`: ADR-0022 amending L02, `a11y:stamp`, backfill into the nine contracts (#23,
   merged).
4. Changesets job, changeset text check, changelog and migration pages (#24, merged).
5. **Release pipeline:**
   - `release.yml` and the reusable `gate-full`;
   - `check-a11y-contracts.mjs --release`, and dispatching `ci.yml` and `changesets.yml` on the
     Version packages branch;
   - the `npm` environment and every repository setting, with Emil's OK: squash-only,
     delete-on-merge, Actions may open pull requests, the `no-release` label, and `changesets` as a
     required check;
   - the 1.0.0 changesets and a `stale-run` exception for each stale component;
   - then Emil's manual first publish, and deleting the API diff baseline.

## In-flight notes

- **Budget (Emil, 2026-10-28):** "Gate (all engines)" is disabled on GitHub. Firefox, WebKit and
  React 18.3 are checked locally; don't trigger costly CI runs. The failing-gate probe runs
  locally, plus a stubbed fast gate job in CI.
- **No manual a11y re-runs before 1.0.0** (Emil). Eight components are stale (all but
  EmptyState); PR 5 adds their exceptions, pinned to the fingerprints at that point.
- **After a manual run:** `pnpm a11y:stamp <Name>` the same day; older runs need `--date`.
- **The `no-release` label doesn't exist yet** (PR 5). Until then a pull request that changes
  `packages/*/src` without a changeset shows a red `changesets` check, which isn't required yet.
- **API diff baseline:** committed in `scripts/api-diff/baseline/` until both packages are on npm;
  the release PR deletes it after 1.0.0. Rewrite it only with `--write-baseline` on `main`.
- **Semantic tokens have no deprecation mark** (`OVERRIDES.md`): the first removal of one needs an
  `api-exceptions.json` entry, or the L01 pipeline gains DTCG `$deprecated`.
- **Ruleset:** live since 2026-10-26 and matches `.github/rulesets/main.json`. The repo-level
  squash-only and delete-merged-branches settings are still off: PR 5.
- Exceptions: Dialog Fullscreen and LongContent, `color-contrast:incomplete`, expire 2027-04-27.
- Open for TextInput (deferred): the Home/End contract row isn't true on macOS.
- No npm login on this machine yet (needed for the manual 1.0.0 publish).
- Untested readers: JAWS, VoiceOver and TalkBack.
- The planner repo's L10 changes are uncommitted there; Emil commits them.

## Next action

1. Emil: OK the repository settings and the `npm` environment (listed in PR 5's description), then
   they are applied and the README says so.
2. Merge PR 5. Then dispatch `release.yml` on a throwaway branch with `probe: fail` (the CI half of
   the gate probe), and review the Version packages pull request it opens.
3. Merge that, then Emil's manual first publish (CONTRIBUTING.md, "Releasing"), trusted publishers,
   and the dispatch that tags and deploys. Then delete the API diff baseline, walk L10's acceptance
   criteria and mark L10 done.
