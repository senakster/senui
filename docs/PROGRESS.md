# Progress

Authoritative module status for senui. Plans are vendored (gitignored) in `.catalogue/library_catalogue/`.

Status legend — plan: `plan-ready` · `not-planned` (plan not written yet upstream); implementation: `not-started` · `in-progress` · `done`.

| #   | Module                            | Plan                          | Plan status | Implementation | Last updated |
| --- | --------------------------------- | ----------------------------- | ----------- | -------------- | ------------ |
| L00 | Workspace, harness & CI           | L00-workspace-and-harness     | plan-ready  | done           | 2026-10-15   |
| L01 | Design tokens                     | L01-design-tokens             | plan-ready  | done           | 2026-10-16   |
| L02 | Component API conventions         | L02-component-api-conventions | plan-ready  | done           | 2026-10-16   |
| L03 | Button                            | L03-button                    | plan-ready  | done           | 2026-10-18   |
| L04 | FormField + TextInput             | L04-formfield-and-textinput   | plan-ready  | done           | 2026-10-19   |
| L05 | Checkbox / Switch                 | L05-checkbox-and-switch       | plan-ready  | done           | 2026-10-20   |
| L06 | Dialog                            | L06-dialog                    | plan-ready  | done           | 2026-10-21   |
| L07 | EmptyState                        | L07-empty-state               | plan-ready  | done           | 2026-10-27   |
| L08 | Test & a11y gate                  | L08-test-and-a11y-gate        | plan-ready  | done           | 2026-10-27   |
| L09 | Docs & machine-readable manifest  | —                             | not-planned | not-started    | 2026-10-15   |
| L10 | Release, versioning & deprecation | —                             | not-planned | not-started    | 2026-10-15   |
| L11 | Motion                            | —                             | not-planned | not-started    | 2026-10-15   |

## Changelog

- **2026-10-27** — L08 done. PR 4 merged as #11.
  - **On `main`:** the three-engine gate passed (3,918 tests, 33 min 46 s), and the first `react-18` CI run passed (886/886 on React 18.3.1).
  - **PR gate budget (Emil):** the gate step is held to 10 min, from 8 min 41 s on #11. It has a 15-min timeout against hangs.
  - **Acceptance criteria:** all met. The narrowings are in scope-decisions § L08.

- **2026-10-27** — L08, PR 4 of 4: SSR and hydration, React 18.3, keyboard traceability. Built, not yet committed.
  - PR 3 merged as #10. On `main` its CI passed. The first three-engine gate failed 5 of 3,918, from two harness defects and one story's raw button, all fixed here.
  - **Traceability:** `check-keyboard-trace.mjs` (in `check:components`) traces all 22 contract keys to key-titled browser tests. Switch has its own browser test file now.
  - **SSR:** a Vitest `ssr` project renders every story in Node; the browser project hydrates the markup from the same run.
  - **React 18.3:** a job in `gate-full.yml` runs the package's tests on 18.3 and asserts the version inside them.
  - **Found by 18.3:** `useControllableState` set state during render on a controlled mount, which shifted descendants' hydration ids. Fixed under L02.
  - **Review:** `component-api-reviewer`, 18 findings, all accepted. The TextInput Home/End row on macOS is deferred to L04.
  - **Verified:** `pnpm check`; `pnpm test`: tokens 32, react 886, and the same 886 on React 18.3; `pnpm test:gate` 1378 passed, 122 skipped; the failing stories in three engines in the pinned image.

- **2026-10-27** — L08, PR 3 of 4: forced colours and the pinned container.
  - The nine forced-colours stories carry a `forced-colors` tag instead of a parameter. The gate screenshots them in light and dark (Chromium, forced colours emulated), and runs the ring and boundary checks under forced colours on every story.
  - A component that keeps states visible by border or system colour must have such a story.
  - CI's `verify` job runs in the pinned `playwright:v1.64.0-noble` container, so no browser install. A new `gate-full.yml` runs all three engines on `main`, nightly and on demand. `update-snapshots.yml` regenerates the baselines, on demand or when a pull request is labelled `update-snapshots`.
  - **Probes:** a ring lost only in forced colours fails, and a missing tag fails bookkeeping. The 18 baselines, generated in the pinned image under Docker, reproduce in a fresh container, and a checked checkbox drawn as unchecked fails both Checkbox screenshots. Light and dark differ, so both are kept.
  - **Verified:** `pnpm check`; `pnpm test`: tokens 32, react 649; `pnpm test:gate` 1378 passed, 122 skipped (18 of them screenshots, which run only in the container).

