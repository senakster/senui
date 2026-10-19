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

## 2026-10-16 — L03 Button (setup and brief)

- **Did:**
  - Found L02 committed (`bcb5b57`) and pushed, with no PR, so L01 and L02 still haven't run in CI.
  - Read the L03 plan against the decision index: no ADR overrides it. Several details are superseded by L00 and L02: file casing, the token prefix, the stories location, and the raw-value grep.
  - Emil chose:
    - the plan's `icon` prop over L02's `iconOnly`;
    - `axe-core` with an internal helper over the unmaintained `vitest-axe`;
    - Vitest browser mode for the width test.
  - Harness work:
    - `unit` and `browser` Vitest projects;
    - `src/internal/testing/axe.ts` with tests;
    - a layout guard test that fails if the browser project ever runs in jsdom;
    - the Playwright Chromium install in CI;
    - `@senakster/tokens` as a dependency of `@senakster/react`, and `@storybook/react-vite` as a dev dependency for `composeStories`;
    - Storybook's preview loads component CSS from source.
  - CONVENTIONS rule 3, the reference type test, `useNameCheck` and the contract type test now describe the `icon` prop.
  - Wrote the brief into checkpoint.md.
- **Verified:**
  - `pnpm check`, `pnpm test` (tokens 31, react 48, browser project in Chromium) and build-storybook all pass.
  - Probes:
    - The layout guard fails when run in jsdom.
    - The browser test reports `|browser (chromium)|`.
    - axe reports `button-name` and `image-alt` on a broken fixture.
    - Every new `@ts-expect-error` in the reference type test fires.
  - The L03 invariant commands ran clean on the empty tree.
- **Scope decisions:** see scope-decisions.md § L03 (6 rows, 6 deviations), plus an L00 harness note.
- **Plan adjustments:** the width criterion needs a real browser, so jsdom couldn't have met it as written. The plan's `vitest-axe` is replaced by `axe-core`.
- **Overrides:** none yet (no component to review).
- **Next:** Emil writes Button per the brief, including a manual keyboard and screen-reader run for the contract. Then rerun `/modular-web:implement-module` to run the reviewers and triage.

## 2026-10-17 — READMEs (outside the module sequence)

- **Did:** At Emil's request, wrote a root `README.md` (for users: what senui is, its status, quick start, guarantees), `packages/react/README.md` (for users, shipped on npm: CSS loading and order, overriding, theming, accessibility, TypeScript, versioning) and `CONTRIBUTING.md` (for developers: setup, scripts, layout, how work is organised, adding a component, decisions, surprises, CI). `packages/tokens/README.md` was already good and is unchanged.
- **Verified:** Prettier check passes; every relative link resolves; `npm pack --dry-run` includes the react README.
- **Not done:** there is no `LICENSE` file or `license` field yet (an L10 note), so the READMEs don't name a licence.
- **Next:** unchanged. Emil writes Button per the brief in checkpoint.md.

## 2026-10-17 — Dark-mode fix (an L01 defect, found during L03)

- **Did:** Emil reported an unreadable Dark column on the Tokens docs page.
  - **Cause 1 (docs only):** Storybook's unlayered docs styles coloured `code` and beat the layered `[data-theme]` rule. Fixed with `sb-unstyled` on the tables, which are now styled from tokens.
  - **Cause 2 (library defect):** Vite 8's default production build rewrites `light-dark()` (via Lightning CSS) into variables that resolve where a token is declared. Tokens were declared only on `:root`, so every `data-theme` subtree rendered in the page's theme. Dev mode hid it.
  - **Fix:** Emil chose to declare tokens on `:where(:root, [data-theme])` (ADR-0010, amending 0004 and 0005). Pipeline changed, with a regression test. The override guidance in the tokens README, the react README and the Tokens page now uses `:root, [data-theme]`.
