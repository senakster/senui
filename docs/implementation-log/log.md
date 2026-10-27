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

## 2026-10-19 — L04 merged; paused before L05

- **Oriented:** PR #3 (L04) squash-merged as `18f5133`, CI `verify` green; local `main` up to date. Catalogue current (plugin 0.3.0).
- **Blocked:** L05 (Checkbox / Switch) has no plan. `PLAN.md` says "plan TBD", and the planner repo's library catalogue ends at L04; the same holds for L06–L11. Offered: draft L05 upstream in the planner (recommended), or plan it locally. **Emil chose to pause.**
- **Next:** give L05 a plan (draft upstream, then sync), then `/modular-web:implement-module`.

## 2026-10-19 — L05 Checkbox / Switch: written, awaiting Emil's review

- **Oriented:** the planner gained L05 to L07 plans (`89ae68b`, by Emil, after ADR-0011), and L04 and PLAN.md changed upstream. Emil chose to re-sync: copied the plugin's 9 library plans into `.catalogue/`, updated `.catalogue-sync.json` (hashes from the lock) and SYNC.md; `catalogue-status` reports all current. PROGRESS: L05 to L07 now `plan-ready`, L05 `in-progress`.
- **Conflict settled by Emil:** L05 decision 4 (own label) over ADR-0011's L05 note (FormField binding). Recorded as ADR-0012, which amends ADR-0011.
- **Scope (Emil):**
  - Claude writes, and Emil reviews.
  - `onCheckedChange` through `useControllableState`, with native `onChange` passed through. CONVENTIONS rule 5's exception narrowed to text-entry controls, and the L04 deviation 7 note corrected.
  - Screen readers: Narrator and NVDA.
  - Thumb under reduced motion: the duration scales, never the distance.
  - `className` / `style` on the row.
  - Group `required` is the message.
  - Group children use context, with a development warning when one has no `value`.

  All in scope-decisions § L05.

- **Did:**
  - Shared wiring: `useFormFieldControl` and `focusFirstInvalid` moved to `internal/`. New `internal/useFieldWiring` (ids, description and error state) and `internal/FieldError`. FormField now consumes them; its API is unchanged and its L04 tests pass as before.
  - Checkbox, CheckboxGroup (its own directory, which the layout checks require) and Switch: TSX, CSS, three contracts (automated run only), unit, type and browser tests, 30 stories, changeset.
  - ADR-0012; CLAUDE.md's locked-decisions row.
- **Verified:**
  - `pnpm check`.
  - `pnpm test`: tokens 32, react 390 of 393. The 3 failures are the contract gate: no keyboard or screen-reader runs yet.
  - build-storybook.
  - Firefox and WebKit: 126 browser tests (L05 and FormField).
- **Probes:** the indeterminate effect made to run once, the group's custom validity removed, and the input shrunk to the box each failed a test; all restored.
- **Next:**
  - Emil reviews the code.
  - Manual runs:
    - keyboard: Checkbox and Switch;
    - Narrator and NVDA: Checkbox (incl. Indeterminate, SelectAll), CheckboxGroup (RequiredSubmit, WithError), Switch;
    - forced colours: the three ForcedColors stories.
  - Then the `review-component` workflow.

## 2026-10-20 — L05: two findings from Emil's Narrator runs

- **"News emits invalid, the others don't"** (Emil, RequiredSubmit story). Reproduced:
  - The DOM was right: after a submit, all three boxes had `aria-invalid="true"`.
  - Chromium's accessibility tree was wrong. With no `aria-invalid` attribute, it reports native invalidity from page load: the group's custom validity message, an unchecked required checkbox, a text field holding a bad value. Only an empty required text field is held back, the one case L04's probe had tested, so L04's TextInput was affected too.
  - An explicit `"false"` overrides it (probed).
  - **Emil chose: always render `aria-invalid` `"true"` or `"false"`.** ADR-0013 records it; it amends ADR-0011 and L04 decision 1.
  - Changes: one line in `useFormFieldControl` (TextInput and Checkbox); Switch always renders `"false"`. Contracts and the useFieldWiring docs updated. About 15 assertions moved from "absent" to `"false"`.
  - New browser tests pin `"false"` on each natively invalid, untouched case. They check the attribute, since Vitest's browser mode has no CDP access; the accessibility tree was probed by hand. All probes deleted.