- **2026-10-27** — L08, PR 2 of 4.
  - **New gate checks, all derived from each contract:**
    - target size at 1280 and 320 px (`min-24`, `spacing-exception`, `not-a-target`);
    - reflow at 320 px and WCAG's text-spacing overrides;
    - motion, recorded from first paint and judged by the owning component's contract;
    - RTL mirroring, statically (Stylelint rejects physical properties) and at runtime (boxes and pseudo-element offsets flip with `<html dir>`);
    - a tab walk at two viewports: focus-visible, not hidden, named, not covered, a real ring at 3:1, and control boundaries at 3:1;
    - the ring against two in-house consumer resets, plus the two resets the docs say remove it.
  - **ADR-0017:** a new contract field, `adaptation.essentialMotion`, declared by Button for its spinner.
  - **ADR-0018:** no `:dir()` in component CSS. The runtime RTL check found that Vite's default build rewrites it to a `:lang()` list, so Switch's thumb didn't mirror in production. Switch now moves the thumb with `margin-inline-start` (an L05 defect, fixed).
  - **Probes:** every check fails on its probe, including the unused `spacing-exception` and `not-a-target` values. One probe found a bug in the reset check (opaque black read as transparent), fixed and re-probed.
  - **Windows:** a story that fails only on an OS socket error loads once more.
  - **Verified:** `pnpm check`; `pnpm test`: tokens 32, react 649; `pnpm test:gate` 1264 passed, 104 skipped.

- **2026-10-27** — L08 in progress, PR 1 of 4.
  - **Planning:** the L08 plan was written with Emil in the planner, reviewed by `wcag-auditor` and `modern-web-curator` (21 findings, all adopted), and synced.
  - **Scope (Emil):** Claude edits component folders where the gate needs it, listing each edit; defects are fixed in L08; delivery is four PRs.
  - **What PR 1 adds:**
    - a Playwright gate over the **built** Storybook, styled by the package's **built** stylesheet; a marker proves the stylesheet, and development still loads the source CSS through an alias;
    - every story from `index.json`, waited on through Storybook's channel and its finite animations;
    - axe in light and dark with rendered contrast, where incomplete contrast fails too;
    - the contracts' `semantics` checks;
    - dated, expiring exceptions;
    - a CI step and `pnpm test:gate`.
  - **Defect found:** dark-theme stories had never been measured against a themed page (L00); fixed in the preview.
  - **Exceptions:** two, for an axe limitation on a scrolling dialog's sticky title (incomplete contrast only).
  - **Probes:** each new check fails on its probe.
  - **Verified:** `pnpm check`; `pnpm test`: tokens 32, react 648; `pnpm test:gate` 351/351.

- **2026-10-27** — L07 done. Every acceptance criterion is met. Emil's keyboard, NVDA 2026.3 and forced-colours runs are recorded word for word, including a re-check of Deleted last item after the review fix (the status is now read once). Review: 13/13 accepted. ADR-0016 also requires a container query's name to be declared in its own stylesheet, so a misspelled name fails `pnpm check` (Emil kept the `senui-` name rule). Deviations: scope-decisions § L07. `pnpm check`; `pnpm test`: tokens 32, react 648; build-storybook.