- **Verified:**
  - A default Vite consumer app had kept 0 of 28 `light-dark()` calls before the fix.
  - After it, in Chromium, both from source and from a default Vite build: a dark subtree, a light subtree nested in it, OS dark mode, and reduced motion inside a subtree all come out correct.
  - In the built Storybook, the dark cell background is `oklch(0.16 …)` with `oklch(0.97 …)` text.
  - `pnpm check`, `pnpm test` (tokens 32, react 48) and build-storybook pass, and every decision record parses.
- **Recorded:** scope-decisions § L01, "Defects found later", which includes the verification gap: L08 must test built output in a browser.
- **Next:** unchanged. Emil writes Button per the brief.
- **Follow-up the same day:** Emil still saw unreadable text, with the OS in dark mode. Storybook's docs page is always light, but `tokens.css` lets the page root follow the OS, so unthemed cells got dark-theme text on a white page. My first check had only run with the OS set to light. The docs tables now carry `data-theme="light"`. Re-verified in the built Storybook with the OS in both light and dark: 277 text elements, worst contrast 5.81:1 in both.

## 2026-10-17 — L03 Button written (by Claude, at Emil's request)

- **Did:**
  - Emil asked for a Button example, then chose the real Button for him to review over a reference copy (a pair-mode deviation, scope-decisions § L03, deviation 7).
  - Checked modern-web-guidance (`spinner`, `color`).
  - Wrote `Button.tsx`: `forwardRef`, `NativeProps`, the icon/children union, root ownership, the loading guard that also stops form submission, and the name check.
  - Wrote `Button.css`: component tokens, variants and sizes as token-only rules, states as properties, a grid-stacked spinner, focus outline plus offset, forced-colours borders, and a spinner that slows under reduced motion.
  - Also wrote the contract (automated run only), the unit tests with axe on every story, the browser tests, the type tests, 12 stories and the changeset.
  - Wired up the entry export and the CSS import.
  - Added the `motion.easing.linear` token, and `storybook` as a react dev dependency (for `storybook/test`).
  - `pnpm dedupe` fixed a dangling `storybook` link: pnpm had resolved a peer-less variant that it never installed.
  - CONVENTIONS' example now uses `data-state` instead of `aria-busy`.
  - Removed Emil's stub `Button.types.ts` and empty `index.ts`.
- **Verified:**
  - `pnpm check` passes (Stylelint clean, contract present, CSS layered, dist imports resolve).
  - `pnpm test`: tokens 32; react 87 of 88. The one failure is the intended contract gate, which reports exactly "no keyboard run" and "no screen-reader run".
  - Type tests clean (every `@ts-expect-error` fires).
  - 9 browser tests in Chromium: width and height held while loading at all three sizes, focus kept through loading, 24px target, outline rather than box-shadow.
  - Probe: hiding the label with `display: none` fails the width test at all three sizes.
  - build-storybook lists 12 Button stories.
- **Known-unmet:** hover/active stories (need a pseudo-states addon decision); manual keyboard and screen-reader runs (Emil).
- **Next:** Emil reviews the files, does the manual runs and records them, then "review it" for the reviewers and triage.
- **2026-10-17, Emil's manual runs:** keyboard (Chrome 155.0.8059.40, Windows 11 26H2 build 26300.9711) all passed; recorded. Narrator heard "Save, button" on focus, but **"button, disabled" with no name while loading**: `visibility: hidden` on the label had removed it from the accessibility tree. jsdom doesn't apply the CSS, so the unit test passed. A new browser test reproduced the fault, and the label now uses `opacity: 0` (the test passes, and the width still holds). The Narrator run predates the fix, so it isn't recorded as a pass; Emil re-tests the Loading story. Contract test: now fails only on the missing screen-reader run.
- **Narrator re-test after the fix:** "Save, button, disabled" while loading. Recorded the screen-reader run (Narrator, Chrome 155.0.8059.40, Windows 11 26H2 build 26300.9711, pass); 4.1.2 now cites it. Emil removed the `name` attribute from the IconOnly story. `pnpm check` and `pnpm test` pass in full (react 89/89). Next: the reviewers.
- **Emil saw no activation on Enter.** Real key-press browser tests (Playwright) prove Enter and Space each activate once and do nothing while loading. The stories had no `onClick`, so nothing was visible; the meta now passes `onClick: fn()`, which logs to the Actions panel. 2.1.1 cites the automated key-press tests as well.

