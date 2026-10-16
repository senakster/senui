# Implementation log

Append-only session log, **chronological (newest at the bottom)**. One entry per `implement-module`
run or stopping point. This is the narrative of _how_ the implementation progressed; the
current state lives in `checkpoint.md` and authoritative status in `docs/PROGRESS.md`.

Entry format: date — module · Did · Verified · Scope decisions · Plan adjustments · Overrides
(accepted / rejected / escalated findings) · Next.

---

## 2026-10-15 — setup

- **Did:** Bootstrapped with `/modular-web:new-project --profile library`. Vendored 6 plans (PLAN, L00–L04) to gitignored `.catalogue/`; wrote `.catalogue-sync.json`, `docs/PROGRESS.md`, implementation log, `docs/decisions/` index, `.catalogue-decisions.json`, `OVERRIDES.md`, `CLAUDE.md`.
- **Verified:** `catalogue-status` all current; `.catalogue/` and `.catalogue-decisions/` ignored; decision index builds.
- **Scope decisions:** none
- **Plan adjustments:** none
- **Overrides:** none
- **Next:** start L00 via `/modular-web:implement-module`.

## 2026-10-15 — L00 Workspace, harness & CI

- **Did:** Scaffolded the pnpm workspace (pnpm 12.3.4), `tsconfig.base.json`, a flat ESLint config (typescript-eslint strictTypeChecked, jsx-a11y strict, react-hooks, storybook, prettier), Prettier, both packages with tsdown builds, the Vitest/jsdom/Testing Library harness, the Storybook 10 shell, Changesets, `ci.yml` and `.claude/workflows/review-component.js`. Wrote ADR-0003 (tsdown). Brought the ADR index and CLAUDE.md's locked-decisions table up to date, and removed duplicate 0001/0002 index rows.
- **Verified:** `pnpm check` green, including after a clean `pnpm install --frozen-lockfile` (fresh-clone simulation). `pnpm test`, `pnpm build` and `pnpm --filter docs build-storybook` green. Probes: publint fails the build on a broken `exports` path; a throwaway JSX test passes under Vitest and `tsc`, then was deleted. `pnpm format` left `catalogue-status` all current. The `.catalogue/` and `.catalogue-decisions/` directories are ignored. The decision index has 0 unparsed records and returns ADR-0003 with its revisit trigger.
- **Scope decisions:** tsdown over tsup (ADR-0003). "CI green on a PR" deferred until there is a remote. TypeScript pinned to 6.0 and ESLint to 9 because of peer ceilings. React 19.3.1 excluded from pnpm's release-age gate as an apparent security release.
- **Plan adjustments:** L00's open question on the build tool is resolved by ADR-0003. The vendored plan still lists it as open.
- **Overrides:** none (no reviewer run; L00 is agent work for Emil to review).
- **Next:** Emil reviews the L00 scaffold and makes the first commit. Then `/modular-web:implement-module` starts L01 (design tokens).

## 2026-10-16 — L01 Design tokens (pipeline)

- **Did:** Found L00 committed (`21bdba2`) with a GitHub remote and a green first CI run. Read the run's log to confirm the steps did real work, then closed L00's deferred CI row. Found that ADR-0002's revisit trigger had fired (Style Dictionary 5, DTCG 2025.10 stable) and wrote ADR-0004, which supersedes it. Built `packages/tokens/sd.config.mjs`: three Style Dictionary passes (base, dark, reduced motion), oklch-preserving colour and unit transforms, `light-dark()` pairing, primitives filtered out, the CSS and TS output, and a CLI. Built `contrast.mjs` (WCAG 2.1 in sRGB, composited and gamut-mapped). Added the hand-written `Token` type and the `./tokens.css` export; tsdown copies the CSS. Added 12 pipeline tests, a Tokens docs page (`apps/docs/src/tokens/`), and `packages/tokens/README.md` documenting the source contract.
- **Verified:** `pnpm check`, `pnpm test` (tokens 12/12) and build-storybook are green, and the Tokens page is in the Storybook index. A smoke test of the real CLI with a temporary on-disk fixture confirmed: two builds are byte-identical; `light-dark(` count 2 = 2 colour tokens; no `primitive` anywhere in `dist`; no primitive refs in `packages/react/src`; and a contrast miss exits 1 naming the token, the background, the theme and the ratio. The fixture was removed. `npm pack --dry-run` lists only `README.md`, `dist/*` and `package.json`.
- **Scope decisions:** oklch; primitives not emitted; Emil writes the token values. ADR-0004 replaces Style Dictionary v4 with v5. See scope-decisions.md § L01.
- **Plan adjustments:** the primitive guard grep is adapted to the new naming. ADR-0004's code-size trigger was corrected before commit: it was drafted at about 150 lines, and the code at adoption is about 245 (including the shadow fix below), so it is now about 300.
- **Later the same day:** at Emil's request, added `packages/tokens/examples/example.tokens.json`: a complete example token set, not built or shipped, and kept valid by `test/example.test.mjs`. It exposed a pipeline bug: the stock shadow shorthand inlined the light colour, so elevation ignored dark mode. It is replaced by `senui/shadow/css`, which emits `var(--senui-color-…)` for a shadow colour that references a public token, and is covered by a regression test. Tokens tests: 14/14.
- **Overrides:** none.
- **Next:** Emil writes `packages/tokens/src/*.tokens.json` (brief in checkpoint.md). Then rerun `/modular-web:implement-module` to verify the contrast and reduced-motion criteria against the real tokens, run `modern-web-curator` on names and values and `wcag-auditor` on the contrast pairs, and mark L01 done.