- **2026-10-26** — L07 reviewed. The three reviewers returned 13 distinct findings, and Emil accepted all of them (none rejected or escalated). Among the fixes:
  - `actions` must be an element, so text, `null`, `false` and arrays no longer type-check.
  - The root takes no `tabIndex` and no description attributes.
  - The illustration is inert.
  - The contract can now say an element has no name (L02's contract type and check).
  - Deleted last item sets its status after the focus move.

  Emil's manual runs are recorded: keyboard, NVDA 2026.3 (Speech Viewer, word for word) and forced colours. Two story defects came out of those runs. The 300 ms status debounce read every letter, so it is now 1,000 ms. And Storybook ran the play functions on load, so a manual run started from the end state; those two stories have no play function now. `pnpm check`; `pnpm test`: tokens 32, react 648/648; build-storybook. Waiting on one NVDA re-check of Deleted last item.

- **2026-10-26** — L07 in progress. Claude wrote EmptyState for Emil's review (Emil's choice, as in L03 to L06):
  - A plain `<div>` with a heading (`headingLevel` 2 to 6, required), a description `<p>`, a decorative illustration in `aria-hidden` and an actions slot. No role, no live region, and no focus moves; the heading has `tabindex="-1"` and a `headingRef`.
  - The layout follows a named container: compact (illustration beside the text) below 30rem, stacked and centred above.
  - Emil's API calls: `role` stays out (L02's rule), and `aria-label` / `aria-labelledby` are typed `never`. Also a development warning for an empty title.
  - ADR-0016 amends ADR-0015: `rem` in size container queries, and nothing else in an `@container` condition. Stylelint never checked those conditions, so `check-component-css.mjs` now does (an L02 guard gap, probed). New tokens `size.illustration.sm/lg`.

  `pnpm check` passes. `pnpm test`: tokens 32; react 633/634, where the only failure is the contract gate (no manual runs yet). Browser tests 23/23, with seven of eight probes caught and the eighth turned into two new tests. Storybook builds 13 EmptyState stories. Next: Emil's review, manual runs, then the reviewers.

- **2026-10-21** — L06 done. Every acceptance criterion is met. Dialog and AlertDialog passed Emil's keyboard, NVDA 2026.2 (Speech Viewer, exact speech recorded) and forced-colours runs, in Chrome. Review: 10/10 accepted. Deviations: scope-decisions § L06, 1 to 11. ADR-0014 (scroll lock) and ADR-0015 (`rem` in media queries). `pnpm check`; `pnpm test`: tokens 32, react 552; browser tests in three engines; build-storybook.

- **2026-10-21** — L06 reviewed: 10 distinct findings from the three reviewers, all accepted by Emil (none rejected or escalated). The browser's forced close is now reported (`'forced'`), controlled use needs `onOpenChange`, and AlertDialog's `action` must be an element. `hideCloseButton` needs another way out. Fullscreen ignores theme tokens, short viewports drop the scroll padding, and the missing type tests, stories and contract rows are added. Also this round: the focus ring moved onto the border (scope deviation 11), and Dialog gained `cancelLabel`. Keyboard, NVDA and forced-colours runs are recorded. `pnpm test` 552/552; browser 165/165 in three engines.

- **2026-10-20** — L06: Emil took all four recommendations. ADR-0015 lets `rem` into size media queries (amends ADR-0009), and no Stylelint disables remain. `AlertDialog.css` imports `Dialog.css`, so the per-component file works alone. A pointer-press fallback returns focus to a Safari click-opened trigger. Claude's own API choices are kept. Dialog browser tests 138/138 in three engines; react 526/528 (contract gate only).

- **2026-10-20** — L06 in progress. Claude wrote Dialog and AlertDialog for Emil's review (Emil's choice, as in L03 to L05):
  - Both are a native `<dialog>` opened with `showModal()`. Every close request is reported through `onOpenChange(open, { reason })`, so a controlled owner can refuse. A form close carries the submit button's value.
  - The exit animation runs on `data-state="closing"`. Focus return has a `finalFocus` fallback.
  - ADR-0014 adopts the planner's scroll-lock ADR: containment always, plus a scoped root lock.
  - New tokens: `color.bg.backdrop` and `size.dialog.*`.

  API calls by Emil: no trigger prop, a `footer` slot, AlertDialog's `action` slot, and a `'cancel'` reason. `internal/` is regrouped by concern in its own commit. The browser tests found a real bug (the sticky-header padding was measured while the dialog was scaled), and two dead tests that probing exposed. `pnpm check` passes. `pnpm test`: tokens 32, react 522/524. Only the contract gate fails (no manual runs yet). The dialog browser tests pass in Chromium, Firefox and WebKit (126). Storybook builds. Next: Emil's review, manual runs, then the reviewers.

