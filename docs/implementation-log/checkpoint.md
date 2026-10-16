# Implementation checkpoint

Single source of truth for **where the implementation is right now**. Overwritten by the
`implement-module` skill at the end of every run. For history, see `log.md`; for status, see
`docs/PROGRESS.md`.

| Field         | Value                                                                        |
| ------------- | ---------------------------------------------------------------------------- |
| Target app    | repo root (pnpm workspace: `packages/tokens`, `packages/react`, `apps/docs`) |
| Active module | L01 — Design tokens                                                          |
| Sub-step      | Pipeline done and tested; waiting on Emil's `src/*.tokens.json`              |
| Last verified | 2026-10-16: `pnpm check`, `pnpm test`, build-storybook green; CLI smoke test |
| Updated       | 2026-10-16                                                                   |

## Brief — the token files (Emil)

Write `packages/tokens/src/*.tokens.json`, one file per category: `color`, `space`, `radius`,
`font`, `motion`, `elevation` and `size`. The source format is in `packages/tokens/README.md`.
In short:

- Primitives go under a top-level `primitive` group. They are never emitted.
- Every public colour needs `$extensions.senui.dark` and `$extensions.senui.contrast` (`[]` for a
  surface). Use 4.5 for text pairs and 3 for non-text pairs.
- Motion follows L01's plan rows: durations `fast`/`moderate`/`slow` (about 120/200/320 ms) and
  easings `standard`/`enter`/`exit`. Distance and scale tokens carry a `reducedMotion` value of 0
  or 1. Keep a short opacity fade rather than zeroing durations.
- `size` includes a 24px minimum target token (WCAG 2.5.8), and icon-only controls default to
  32px.

The checks that decide when L01 is done, all from the repo root:

```sh
pnpm check                                   # builds tokens; fails on any contrast miss
pnpm --filter @senakster/tokens build && sha256sum packages/tokens/dist/* > /tmp/a \
  && pnpm --filter @senakster/tokens build && sha256sum packages/tokens/dist/* | diff /tmp/a -
grep -c "light-dark(" packages/tokens/dist/tokens.css   # equals the public colour count
grep -c primitive packages/tokens/dist/*                # 0 in every file
grep -rnE -- '--senui-primitive-|--senui-color-[a-z]+-[0-9]+' packages/react/src   # nothing
grep -c "prefers-reduced-motion" packages/tokens/dist/tokens.css                   # 1
```

Then run the Tokens page in Storybook (`pnpm --filter docs storybook`) and check both columns by
eye.

## In-flight notes

- ADR-0004 and all L01 work are uncommitted. ADR-0004's code-size trigger was corrected before
  commit (see log.md 2026-10-16).
- Reviewers once the tokens land: `modern-web-curator` on names and values, `wcag-auditor` on the
  contrast pairs (per L01's plan). Rejected findings go to `OVERRIDES.md`.
- The `react@19.3.1` exclusion in `pnpm-workspace.yaml` can be removed once that release ages
  past pnpm's minimum release age (it was published 2026-10-14).

## Next action

Emil writes the token files. Then rerun `/modular-web:implement-module` to verify, review and mark
L01 done.