- **"Enter toggles a tab-focused box"** (Emil). Not reproduced: real key presses in the built Storybook, in Chrome, left all four stories unchanged. Emil confirmed it happens only with Narrator on: the screen reader turns Enter into a click. Not a component defect; nothing changed.
- **Verified:** `pnpm check`; `pnpm test`: tokens 32, react 393 of 396 (the 3 failures are still only the contract gate); browser 119/119; build-storybook.
- **Next:** Emil records the remaining manual results (the keyboard, Narrator and NVDA announcements, forced colours) for the contracts, then the reviewers. The commit Emil asked for was interrupted by the bug report; branch and commit on request.

## 2026-10-20 — L05 manual runs recorded

- **Emil:** keyboard OK (Checkbox, Switch); forced colours OK (all three ForcedColors stories); NVDA OK:
  - "required" is announced;
  - the mixed state is announced (Emil: "partially marked");
  - the Switch is announced as a switch;
  - nothing is announced invalid before a submit, and a failed submit announces it.
- **Recorded:**
  - keyboard runs (Checkbox, Switch); NVDA runs (all three, version not recorded); forced-colours runs (all three, method not stated);
  - the heard announcements, replacing "not yet heard";
  - evidence on 2.1.1, 2.4.7, 4.1.2, 1.4.11, 1.4.1 and 3.3.1.

  Narrator's L05 run found the ADR-0013 bug and wasn't repeated, so it isn't recorded as a pass. Not reported, and left as expected text: entering the group, and the switch's toggle announcement.