- **2026-10-20** — L05 done. Every acceptance criterion is met. Emil's keyboard, NVDA and forced-colours runs are recorded (Narrator's run found the defect behind ADR-0013 and wasn't repeated). Those runs led to three changes:
  - ADR-0013: form controls always render `aria-invalid`, because Chromium otherwise announces native invalidity on page load. This also fixes L04's TextInput.
  - The group's error and description now describe each box, because NVDA never reads a fieldset's description. Re-heard by Emil.
  - The Narrator Enter-click finding was not a defect.

  The review's 14 findings were all accepted and applied: the group-rule host, form reset, controlled-only `indeterminate`, hover tokens, size clamps, warnings, tests and contracts. `pnpm check`; `pnpm test` (tokens 32, react 415); build-storybook; Firefox and WebKit. Lessons fed back to the planner (field report, plans, agents, skill).

- **2026-10-19** — L05 in progress. Plans re-synced: L05 to L07 are now `plan-ready`. Claude wrote Checkbox, CheckboxGroup and Switch for Emil's review:
  - All three are native checkboxes with own labels.
  - The indeterminate state is the DOM property.
  - The group is a fieldset with `required="<message>"`.
  - Switch uses `role="switch"`, and its thumb jumps instead of sliding under reduced motion.

  FormField's wiring now lives in shared internal hooks (API unchanged). ADR-0012 amends ADR-0011: binary controls own their label. `pnpm check` passes. `pnpm test`: react 390/393, with only the contract gate (manual runs) failing. Browser tests also pass in Firefox and WebKit.

- **2026-10-19** — L04 done, merged as PR #3. Every acceptance criterion is met, with the plan's `:user-invalid` styling and context wiring replaced by ADR-0011. Emil re-checked read-only in forced colours. TextInput keeps native `value` / `onChange`; CONVENTIONS rules 5 and 11 now say a wrapped native control keeps its native callbacks. `pnpm check`; `pnpm test` (tokens 32, react 265); build-storybook.
- **2026-10-19** — L04 reviewed: 17 decisions from the three reviewers. Emil accepted 16, rejected none and escalated one. Every fix is applied, including:
  - submit focus reaches a field whose only error is the `error` prop;
  - a native error clears when code sets a valid value;
  - native messages stay out of the live region;
  - FormField's spacing no longer depends on stylesheet order;
  - `error` can't be `true`, and FormField's root takes no control ARIA props;
  - development warnings for an unused or reused binding and an empty label;
  - read-only shows in forced colours.

  The escalation became ADR-0011: invalid is styled from `aria-invalid` only, and controls bind through a sealed render prop. It amends ADR-0001. The browser tests also pass in Firefox and WebKit (`SENUI_BROWSERS`). Manual runs by Emil: keyboard, Narrator and forced colours. `pnpm test`: react 265/265. Waiting on a read-only forced-colours re-check.

- **2026-10-18** — L04 in progress: FormField, TextInput and `focusFirstInvalid` written by Claude for Emil's review. Three plan deviations, each Emil's call:
  - FormField binds its control through a sealed render-prop binding, `{(field) => <TextInput field={field} />}`, so the name requirement holds at the type level. Context couldn't satisfy the plan's type test.
  - Invalid styling stays `[aria-invalid="true"]` only. A probe showed Chromium styles `:user-invalid` while the accessibility tree reports valid. Native errors instead sync into `aria-invalid` and the field's message on a submit attempt, and stay until the value is valid.
  - The live region is opt-in.

  `pnpm check` passes. `pnpm test` passes except the intended contract gate: no keyboard or screen-reader runs yet. Storybook builds 12 FormField and 13 TextInput stories. Next: Emil's review, manual runs, then the reviewers.