## 2026-10-16 — L01 Design tokens (review and done)

- **Did:** Found the example copied into `src/senui-start.tokens.json` and committed (`0f61051`) on `feature/Token-pipeline-L001` (pushed, no PR yet, so no CI run). Ran `modern-web-curator` and `wcag-auditor` read-only in parallel. Fixed a contrast-checker defect before triage: a missing or misspelled `min` passed any pair, including 1:1. Emil accidentally removed that fix mid-session and asked for it back; it was reapplied and probed (disabling the guard fails exactly its 6 regression tests). Triaged with Emil in three batches. Wrote ADR-0005. Added the `[data-theme]` base rule and the `surface` check to the pipeline. Hardened `contrast.mjs` (worse of gamut-mapped and clipped, three decimals). Redrafted the token set for Emil's review: 68 tokens. Updated the README and Tokens page (override examples with `light-dark()`, `color-scheme` opt-out, motion factor, focus-ring and elevated-border rules), removed the docs page's own `[data-theme]` workaround, and regenerated the example from the draft.
- **Verified:** `pnpm check`, `pnpm test` (tokens 31/31) and build-storybook are green. Deterministic build. `light-dark(` 25 = 25 colour tokens. 0 primitives in `dist`, 0 primitive refs in `packages/react/src`, 1 reduced-motion block. Every contrast pair passes in both themes; the tightest is `fg.accent` on `bg.subtle`, light, 5.20:1. The focus-ring impossibility claim in ADR-0005 was computed, not asserted: dark ring luminance must be ≥ 0.112 and ≤ 0.091.
- **Scope decisions:** see scope-decisions.md § L01 (15 rows).
- **Plan adjustments:** the focus-ring pair against `bg.accent` was dropped as unsatisfiable (deviation 5). ADR-0004's 300-line trigger fired at 308 lines and is raised, not acted on.
- **Overrides:** 22 findings (11 + 11, overlapping). Accepted all, rejected 0, escalated 1 ADR (ADR-0005, covering four of them). 1 accepted suggestion was materially changed by the agent (deviation 5), and is raised with Emil.
- **Closed with Emil the same day:** token names accepted as public API, with values a generic starting point. ADR-0004's line-count trigger replaced in ADR-0005 by a trigger on the Style Dictionary workaround code (about 90 of 308 lines). Deviation 5 confirmed after checking that the offset gap replaces the pair for every existing surface; recorded as the first `OVERRIDES.md` row, with the uncovered case (a control on an accent container) added to ADR-0005's revisit triggers.
- **Next:** Emil commits (and fills the `OVERRIDES.md` commit column), then opens a PR for CI. Then `/modular-web:implement-module` starts L02.

## 2026-10-16 — L02 Component API conventions

- **Did:** Emil chose no polymorphism (ADR-0006), Stylelint for the raw-value guard (ADR-0007), React 18.3 with `forwardRef`, and "Claude drafts, I review". Drafted `CONVENTIONS.md`, `useControllableState`, `deprecate`/`warnOnce`, the `A11yContract` type, the reference type test, and the contract and component-CSS check scripts. Enabled Vitest typecheck mode for `*.test-d.*`. Ran `component-api-reviewer` and `wcag-auditor` read-only in parallel, then triaged with Emil in three batches. Applied every finding:
  - The contract is bound to the component's props with `defineA11yContract<P>()`. It has closed keys, roles and elements, non-empty evidence lists, a WCAG 2.2 table, per-method test runs, structured semantics, announcements and focus, and the `adaptation` section (ADR-0008). A runtime test loads every contract.
  - The hook has a stable setter and an updater form. It warns about frozen controls, and continues from the last value on a switch.
  - `dev.ts` survives a missing `process`.
  - New helpers: `NativeProps`, `DistributiveOmit` (public), `mergeIds`, `useComposedRefs` and `useNameCheck`.
  - Stylelint gains a specificity cap and no ids, a unit allow-list (ADR-0009), more token-only properties, an easing ban in shorthands, and `var()` lists for shadows.
  - Component CSS is copied to `dist` and exported as `./styles/<Name>.css`, with a dist-CSS check.
  - Entry exports are limited to components and `./types.js`.
  - `CONVENTIONS.md` gains root ownership, state selectors, forced colours, prop naming, the disabled guard, deprecation of every public kind, and the public-surface table.
- **Verified:** `pnpm check`, `pnpm test` (tokens 31, react 44, type tests clean) and build-storybook. Probes:
  - Twelve raw CSS forms each fail Stylelint, and the token forms pass.
  - Each script fails on its violation: a missing contract, a commented-out contract, an internal export, an extra entry import, an unlayered stylesheet, an unresolved dist import, and CSS left uncopied.
  - A throwaway component fails the contract test on a wrong name and a missing `displayName`.

  The probes found two real bugs, both fixed:
  - With `flatten: false`, tsdown copied component CSS to `dist/components/components/`.
  - Vitest's persistent module cache froze the contract test's glob results, so new components went unchecked locally.

- **Scope decisions:** see scope-decisions.md § L02 (12 rows, 4 deviations).
- **Plan adjustments:** `deprecate` takes the component name; contracts use `defineA11yContract` instead of `satisfies`.
- **Overrides:** 24 findings (12 + 12, one shared). Accepted 24, rejected 0, escalated 2 ADRs (0008, 0009). No `OVERRIDES.md` rows. Not done: a positive-`tabIndex` type restriction, which was outside the accepted option (logged as out).
- **Next:** Emil reviews and commits L01 + L02, then opens a PR so CI runs (L01 has never been through CI). Then `/modular-web:implement-module` starts L03 (Button), where Emil writes the component.