- **Verified:** `pnpm check`; `pnpm test`: tokens 32, react 396/396 (the contract gate passes).
- **Next:** the `review-component` workflow for Checkbox, CheckboxGroup and Switch (Emil's opt-in), then triage. Commit on a branch when Emil asks.

## 2026-10-20 — L05: NVDA group and switch readings

- **Switch** (NVDA in Danish, Chrome): "Wi-Fi, switch, til", then "fra" / "til" on each toggle; the name isn't repeated. Recorded in the contract.
- **Group:** the first reading missed the legend because focus crossed the Storybook frame boundary. Entered from outside (Shift+Tab from Subscribe), NVDA read "Topics, gruppering, News, check box, ikke markeret, ugyldig indtastning", but **never the group's error**. Chromium exposed it correctly (probed: the group named "Topics" and described by the error), so NVDA doesn't read a group's description.
- **Fix (Emil):** the error now describes every checkbox, and the fieldset keeps only its description. Scope deviation 6 replaces decision 13's fieldset-only rule and resolves open question 2. Unit and browser tests updated. Not yet re-heard.
- **Verified:** typecheck, lint; unit 216/216; L05 browser 43/43.
- **Next:** Emil re-hears WithError (each box should now read the message), then the reviewers. Commit on request.
- **Re-heard (Emil, NVDA):** with the error on each box, NVDA now reads the group's message after "ugyldig indtastning". Contract and scope deviation 6 updated.

## 2026-10-20 — L05 review: triaged and applied

- **Reviewers:** the `review-component` workflow (API, accessibility, platform) over Checkbox, CheckboxGroup, Switch and the shared wiring. 18 findings, 14 distinct.
- **Triage with Emil (three batches):** accepted 14, rejected 0, escalated 0. No `OVERRIDES.md` rows. Details in scope-decisions § L05, "Review (2026-10-20)".
- **Probes:** four breaks (host on the first box, narrow effect dependencies, no group reset, no Switch clamp) each failed its new browser test; all restored.
- **Verified:** `pnpm check`; `pnpm test`: tokens 32, react 415/415; build-storybook; Firefox and WebKit 152/152 (L05 and FormField browser tests).
- **Also this session:** lessons from L03 to L05 fed into the planner repo (branch `feedback/library-l03-l05`, uncommitted): a field report, revised L02/L04/L05 plans, the wcag-auditor and component-api-reviewer agents, and implement-module rules 35 to 40.
- **Next:** Emil re-hears the group description with NVDA (each box should now read it). Then mark L05 done, and commit both repos on request.

## 2026-10-20 — L05 done

- **Re-heard (Emil, NVDA):** each box in WithDescription reads the group's description ("News, check box, ikke markeret, Choose what we write to you about."). Recorded in the contract and scope decisions.
- **Acceptance:** every L05 criterion is met. Deviations: scope-decisions § L05, 1 to 7. Review: 14/14 accepted.
- **Verified:** `pnpm check`; `pnpm test`: tokens 32, react 415/415; build-storybook; Firefox and WebKit.
- **Next:** commit on `feature/checkbox-switch-L05`, then a PR. L06 (Dialog) is next.

## 2026-10-20 — L06: Dialog and AlertDialog written for review

- **Housekeeping:** L05 was already merged (PR #4). Branched `feature/dialog-L06` from main. Re-synced L02, L04 and L05 (`updated-upstream`: the L03 to L05 lessons coming back), and `catalogue-status` now reports all current.
- **Open question 1:** support data re-checked on webstatus.dev with nothing changed. `closedby` and overscroll containment still have no Safari entry, and `overlay` is Chromium-only.
- **Scope (Emil):** Claude writes, Emil reviews. Vitest browser mode instead of `apps/docs/e2e`. Claude drafts the new tokens. ADR-0015 adopted as senui ADR-0014. Public API: no trigger prop, a `footer` slot, an `action` slot, and a `'cancel'` reason. All in scope-decisions § L06.
- **Tidy (Emil, mid-session):** `internal/` grouped by concern, committed on its own (`4b25c64`), with typecheck and unit tests run on the staged tree alone.
- **Written:** `internal/dialog/` (`useModalDialog`, `ModalDialog`), Dialog, AlertDialog, CSS, contracts, type, unit and browser tests, stories, custom Playwright commands, tokens, and a changeset.
- **Browser runs found:**
  - a product bug: the sticky-header padding was measured while the dialog was scaled;
  - a product bug: the "first focusable" lookup used `checkVisibility()`, which is false before `showModal()`;
  - a spurious finalFocus warning on unmount;
  - three test bugs: computed styles mid-transition, Playwright's hover scrolling the page, and a 120 ms exit falling between two polls;
  - two dead tests, found by probing (the exit wait, and the Esc veto).

  Cross-engine runs found WebKit's no-focus-on-click (a known issue in both contracts) and a 2 to 3 px focus-scroll shortfall.

- **Verified:** `pnpm check` (warnings only: the import-only false positive); `pnpm test`: tokens 32, react 522/524, with only the contract gate failing (no keyboard or screen-reader runs); dialog browser tests in Chromium, Firefox and WebKit, 126/126; build-storybook; the invariant greps.
- **Next:** Emil reviews the code and the API calls Claude made on its own (scope-decisions § L06, "Public API"). Then Emil's keyboard, NVDA and forced-colours runs, then the reviewers.

## 2026-10-20 — L06: Emil's four answers applied

- **Emil took every recommendation.** No `OVERRIDES.md` rows.
- **1. ADR-0015 amends ADR-0009:** `rem` is allowed in size media features only. Stylelint 17's `unit-allowed-list` can't scope a unit to media queries, so three built-in rules do it together (allow-list, `declaration-property-unit-disallowed-list`, `media-feature-name-unit-allowed-list` with a catch-all). Probed: `rem` in a declaration, a custom property, a `calc()` or a non-size feature is rejected, and size features pass. The Dialog.css disable is gone.
- **2. `AlertDialog.css` imports `Dialog.css`** (plain, not `layer()`: a `layer()` import would nest the rules in a sub-layer). `check-component-css.mjs` allows that one form; four bad forms were probed and rejected. A new `AlertDialog.browser.test.tsx` loads the file alone and checks the width and the layer tree; probes with `layer()` and with no import both fail it. The "load both" wording is gone from the contract, the JSDoc and the changeset.
- **3. Safari focus return:** a once-per-document `pointerdown` listener remembers the pressed control, used when focus is on `<body>` or on the parent dialog at open and the press is under a second old. `restoreFocus` now focuses a connected trigger even after WebKit's native return lands on the outer dialog. New mouse-path tests pass in all three engines; without the fallback they fail in WebKit. The known issue now covers only a dialog mounted after the click, or opened more than a second later.
- **4. Claude's own API choices:** kept as written (scope-decisions § L06, "Public API").
- **Verified:** `pnpm check` (the import-only warnings only); `pnpm test`: tokens 32, react 526/528 (the contract gate only); Dialog and AlertDialog browser tests in Chromium, Firefox and WebKit, 138/138.
- **Next:** Emil's keyboard, NVDA and forced-colours runs on Dialog and AlertDialog (record them in both contracts), then the `review-component` workflow and triage.

## 2026-10-21 — L06: focus ring moved onto the border

- **Found by Emil** (Chrome, 100 %, keyboard-opened): the sticky header painted over the inner pixel of the dialog's inset focus ring. Headless runs in all three engines (100, 125 and 150 % zoom) didn't reproduce it.
- **Fix:** the ring starts at the padding edge (`outline-offset` of minus the border width), so nothing inside the dialog can cover it. In fullscreen, a transparent border as wide as the ring holds it. This is scope deviation 11. A new browser test pins the geometry, and a probe with the old value fails it.
- **Verified:** `pnpm check`; Dialog and AlertDialog browser tests in three engines, 144/144; unit tests, with only the contract gate failing.
- **Next:** Emil re-checks the ring in Chrome, then the keyboard, NVDA and forced-colours runs.

## 2026-10-21 — L06: footer Cancel aligned with AlertDialog

- **Found by Emil:** a Cancel in Dialog's `footer` didn't close the dialog, while AlertDialog's did.
- **Decision (Emil):** an optional `cancelLabel` on Dialog. The Cancel button now lives in `ModalDialog`, so Dialog and AlertDialog render the same one: first in the footer, secondary, closing with reason `'cancel'`. Footer actions still close themselves through `open`. AlertDialog's internal part class `__cancel` became Dialog's `.senui-dialog__cancel`.
- **Verified:** typecheck; unit 66/66 for Dialog and AlertDialog (a probe that removes Cancel's close fails both Cancel tests); browser 144/144 in three engines.

## 2026-10-21 — L06: keyboard and NVDA runs recorded

- **Emil:** the focus ring is fine in Chrome. Keyboard and NVDA pass on Dialog and AlertDialog: the title, description, content and action buttons are read.
- **Recorded in both contracts:**
  - a keyboard run (Chrome) and an NVDA run (Chrome, NVDA version not recorded), both 2026-10-21;
  - keyboard evidence on 2.1.1, 2.1.2, 2.4.3 and 2.4.7, and screen-reader evidence on 4.1.2 and 1.3.1;
  - the on-open announcement as heard (exact wording not recorded).

  Not reported, so still marked "expected": the announcement on close. Chrome version and OS are taken from the L05 runs on the same machine.

- **Verified:** `pnpm check`; `pnpm test`: tokens 32, react 533/533. The contract gate passes.
- **Next:** forced-colours checks of both ForcedColors stories, then the `review-component` workflow (Emil's opt-in) and triage.

## 2026-10-21 — L06: forced colours recorded

- **Emil:** both ForcedColors stories pass in Chrome with forced colours emulated: the dialog border and the keyboard focus ring are visible.
- **Recorded:** a forced-colours run in both contracts, and as evidence on 1.4.11.
- **Acceptance:** every L06 criterion is now met except "Pair mode: review workflow run, findings triaged, overrides logged".
- **Next:** the `review-component` workflow for Dialog and AlertDialog (Emil's opt-in), then triage.

## 2026-10-21 — L06 review: triaged and applied

- **Reviewers:** the `review-component` workflow (API, accessibility, platform) over Dialog, AlertDialog and `internal/dialog/`. 14 findings, 10 distinct. All three reviewers found the same major issue, the unreported forced close.
- **Triage with Emil (two batches):** accepted 10, rejected 0, escalated 0. No `OVERRIDES.md` rows. Details in scope-decisions § L06, "Review (2026-10-21)".
- **Probes:** each fix's test fails against the old code (the forced report, the fullscreen tokens, the short-viewport padding). The double-Esc test can't prove a forced close in headless Chromium and is recorded as a consistency check.
- **Emil's Speech Viewer output** for AlertDialog, recorded word for word. A CDP probe confirms Chromium exposes `alertdialog`; NVDA in Danish says "dialog".
- **Verified:** `pnpm check`; `pnpm test`: tokens 32, react 552/552; Dialog and AlertDialog browser tests in three engines, 165/165; build-storybook.
- **Next:** Emil's NVDA version, and a Speech Viewer reading of Dialog's close (focus back to the trigger). Then mark L06 done and commit on request.

## 2026-10-21 — L06 done

- **Emil:** NVDA 2026.2 (2026.2.0.57764). Dialog Speech Viewer reading: on open "Edit profile", then "overskrift niveau 2 Edit profile", "knap Close" and the body; on close "Open dialog knap" (focus back on the trigger). Recorded word for word in Dialog's contract, and the NVDA version in both.
- **Acceptance:** every L06 criterion is met. Deviations: scope-decisions § L06, 1 to 11. Review: 10/10 accepted, no overrides. Not heard: the `finalFocus` announcement (browser-tested only).
- **Next:** commit on `feature/dialog-L06` and open a PR when Emil asks. L07 (EmptyState) is next.

## 2026-10-26 — Package names, and npm publishing deferred to L10

- **Publishing (Emil):** keep the module order. Publish after L07 to L10; L10 (not yet planned upstream) builds the release pipeline first. Gaps found while checking are in the checkpoint: no npm login on this machine, no LICENSE in the packages, no `repository`/`homepage`/`bugs`.
- **Renamed (Emil):** `@senakster/react` → `@senakster/senui`, `@senakster/tokens` → `@senakster/senui-tokens`, in every live file: manifests, imports, the CSS import, CI, CLAUDE.md, CONVENTIONS, READMEs and the pending changesets. History files keep the old names. The lockfile was regenerated with `pnpm install`.
- **Verified:** `pnpm check`; `pnpm test`: tokens 32, react 552; build-storybook.
- **Next:** L07 (EmptyState).

## 2026-10-26 — L07: EmptyState written for review

- **Orient:** L07's plan is current; L02 and L06 have newer plans upstream (both done, no re-sync). Local `main` was behind: PR #6 (the rename) was already merged, so the branch `feature/empty-state-L07` starts from `origin/main`.
- **Scope (Emil):** Claude writes, Emil reviews. `rem` breakpoint through ADR-0016. New `size.illustration.*` tokens. Gates as in L03 to L06. Public API: a 30rem breakpoint; the compact layout puts the illustration beside the text; a development warning for an empty title; `description` is a `ReactNode` in a `<p>`; no `role` (Emil: "roles are context dependent, components are intended to be independent"); `aria-label` and `aria-labelledby` typed `never`. See scope-decisions § L07.
- **L02 defect found:** Stylelint checks no unit inside an `@container` condition (a probe passed `px`, `em` and `ch`). ADR-0016 extends ADR-0015 to size container features, and `check-component-css.mjs` enforces it, along with the `senui-` container name. Probed with 14 forms.
- **Written:** `EmptyState.tsx`, `.css` (13 `--senui-empty-state-*` tokens), `.a11y.ts`, `.test.tsx`, `.test-d.tsx`, `.browser.test.tsx`, `.stories.tsx` (13 stories), `.changeset/add-empty-state.md`; tokens `size.illustration.sm/lg`; `firstFocusable` moved to `internal/dom/focusable.ts`.
- **Probes:** type tests (loosened types trip six `@ts-expect-error`s); unit and browser, one behaviour broken at a time: tabIndex, aria-hidden, focus grabbed on mount (caught in jsdom and by the no-results story), breakpoint moved, focus not moved after delete. `inline-size: auto` was not caught, because the table-cell story gives its cell a width; two new tests (start-aligned grid, flex row) now catch it.
- **Verified:** `pnpm check`. `pnpm test`: tokens 32; react 633/634, with only the contract gate failing (no keyboard or screen-reader run yet). EmptyState browser tests 23/23 (Chromium). build-storybook. The step 2b invariant greps hold.
- **Next:** Emil reviews the code and the new tokens. Then Emil's keyboard, NVDA and forced-colours runs, recorded in the contract, and then the `review-component` workflow.

## 2026-10-26 — L07: NVDA and forced-colours runs

- **Emil's NVDA run** (Speech Viewer, NVDA in Danish, Chrome 155): NoData read line by line ("overskrift niveau 2 No projects yet", the description, "knap Create project"; nothing from the illustration); heading navigation ("No projects yet overskrift niveau 2"); a script-focused heading in FocusVisible (same wording); NoResults at 300 ms ("No results for “x”", then "“xy”", then "“xyz”", with focus staying in the field). Recorded word for word in the contract, with screen-reader evidence on 1.3.1, 2.4.6, 4.1.3 and 4.1.2. NVDA version recorded as reported ("2026.37155"), to be confirmed.
- **Tab-only readings** ("Create project knap") are focus mode by design: the heading and description aren't focusable. Storybook's frame announcements are the iframe artefact (rule 37).
- **DeletedLastItem:** under NVDA, Space on Delete "did nothing". Real key presses in Chromium (Playwright) delete and move focus for both Space and Enter, now a browser test. Not yet explained; Emil to repeat with NVDA off (the keyboard run) and with Enter under NVDA.
- **Debounce (Emil):** at 300 ms, NVDA read every intermediate result, so the NoResults story now waits 1,000 ms (`STATUS_DEBOUNCE_MS`), and the contract tells consumers to update the status once typing pauses for about a second. Not yet heard at 1,000 ms.
- **Forced colours (Emil):** fine. Recorded, with forced-colours evidence on 1.4.11.
- **Verified:** typecheck, ESLint; EmptyState browser tests 25/25; unit tests, where only the contract gate fails (no keyboard run).
- **Next:** the keyboard run, the NVDA version, NoResults at 1,000 ms; then the `review-component` workflow.

## 2026-10-26 — L07: keyboard run

- **Emil's keyboard run** (NVDA off, Chrome): DeletedLastItem by keyboard leaves the item deleted, the status shown and focus, with its ring, on "Create report" (screenshot). Recorded, with keyboard evidence on 2.1.1, 2.4.3 and 2.4.7.
- **Story fix:** the status paragraphs in NoResults and DeletedLastItem rendered in the browser's default serif; they now use the sans token.
- **Verified:** `pnpm check`; `pnpm test`: tokens 32, react 636/636. The contract gate passes.
- **Next:** the NVDA version, NoResults re-heard at 1,000 ms, then the `review-component` workflow (Emil's opt-in).

## 2026-10-26 — L07: keyboard run withdrawn; play functions removed

- **Correction:** the keyboard run recorded in the previous entry is withdrawn. Emil's Speech Viewer showed "Component test is rendering / running / completed successfully": Storybook runs a story's play function when the story opens, so DeletedLastItem had already deleted the item and focused "Create report" (which has no handler, hence "Space or Enter does nothing"). The screenshot showed that end state, not a keyboard run. NoResults' play function had likewise typed "xyz", so Emil's "1,000 ms is ok" may not have been hand typing.
- **Fix:** no play functions on NoResults and DeletedLastItem; the browser tests already drive both with real keys. FocusVisible keeps its play function, since showing that state is the story's point. The 300 ms reading stays: its intermediate results show Emil's own typing.
- **Recorded:** NVDA 2026.3 (2026.3.0.58174). Keyboard evidence removed from 2.1.1, 2.4.3 and 2.4.7.
- **Lesson for the planner (rule 37):** a story with a play function can't host a manual run; the reader announces the play function's steps as "Component test …". Stories meant for manual runs open in their start state.
- **Verified:** typecheck, ESLint; EmptyState unit and browser tests pass; only the contract gate fails (no keyboard run).
- **Next:** Emil's keyboard run and NoResults at 1,000 ms, in a reloaded Storybook.

## 2026-10-26 — L07: DeletedLastItem heard with NVDA

- **Emil's NVDA run** on the play-free DeletedLastItem: focus on "Delete Quarterly report", then "Quarterly report deleted", "Create report knap", "Quarterly report deleted". Space or Enter now works; the earlier "does nothing" was the play function. Recorded as a consumer-owned focus-move announcement. The status is read twice, before and after the focus move; that is the app's status region and focus move, not EmptyState.
- **Still owed:** the keyboard run with NVDA off (a reader turns keys into clicks, so this run doesn't count as one), and NoResults at 1,000 ms by hand.

## 2026-10-26 — L07: keyboard run, and NoResults at 1,000 ms

- **Emil's keyboard run** (NVDA off, Chrome, play-free stories): DeletedLastItem by Space and by Enter deletes the item and moves focus to "Create report" (Space shows the native pressed state, Enter clicks on key-down); NoResults keeps focus in the field. Recorded, with keyboard evidence on 2.1.1, 2.4.3 and 2.4.7.
- **NoResults with NVDA at 1,000 ms**, typing by hand: "x", "y", "z", then one "No results for “xyz”". Recorded in the contract.
- **Verified:** `pnpm check`; `pnpm test`: tokens 32, react 636/636 (the contract gate passes); build-storybook.
- **Next:** the `review-component` workflow (Emil's opt-in) and triage.

## 2026-10-26 — L07 review: triaged and applied

- **Reviewers:** the `review-component` workflow (API, accessibility, platform) over `components/EmptyState`. 14 findings, 13 distinct; the API and accessibility reviewers both found `tabIndex` on the root.
- **Triage with Emil (three batches):** accepted 13, rejected 0, escalated 0. No `OVERRIDES.md` rows. Details in scope-decisions § L07, "Review (2026-10-26)", A to M.
- **Applied:** `actions` is `ReactElement | undefined` with a no-focusable warning; `tabIndex`, `aria-describedby`, `aria-description` and `aria-roledescription` are `never`; the illustration wrapper is inert; empty descriptions render nothing; a fourteenth token (description font size); illustrations of any shape fit the box; the warnings follow value changes; DeletedLastItem sets its status after the focus move; the contract has `name: 'none'` (new in L02's contract type and check), `forcedColors: 'no-states'`, 2.1.1 and 1.4.10 as "enables", and the inline-margin note.
- **Probes:** each fix's test fails against the old behaviour (inert, status order, object-fit, empty description, title check on mount only, no actions warning). A `> *` sizing rule from the review wasn't needed by any test, a `<picture>` included, and was dropped.
- **Verified:** `pnpm check`; `pnpm test`: tokens 32, react 648/648; EmptyState browser tests 30/30; build-storybook.
- **Next:** Emil re-hears DeletedLastItem with NVDA (the status should now be read once, after "Create report knap"); then L07 is done and committed on request.

## 2026-10-27 — L07 done

- **Emil's NVDA re-check** of DeletedLastItem after review fix M: "Create report knap", then "Quarterly report deleted" once. Recorded in the contract.
- **ADR-0016's container-name rule (Emil):** kept, as recommended, with a declared-name check: a queried `senui-` name must be declared in the same stylesheet, so a misspelled name fails instead of silently never matching. ADR-0016, the script header and CLAUDE.md say so. Probed: a typo and an undeclared name fail; `container:` and a `container-name` list pass.
- **Acceptance:** every L07 criterion is met. Review: 13 accepted, 0 rejected, 0 escalated; no overrides. Deviations and review fixes: scope-decisions § L07.
- **Verified:** `pnpm check`; `pnpm test`: tokens 32, react 648/648; build-storybook; the step 2b invariant greps.
- **Next:** commit on `feature/empty-state-L07` and open a PR when Emil asks. L08 (test and a11y gate) is next and has no plan upstream yet.

## 2026-10-27 — Decision index: nine scope rows fixed; L07 field report

- **`catalogue-next` flagged five records it couldn't parse:** five L05 rows whose Decision cell stated the choice without `in`/`out` (the file's own format contract requires one), so they had status `other` and no filter showed them. Prefixed with `in:` (one as `in (resolved):`). Four more rows (L02 ref forwarding and contract staleness, L06 and L07 screen-reader runs) got `in` only from an incidental word in their prose; also prefixed. After a rebuild: no `other`, no incidental matches.
- **Field report for the planner:** `modular-website-planner/docs/field-reports/2026-10-27-library-l07-senui.md` (proposals only; nothing applied to the plugin).

## 2026-10-27 — L08 started: plan, re-sync, PR 1 (harness, axe, semantics)

- **Plan:** written in the planner with Emil (`2744c03`, then `14c0cd9 refined` after the `wcag-auditor` and `modern-web-curator` reviews: 21 findings, all adopted, plus Emil's calls on a React 18.3 job and the `essentialMotion` contract field). Re-synced into `.catalogue/`; all 10 plans current.
- **Scope (Emil):** Claude edits component folders where the gate needs it, each listed; defects found are fixed in L08; four PRs. Recorded in scope-decisions § L08.
- **PR 1 built:** the Storybook preview imports the package's built stylesheet (development aliases it to the source; production gets a `senui-css` marker); `apps/docs/playwright.config.ts`; `gate/stories.ts` (index, contracts, render wait through the channel plus finite animations); `gate/axe.spec.ts`; `gate/semantics.spec.ts`; exceptions (`exceptions.json`, `exceptions.ts`, bookkeeping spec); `pnpm test:gate`; a CI step; CONVENTIONS § "The a11y gate"; `@playwright/test` 1.64.0 and `@types/node` 24.9.2 in the docs app.
- **Found:** 61 dark-theme contrast failures were one harness gap (no page background in the preview; L00 defect, fixed in `preview.css`). Two dialog stories hit an axe limitation (incomplete contrast on a sticky title in a scrolling dialog, no obscuring element): dated exceptions for `color-contrast:incomplete` only. A mid-animation measurement was fixed by waiting for finite animations.
- **Probes:** a dist-only contrast defect (fails light only), a new unannounced story (throwing play, `console.error`, image without `alt`), Switch's contract without its role, an expired exception, and a missing CSS marker each fail. One probe first ran no test at all (a `-g` that matched nothing) and was redone.
- **Verified:** `pnpm check`; `pnpm test` (tokens 32, react 648); `pnpm test:gate` 351/351 in Chromium; the development alias resolves to the source CSS.
- **Next:** commit PR 1 on `feature/a11y-gate-L08` and open it when Emil asks; then PR 2 (target size, reflow, text spacing, motion and its ADR, RTL, tab walk, ring, resets).

## 2026-10-27 — L08 PR 2: the contract-derived checks

- **Branch:** `feature/a11y-gate-L08-2` from `main` after PR #8 merged (CI green on Linux in 12 min 9 s, of which the gate took 2 min 20 s and installing Chromium 8 min 17 s).
- **Contract:** ADR-0017 adds `adaptation.essentialMotion` (amends ADR-0008, whose revisit trigger fired on Button's spinner). The type allows it only with `motion-factor`; type-tested. Button declares it.
- **Static RTL:** Stylelint rejects physical inline properties, `text-align: left|right`, and four-value shorthands; probed both ways (20 forms).
- **Gate:** `adaptation.spec.ts`, `motion.spec.ts`, `tab-walk.spec.ts` and `resets.spec.ts`, with in-page helpers in `gate/browser/measure.js`. The reset fixtures are written in-house (the brand-name rule).
- **Found:**
  - Switch's thumb didn't mirror in a production build: Vite lowers `:dir()` to `:lang()`. Emil chose a logical property, ADR-0018 and a Stylelint guard. Recorded under L05.
  - Harness bugs, each fixed before trusting a result: a reflow clip that fell back to the viewport; a settle wait that hung on infinite animations; a spinner measured at different angles; nested components judged by the outer contract; a hit test used as paint order; a boundary check on non-controls; a transparency test that read opaque black as transparent.
- **Probes (decision 15):** batch A (ten built-CSS defects plus four probe stories) and batch B (`spacing-exception`, `not-a-target`, the `!important` ring) each fail for their own reason.
- **Windows:** `net::ERR_NO_BUFFER_SPACE`, then `net::ERR_ADDRESS_IN_USE`, on single stories in full local runs (local ports exhausted). A story whose only errors are those OS socket failures loads once more; any other error, or the same twice, fails (probed three ways). Four workers did not prevent it and were dropped.
- **Verified:** `pnpm check`; `pnpm test`: tokens 32, react 649 (two Switch browser tests now read the thumb margin, not `translate`); `pnpm test:gate` 1264 passed, 104 skipped (RTL on non-mirroring components, full motion on motion-factor ones), 7.8 min locally.
- **Next:** commit PR 2 and open it when Emil asks; then PR 3 (forced colours, container, workflows).