## 2026-10-17 — Branch rules and licence

- **Did:** Emil asked for a GitHub ruleset for PRs and merging. The repo is private on a free account, so GitHub's API refuses rulesets (HTTP 403). Checked the history before suggesting a public switch: one identity (`senakster@gmail.com`), no secret-like files, no employer name. Emil chose to stay private; MIT; squash only; no bypass. Wrote `.github/rulesets/main.json` (ready to POST) with a README, `LICENSE`, `license: MIT` in both packages, and a "Branches and pull requests" section in CONTRIBUTING.
- **Verified:** the ruleset JSON parses; `pnpm check` passes. Not applied to GitHub: it can't be, on this plan.
- **Next:** unchanged. Say "review it" for the Button reviewers; open a PR for CI.

## 2026-10-18 — L03 Button: review and fixes

- **Did:**
  - Found PR #1 (licence and rules) merged, with CI green. It merged as a merge commit, because the squash-only repository setting isn't applied yet.
  - Ran the `review-component` workflow at Emil's choice: 3 reviewers, read-only, no gaps.
  - Triaged with Emil in three batches and applied every fix (scope-decisions § L03, "Review"):
    - the label type narrowed;
    - `aria-pressed` supported;
    - axe with rendered contrast on every story in Chromium;
    - the secondary border moved to `border.strong`;
    - the forced-colours spinner gap;
    - consumer `aria-disabled` made public;
    - Button hides its own icon;
    - `onClickCapture` guarded;
    - hover limited to hover-capable devices;
    - the public surface declared;
    - 6 more stories.
  - Recorded the `opacity: 0` deviation.
- **Verified:**
  - `pnpm check` passes. `pnpm test`: tokens 32, react 120, type tests clean.
  - build-storybook builds 18 Button stories.
  - Probe: lowering the primary label's contrast failed the browser axe check on 7 stories; the file was restored.
- **Overrides:** 16 findings (API 8, a11y 6, platform 2): accepted 16, rejected 0, escalated 0. No `OVERRIDES.md` rows.
- **Next:**
  - Emil re-checks what changed for assistive technology and forced colours: the Toggle story with Narrator (pressed / not pressed), and loading plus pressed with forced-colors emulation.
  - Then commit and open a PR (squash), and mark L03 done.
  - The contract staleness check will warn after the commit, because Button.tsx changed after the 2026-10-17 runs. A fresh Narrator run clears it.
- **Forced-colours check by Emil (Chrome emulation, dark):** the spinner gap, disabled (GrayText) and borders were fine, but **pressed** showed an empty box. Chrome paints a Canvas backplate behind text in forced colours, and `HighlightText` on it was black on black. The pressed rule now sets `forced-color-adjust: none` with the Highlight/HighlightText system pair; a Playwright screenshot of Matrix with forced colours and a dark scheme shows "Pressed" readable. Recorded as a forced-colours run once Emil confirms.
- **Narrator re-check (2026-10-18, Danish Narrator, Chrome):** the Toggle story is announced "Bold, toggle button, slået fra" (not pressed). Recorded as a second screen-reader run; the toggle announcement in the contract now holds what was heard.

## 2026-10-18 — L03 done

- **Did:** Emil confirmed the Narrator toggle check and, after the fix, the forced-colours check ("Pressed is readable"). Recorded a forced-colours run; 1.4.11 cites it. Walked the acceptance checklist: all met except dedicated hover/active stories (known-unmet, pseudo-states addon decision).
- **Verified:** `pnpm check`; `pnpm test` (tokens 32, react 120); build-storybook.
- **Next:** Emil commits on a branch and opens a PR (squash). Then `/modular-web:implement-module` starts L04 (FormField + TextInput).

