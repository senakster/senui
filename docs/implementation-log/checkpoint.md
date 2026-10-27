# Implementation checkpoint

Single source of truth for **where the implementation is right now**. Overwritten by the
`implement-module` skill at the end of every run. For history, see `log.md`; for status, see
`docs/PROGRESS.md`.

| Field         | Value                                                                                |
| ------------- | ------------------------------------------------------------------------------------ |
| Target app    | repo root (pnpm workspace: `packages/tokens`, `packages/react`, `apps/docs`)         |
| Active module | none: L08 done; L09 (Docs & machine-readable manifest) is not planned yet            |
| Sub-step      | L08 merged in four PRs (#8–#11); its completion record is on `docs/l08-done`         |
| Last verified | 2026-10-27, `main`: CI; three-engine gate 3,918 passed; `react-18` 886/886 on 18.3.1 |
| Updated       | 2026-10-27                                                                           |

## Brief

No module in flight. L00–L08 are done. L09 needs a plan before it can start: write it in the
planner (`docs/library_catalogue/`), then re-sync `.catalogue/` here (implement-module skill,
"Re-syncing a library project").

## In-flight notes

- **PR gate budget (L08, Emil):** the gate step in `ci.yml` is held to 10 min (8 min 41 s on #11);
  it has a 15-minute step timeout against hangs. A PR whose gate step goes over 10 min is reviewed.
- `main`'s three-engine gate takes ~34 min; `react-18` takes ~2 min.
- Exceptions: Dialog Fullscreen and LongContent, `color-contrast:incomplete`, expire 2027-04-27.
- Open for TextInput (Emil deferred it): the Home/End contract row isn't true on macOS
  (scope-decisions § L04, cross-module notes).
- The Docker CLI warning in container steps is the runner's own `docker exec` reading
  `HOME: /root`; it's harmless.
- **Storybook on GitHub Pages (Emil, 2026-10-26): comes with L09.** On a push to `main`, the CI `verify` job uploads the Storybook it builds as a Pages artifact, and a `deploy-storybook` job (`needs: verify`) publishes it to `https://senakster.github.io/senui/`. Claude enables Pages with `gh api -X POST repos/senakster/senui/pages -f build_type=workflow` once merged (Emil's OK).
- **npm publishing (Emil, 2026-10-26):** after L07 to L10; L10 builds the pipeline first. Gaps: no npm login on this machine, no LICENSE in the packages, no `repository`/`homepage`/`bugs`.
- **L09:** the docs generator must handle `semantics.name: 'none'`; it can reuse `gate/stories.ts`'s story-to-contract mapping.
- Untested readers: JAWS, VoiceOver and TalkBack. `react@19.3.1` exclusion in `pnpm-workspace.yaml` can go once that release has aged. Still open from L03: hover/active stories; the squash-only repository setting.

## Next action

1. Merge `docs/l08-done` (the L08 completion record and the gate step's timeout).
2. Plan L09 in the planner with Emil, then sync it here and run `/modular-web:implement-module`.
