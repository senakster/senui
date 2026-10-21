# Implementation checkpoint

Single source of truth for **where the implementation is right now**. Overwritten by the
`implement-module` skill at the end of every run. For history, see `log.md`; for status, see
`docs/PROGRESS.md`.

| Field         | Value                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------- |
| Target app    | repo root (pnpm workspace: `packages/tokens`, `packages/react`, `apps/docs`)              |
| Active module | L07 — EmptyState (next; plan-ready). L06 done 2026-10-21                                  |
| Sub-step      | L06 complete and uncommitted on `feature/dialog-L06`; waiting on a commit and PR          |
| Last verified | 2026-10-21: `pnpm check`; `pnpm test` 552/552; 3-engine dialog tests 165; build-storybook |
| Updated       | 2026-10-21                                                                                |

## Brief

Branch `feature/dialog-L06`. One commit so far (`4b25c64`, the `internal/` regroup). The L06 work is
uncommitted.

**Deliverables (all written):**

- `packages/react/src/internal/dialog/useModalDialog.ts`, `ModalDialog.tsx`: shared behaviour and markup
- `packages/react/src/components/Dialog/`: `Dialog.tsx`, `.css`, `.a11y.ts`, `.test.tsx`, `.test-d.tsx`,
  `.browser.test.tsx` (it covers AlertDialog too), `.stories.tsx`
- `packages/react/src/components/AlertDialog/`: `AlertDialog.tsx`, `.css`, `.a11y.ts`, `.test.tsx`, `.stories.tsx`
- `packages/react/vitest.commands.ts`, `src/internal/testing/commands.d.ts`, `src/internal/testing/dialog.ts`
- `AlertDialog.browser.test.tsx` (the per-component stylesheet on its own)
- tokens `color.bg.backdrop`, `size.dialog.*`; ADR-0014 (scroll lock) and ADR-0015 (`rem` in media
  queries); `stylelint.config.mjs`, `scripts/check-component-css.mjs`; `.changeset/add-dialog.md`

**Invariant checks (run 2026-10-20, all hold):** in `components/{Dialog,AlertDialog}` and
`internal/dialog`, no rendered `open` attribute, no portal, `aria-hidden` or `inert`, no
`command`/`commandfor`, and no `closedby`. No unscoped `html:has(dialog`. Runtime dependencies are
`@senakster/tokens` only. No Stylelint disables in component CSS (ADR-0015).

**Emil's answers (2026-10-20):** all four recommendations taken: ADR-0015 (`rem` in size media queries), `AlertDialog.css` imports `Dialog.css`, the Safari pointer fallback, and Claude's API choices kept. See scope-decisions § L06.

**Acceptance:** every L06 criterion is met (review 10/10 accepted; keyboard, NVDA 2026.2 and forced-colours runs recorded). Not heard: the `finalFocus` announcement.

## In-flight notes

- Cross-browser: `SENUI_BROWSERS=chromium,firefox,webkit`. CI stays Chromium-only until L08.
- `check-a11y-contracts` warns about Button, FormField and TextInput after the regroup: only their import
  paths changed (L02 cross-module note).
- Untested readers: JAWS, VoiceOver and TalkBack.
- `react@19.3.1` exclusion in `pnpm-workspace.yaml` can go once that release has aged.
- Still open from L03: hover/active stories (pseudo-states addon); the squash-only repository setting.

## Next action

Commit L06 on `feature/dialog-L06` and open a PR (squash-merge when `verify` is green). Then run `/modular-web:implement-module` to start L07 (EmptyState).