## 2026-10-18 — L04 FormField + TextInput: written, awaiting Emil's review

- **Oriented:** PR #2 (L03 review fixes) was already merged; the checkpoint still said "waiting on a PR". Catalogue current; decision index rebuilt.
- **Scope (Emil, via questions):**
  - Claude writes, and Emil reviews.
  - Native validity syncs into `aria-invalid`; it is not styled through `:user-invalid`.
  - The error stays until the value is valid.
  - The live region is opt-in.
  - `focusFirstInvalid` is public.
  - TextInput has sizes.
  - The binding is a sealed render prop.

  All of this is recorded in scope-decisions § L04.

- **Probes (Playwright, deleted afterwards):**
  - Chromium matches `:user-invalid` on a touched, invalid field while the accessibility tree reports `invalid: false`. This confirms CONVENTIONS rule 6.
  - During a submit, `:user-invalid` already matches when `invalid` fires. During `checkValidity()` on an untouched form it does not.
- **Did:**
  - `FormField` (label, description, error node, required marker, `announce`, control `id`), `useFormFieldControl` (the internal wiring hook for L05), `focusFirstInvalid`, and `TextInput` (six text types, three sizes, a three-way name union).
  - CSS, contracts, unit, type and browser tests, 25 stories (including NativeValidation and SubmitWithErrors with `play` functions), and the changeset.
  - `useNameCheck` now counts `<label>` elements. CONVENTIONS rule 3 describes the binding.
- **Verified:**
  - `pnpm check` passes.
  - `pnpm test`: tokens 32; react 213 of 215. The two failures are the intended contract gate: FormField has no screen-reader run, and TextInput has no keyboard or screen-reader run.
  - Type tests clean. Browser project 72/72 (axe with rendered contrast on every story).
  - build-storybook: 12 FormField and 13 TextInput stories.
  - Invariant greps clean (no `outline: none`, no `--ds-`, no `aria-errormessage`, no `:user-invalid` / `:invalid` styling).
- **Probes on the tests themselves:** the first versions of two browser tests were dead.
  - The `checkValidity()` test asserted before React rendered; it now uses `act()`.
  - The "looks the same" test only visited the field, which never makes it `:user-invalid`; it now types, clears and leaves the field.

  Re-probed: disabling the touched guard, adding `:user-invalid` styling, and removing the focus move each fail a test. All probes were restored.

- **Overrides:** none yet (reviewers not run).
- **Next:**
  - Emil reviews the code.
  - Emil runs the manual checks: keyboard for TextInput; a screen reader on NativeValidation, SubmitWithErrors, AnnounceOnChange and a TextInput story; forced colours on both ForcedColors stories.
  - Then the review-component workflow, once for each of FormField and TextInput.

## 2026-10-19 — Storybook controls ignored (L03 defect, fixed with L04's stories)

- **Found by Emil:** setting `variant` to danger on Button's IconOnlyLoading story changed nothing. The story rendered fixed JSX and never read `args`, and so did four other Button stories and some of L04's.
- **Did:** the stories now spread their args; fixed grids and whole-form stories disable their controls. Added `withControls()` (`src/internal/testing/stories.ts`) and a "passes its args through" test in each component's `*.test.tsx`. CONVENTIONS' file layout states the rule. Details: scope-decisions § L03, "Defects found later".
- **Verified:** the probe (the old IconOnlyLoading put back) fails the new test and was restored. `pnpm check` passes. `pnpm test`: tokens 32; react 249 of 251, and the two failures are still only the L04 contract gate. Storybook builds.
- **Next:** unchanged. Emil reviews L04 and does the manual runs.

## 2026-10-19 — L04 manual runs recorded

- **Emil's runs** (Chrome 155.0.8059.40, Windows 11 Pro 26H2 build 26300.9711, Narrator in English on a Danish system): keyboard on TextInput passed; Narrator passed. Heard:
  - NativeValidation: focus on Name with both fields empty, and "Email, edit, Please fill out this field" with Name filled. The message is the browser's, so this run is NativeValidation, not SubmitWithErrors (inferred and stated to Emil).
  - TextInput Default: "Search, edit".