- **2026-10-18** — L03 done. Button meets every acceptance criterion except dedicated hover/active stories (they need a pseudo-states addon decision). Manual runs recorded in the contract: keyboard (Chrome), Narrator twice (English, then Danish after the review fixes), and forced colours (Chrome emulation), which found and fixed an unreadable pressed state. `ForcedColors` carries `parameters.forcedColors: 'active'` for L08 to screenshot. Waiting on a PR.
- **2026-10-18** — L03 reviewed: the `review-component` workflow (API, accessibility, platform) returned 16 findings, all accepted, none rejected or escalated. Button now narrows its label type, supports `aria-pressed` toggles, hides its own icon, guards `onClickCapture`, documents consumer `aria-disabled`, uses `border.strong` for secondary, keeps the spinner visible in forced colours, and limits hover to hover devices. Axe now checks rendered contrast on all 18 stories in Chromium. Waiting on a Narrator re-check of the toggle and a PR before L03 is done.
- **2026-10-17** — Dark-mode defect from L01 fixed (ADR-0010): tokens are declared on `:where(:root, [data-theme])`, because Vite's default production build rewrites `light-dark()` in a way that made `data-theme` subtrees render in the page's theme. Overrides now target `:root, [data-theme]`. The Tokens docs page opts out of Storybook's docs styles, which made the Dark column unreadable.
- **2026-10-16** — L03 in progress: harness ready, Button handed to Emil (pair mode). Emil chose the plan's `icon` prop for icon-only (CONVENTIONS rule 3 and the reference type test updated from L02's `iconOnly`), `axe-core` with an internal helper over the unmaintained `vitest-axe`, and Vitest browser mode (Chromium) for the bounding-box width test. `packages/react` now has `unit` and `browser` test projects; CI installs Chromium. `@senakster/tokens` is a dependency of `@senakster/react`.
- **2026-10-16** — L02 done. Conventions (`packages/react/CONVENTIONS.md`, 11 rules plus the public surface), `useControllableState`, `deprecate`, the `A11yContract` type with its runtime check, type helpers (`NativeProps`, `DistributiveOmit`, `mergeIds`, `useNameCheck`), and check scripts for contracts, component CSS and dist CSS. ADR-0006 (no polymorphism), ADR-0007 and ADR-0009 (Stylelint token guard, unit allow-list), ADR-0008 (contract `adaptation` section). Reviewed by `component-api-reviewer` and `wcag-auditor`: 24 findings, all accepted, none rejected. Tests: tokens 31, react 44, type tests clean.
- **2026-10-16** — L01 done. Reviewed by `modern-web-curator` and `wcag-auditor`; Emil accepted every finding, with none rejected. ADR-0005 amends ADR-0004: `[data-theme]` subtrees get their own background and colour, components multiply movement by `--senui-motion-reduce`, opting out of contrast needs `surface: true`, states are suffixed siblings, and focus rings are offset outlines. The token set is redrafted by Claude for Emil's review: 68 tokens, with state fills, invalid borders, border widths, focus geometry, a raised surface, rem space on a linear `space.N` scale, and `size.control.*`. Contrast checker fixes: a missing or misspelled `min` no longer passes, out-of-gamut colours use the worse of mapped and clipped, and ratios print to three decimals. Tests 31/31. The focus-ring pair against `bg.accent` was dropped as unsatisfiable (scope-decisions § L01, deviation 5). ADR-0004's 300-line trigger has fired (308 lines).

- **2026-10-16** — L01 in progress. The token pipeline is built and tested: Style Dictionary 5, DTCG 2025.10 source, `light-dark()` pairing through mode passes, an oklch-preserving colour transform, and a build-time contrast check in both themes. Also the typed map, the `./tokens.css` export, and a Tokens docs page. ADR-0004 supersedes ADR-0002 (its revisit trigger fired), resolves the colour-space question (oklch) and stops emitting primitives. `pnpm check` now builds first. L00's "CI green on a PR" is closed: the first push ran green. Waiting on Emil's `src/*.tokens.json`.
- **2026-10-15** — L00 done. pnpm workspace (`packages/tokens`, `packages/react`, `apps/docs`), `pnpm check`, Vitest harness, Storybook shell, Changesets, CI workflow and the review-component workflow. ADR-0003 picks tsdown over tsup, which is unmaintained, and resolves L00's open question. Pins: TypeScript 6.0 (typescript-eslint ceiling) and ESLint 9 (jsx-a11y ceiling). Deferred: "CI green on a PR" until a GitHub remote exists. See scope-decisions.md § L00.
- **2026-10-15** — Bootstrapped with the library profile: plans vendored, implementation log, decision corpus and override log seeded. Next: L00.
