# Implementation checkpoint

Single source of truth for **where the implementation is right now**. Overwritten by the
`implement-module` skill at the end of every run. For history, see `log.md`; for status, see
`docs/PROGRESS.md`.

| Field         | Value                                                                         |
| ------------- | ----------------------------------------------------------------------------- |
| Target app    | repo root (pnpm workspace: `packages/tokens`, `packages/react`, `apps/docs`)  |
| Active module | L03 — Button (in progress). Written by Claude at Emil's request; Emil reviews |
| Sub-step      | Button done and manually tested; next: reviewers, then triage                 |
| Last verified | 2026-10-17: `pnpm check`, `pnpm test` (tokens 32, react 89), build-storybook  |
| Updated       | 2026-10-17                                                                    |

## Brief — L03 Button

Write against [`packages/react/CONVENTIONS.md`](../../packages/react/CONVENTIONS.md); the rules there
are already decided. Scope calls: scope-decisions.md § L03.

### Files (all yours; agents write one only when you ask for it by name)

| Path (under `packages/react/src/`)          | What                                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `components/Button/Button.tsx`              | `forwardRef` component, `displayName = 'Button'`, exports `Button`, `ButtonProps`                      |
| `components/Button/Button.css`              | One `@layer senui.components { … }` block, `--senui-button-*` tokens                                   |
| `components/Button/Button.a11y.ts`          | `export const a11y = defineA11yContract<ButtonProps>()({ … })`                                         |
| `components/Button/Button.test.tsx`         | Behaviour + `expectNoAxeViolations` on every story (`composeStories`)                                  |
| `components/Button/Button.browser.test.tsx` | Width identical loading vs idle (bounding box); focus kept through loading                             |
| `components/Button/Button.test-d.tsx`       | Type tests (copy the shape of `internal/conventions.test-d.tsx`)                                       |
| `components/Button/Button.stories.tsx`      | Every variant × size × state, plus forced colours                                                      |
| `index.ts`, `styles/index.css`              | `export { Button } from './components/Button/Button.js'`; `@import '../components/Button/Button.css';` |
| `.changeset/*.md` (repo root)               | First changeset, `minor` for `@senakster/react` (`pnpm changeset`)                                     |

### Decisions already made (plan L03, paraphrased, plus L02/L03 scope)

1. Variants `primary | secondary | ghost | danger`; sizes `sm | md | lg` (default `md`, CONVENTIONS
   rule 11). Both always rendered as `data-variant` / `data-size` (rule 2).
2. `type="button"` by default.
3. Loading uses `aria-disabled="true"` plus a guarded click handler that also calls
   `preventDefault()` (so a loading submit button can't submit), never native `disabled`, so focus
   stays put.
4. Button announces nothing about loading itself; the spinner is `aria-hidden` and the name doesn't
   change.
5. Width holds while loading: label and spinner share one grid cell; the label goes
   `visibility: hidden`.
6. Icon-only: `icon` prop, no children, exactly one of `aria-label` / `aria-labelledby` (rule 3).
7. Disabled (not loading) uses native `disabled`.
8. Forced colours: `@media (forced-colors: active)` with a border and system colours.

### Conventions Button is the first user of

`NativeProps<'button'>` (rule 2) · root ownership: `{...rest}` first, then merged `className`,
`data-*` and state attributes (rule 2) · `useComposedRefs(forwardedRef, useNameCheck('Button'))`
(rule 3) · `:where()` selectors, at most `0,1,0` outside it (rule 6) · state selectors
`:disabled, [aria-disabled="true"]` (rule 6) · focus ring as outline + offset, never `outline: none`
(ADR-0005) · movement × `--senui-motion-reduce` · `min-block-size: max(var(--senui-size-control-sm),
var(--senui-size-target-min))` for `sm` (scope-decisions § L01).

Tokens that exist for it: `color.bg.{accent,danger,subtle}` with `-hover`/`-active`,
`color.bg.disabled`, `color.fg.{on-accent,on-danger,default,disabled}`,
`color.border.{default,strong,disabled}`, `color.focus-ring`, `focus-ring.{width,offset}`,
`size.control.{sm,md,lg}`, `size.target-min`, `space.*`, `radius.*`, `font.*`, `motion.*`. There is
no ghost-specific token; ghost can use `bg.subtle-hover`/`-active` on a transparent base.

### Acceptance checklist

- [ ] Type tests: `icon` without a name fails; `variant="purple"` fails; `icon` with children fails
- [ ] Unit: clicking while loading doesn't call `onClick`; default `type` is `button`
- [ ] Unit: `expectNoAxeViolations` passes for every story's args
- [ ] Browser: focus stays on the button from loading to idle; width identical (bounding box)
- [ ] A story for every state (default, hover, focus-visible, active, disabled, loading, icon-only,
      variant × size) and for forced colours
- [ ] `Button.a11y.ts` passes `pnpm check:components` and the contract test. **This needs a manual
      keyboard run and a screen-reader run by you** (name the AT, browser, OS and versions in
      `testedWith`), and must list `RESPONSIBILITIES.keepFocusRing` and `.labelInName`
- [ ] Stylelint clean (replaces the plan's raw-value grep)
- [ ] Reviewers run, findings triaged, overrides logged

### Invariant checks (run 2026-10-16 on the empty tree; all clean)

```sh
pnpm check:components                                   # contract present + valid shape, CSS layered, dist imports resolve
grep -rnE "outline:\s*(none|0)" packages/react/src/components/Button   # must be empty
grep -rn -- "--ds-" packages/react/src                  # must be empty
ls .changeset | grep -v -e README.md -e config.json     # must list the Button changeset
pnpm test                                               # unit + browser + type tests + contract test
```

## In-flight notes

- Branch `feature/component-api-conventions-L002` (L02 committed as `bcb5b57`), pushed, **no PR**,
  so L01 and L02 have still never run in CI. Opening a PR runs it, including the new Chromium step.
- Uncommitted harness work for L03: Vitest `unit`/`browser` projects, `axe-core` helper, the layout
  guard test, Playwright in CI, `@senakster/tokens` dependency, Storybook loading component CSS,
  CONVENTIONS rule 3 → `icon` prop.
- The `react@19.3.1` exclusion in `pnpm-workspace.yaml` can go once that release has aged past
  pnpm's minimum release age (published 2026-10-14).

## Next action

Button is written (scope-decisions § L03, deviation 7). Emil:

1. Reads `packages/react/src/components/Button/` and runs it: `pnpm --filter docs storybook`.
2. Does the keyboard and screen-reader runs, and records them in `Button.a11y.ts` (the TODO at the
   top says what to change). `pnpm test` passes once they're in.
3. Says "review it": the reviewers (`component-api-reviewer`, `wcag-auditor`,
   `modern-web-curator`) run read-only, then triage; rejections go to `OVERRIDES.md`.

Open: hover/active stories need a pseudo-states addon decision (an ADR, since it's a dependency).