- **Did:** recorded a screen-reader run in both contracts and a keyboard run in TextInput's, and replaced the matching "not yet heard" announcements with what was heard. SubmitWithErrors and AnnounceOnChange stay "not yet heard".
- **Verified:** `pnpm check`; `pnpm test`: tokens 32, react 251/251 (the contract gate now passes).
- **Next:** the `review-component` workflow for FormField and TextInput (Emil's opt-in), then triage. Optional: hear SubmitWithErrors and AnnounceOnChange; a forced-colours check.

## 2026-10-19 — L04 remaining manual runs recorded

- **Emil:** forced colours good on both ForcedColors stories. SubmitWithErrors and AnnounceOnChange each read the label, the control role and the error message (Narrator in English).
- **Did:** recorded forced-colours runs in both contracts (evidence for FormField 1.4.1 and TextInput 1.4.11); replaced the last two "not yet heard" announcements; FormField 4.1.3 now cites the screen-reader run.
- **Verified:** `pnpm check`; `pnpm test`: tokens 32, react 251/251.
- **Settled:** Narrator reads "required" and "invalid" (Emil). Recorded without exact wording: language mix made some phrasing hard to follow.
- **Next:** the `review-component` workflow for FormField and TextInput (Emil's opt-in), then triage.

## 2026-10-19 — L04 review: triaged and applied

- **Reviewers:** the `review-component` workflow (API, accessibility, platform), read-only. The API reviewer failed in the first run; the re-run repeated all three. 30 findings across both passes, 17 distinct decisions.
- **Triage with Emil (five batches):** accepted 16, rejected 0, escalated 1 (ADR-0011). No `OVERRIDES.md` rows. Every fix is listed in scope-decisions § L04, "Review".
- **Probes:** making the submit focus ignore `error`-prop fields, and disabling the re-check after render, each failed its new browser test. Both restored.
- **Found while fixing:** JSX doesn't type-check hyphenated attributes a component doesn't declare, so omitting `aria-*` from FormField's props did nothing. They are declared `never`, locked by type tests. `error` also needs explicit `undefined` for `error={errors.email}` under `exactOptionalPropertyTypes`.
- **Cross-browser:** installed Playwright Firefox and WebKit. With `SENUI_BROWSERS=firefox,webkit`, the FormField and TextInput browser tests passed: 88 tests, both engines confirmed in the verbose output.
- **ADR-0011** written and indexed (accepted; L04, L05; trigger extracted). CLAUDE.md's locked-decisions table and ADR-0001's index row updated.
- **Verified:** `pnpm check`; `pnpm test`: tokens 32, react 265/265; build-storybook.
- **Next:** Emil re-checks read-only in forced colours (TextInput ForcedColors, read-only row now dashed). Then mark L04 done and commit on a new branch.

## 2026-10-19 — L04 done

- **Emil:** read-only re-checked in forced colours ("fine"), recorded in TextInput's contract. Deviation 7: keep native `value` / `onChange`, after a pros/cons comparison.
- **Did:** CONVENTIONS rules 5 and 11 now say a component wrapping a native form control passes its native `value` / `onChange` through, and `on<Prop>Change(value)` is for state a component owns. Deviation 7 closed in scope-decisions, with the L05 consequence.
- **Acceptance:** every L04 criterion is met. Plan decisions 5 and 6 are replaced by ADR-0011 (deviations 1 and 3). The paste criterion is checked as "not cancelled" in jsdom (deviation 10).
- **Verified:** `pnpm check`; `pnpm test`: tokens 32, react 265/265; build-storybook. Invariant greps clean.
- **Next:** commit on a new branch (L04, the review fixes, the Button stories fix, ADR-0011), open a PR, and squash-merge when `verify` is green. Then `/modular-web:implement-module`: L05 (Checkbox / Switch) has no plan yet (`not-planned`).
