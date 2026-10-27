# Scope decisions

Records which catalogue deliverables are **in** or **out** of scope for this app, per module.
A deliverable being out of scope is a legitimate, logged decision; a deliverable being silently
skipped is not. Out-of-scope entries must state what would re-include them later.

Maintained by the `implement-module` skill during its scope-clarification step.

## Format contract

This file is **parsed** into the decision index, so its shape matters:

- One `## NN — <module name>` heading per module. The two-digit number is how records get their
  module attribution.
- Inside a section, the **decisions table is the one whose second column header is exactly
  `Decision`.** That header is the discriminator; the first column's wording is free
  (`Deliverable`, `Deliverable / criterion`, `Item` all work).
- **Any other table in the section is ignored** by the parser, so a section can freely hold
  known-unmet criteria, deviation notes, or cross-module pointers as extra tables, prose, or
  bullet lists. None of it becomes a decision record.
- In the decisions table, the `Decision` cell should read `in`, `out`, `deferred`, or
  `superseded`. Anything else lands as status `other`, which no filter surfaces — so if a row
  matters, give it one of those words.
- Use `—` for "nothing here" in `Reason` / `Re-include when`. The indexer treats an em-dash,
  `n/a`, `none` and `tbd` as empty, which keeps the `--reopen` radar honest.
- A `|` inside a cell must be escaped as `\|`, or it shifts every cell right.

---

## L00 — Workspace, harness & CI

| Deliverable / criterion                                     | Decision | Reason                                                                                                                   | Re-include when |
| ----------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ | --------------- |
| pnpm workspace, strict `tsconfig.base.json`, three packages | in       | core to the module contract                                                                                              | —               |
| `pnpm check` (typecheck + lint + format:check)              | in       | core to the module contract                                                                                              | —               |
| Library build tool                                          | in       | tsdown, not the plan's tsup, which its own README says is unmaintained (ADR-0003)                                        | —               |
| Vitest + jsdom + Testing Library harness                    | in       | wired with `passWithNoTests`, so `pnpm test` is green before the first component                                         | —               |
| Storybook shell in `apps/docs`                              | in       | react-vite + addon-docs, with one Introduction page; stories colocated in `packages/react/src`                           | —               |
| Changesets                                                  | in       | `access: public`, docs app ignored; publish workflow stays in L10                                                        | —               |
| `.github/workflows/ci.yml`                                  | in       | install (frozen) → check → test → build-storybook                                                                        | —               |
| CI runs green on a PR                                       | in       | was deferred for lack of a remote; run 38725498913 on the first push to `main` is green, real steps confirmed in its log | —               |
| `.claude/workflows/review-component.js`                     | in       | reviewer fan-out for pair mode; three reviewers until the L09/L10 agents exist                                           | —               |
| Harness docs (CLAUDE.md, decisions, log, OVERRIDES)         | in       | landed at bootstrap; ADR index and locked-decisions table brought up to date here                                        | —               |

### Known-unmet acceptance criteria

- None. "CI runs green on a PR" closed on 2026-10-16: the first push to `main` (run
  38725498913, 2026-10-15) passed every step on Node 24 with the pinned action versions, and its
  log shows a real install (483 packages), `tsc` on all three packages, Prettier and a Storybook
  build. It ran on a push, not a PR, but `ci.yml` runs the same job for `pull_request`.

### Harness changes from later modules

- **L01** — the root `typecheck` script is now `pnpm build && pnpm -r typecheck`, so `pnpm check`
  builds first. The token map is generated (`packages/tokens/src/generated/`, gitignored), and the
  docs app type-checks against the built `@senakster/tokens` exports, the way a consumer would.
  `pnpm lint` on its own needs one build first on a fresh clone. `pnpm test` now covers
  `packages/tokens` as well.
- **L02** — `pnpm lint` runs Stylelint on component CSS after ESLint (ADR-0007/0009).
  `pnpm check` gains `check:components`: the a11y-contract, component-CSS and dist-CSS scripts in
  `scripts/`, after lint (the dist check needs the build that `typecheck` runs). `pnpm test` in
  `packages/react` type-checks `*.test-d.{ts,tsx}` and runs the contract test, with Vitest's
  persistent module cache off. The react build copies component CSS into `dist/components/`.
- **L03** — `packages/react` has two Vitest projects: `unit` (jsdom, plus type tests) and `browser`
  (Chromium through `@vitest/browser-playwright`, for `*.browser.test.tsx`). `pnpm test` runs both,
  so locally it needs `pnpm --filter @senakster/react exec playwright install chromium` once; CI
  runs that with `--with-deps` before `pnpm test`. Kept in `pnpm test` rather than CI-only: the
  browser project is small and fast. Storybook's preview loads component CSS from source.
- **2026-10-17 — branch rules and licence (Emil):** `main` changes only by squash-merged PR with a green `verify` check, resolved conversations, linear history, no force-push or deletion, and no bypass. Written as `.github/rulesets/main.json`, but **not applied**: rulesets need a public repo or GitHub Pro, and Emil chose to stay private for now. Followed by convention (CONTRIBUTING.md). Re-apply when the repo goes public or upgrades: one `gh api` call, in `.github/rulesets/README.md`. Licence: MIT, `LICENSE` at the root and `license` in both packages. **L10:** npm only packs a LICENSE from the package folder, so copy it into each package at publish.
- **L04 (2026-10-19) — `SENUI_BROWSERS`:** the Vitest browser project's engines come from
  `SENUI_BROWSERS` (comma-separated `chromium`, `firefox`, `webkit`), defaulting to Chromium, so
  `pnpm test` and CI are unchanged. Firefox and WebKit are installed once with
  `playwright install firefox webkit`. Not in CI: a manual cross-browser check until L08 decides the
  gate's engines.

### Deviations from the plan

1. **tsdown instead of tsup** — ADR-0003 resolves the plan's open question on the build tool.
2. **TypeScript pinned to 6.0.x, not the current 7.0** — typescript-eslint 8.71 declares
   TypeScript `<6.1`, and type-aware linting is worth more than the newer compiler. Lift the pin
   when typescript-eslint supports 7.
3. **ESLint pinned to 9.x, not the current 10** — eslint-plugin-jsx-a11y 6.10.2 (its latest)
   does not declare ESLint 10. pnpm warns that eslint 9.39.5 is deprecated; this is accepted. Lift
   the pin when jsx-a11y supports ESLint 10, or replace the plugin via an ADR.
4. **pnpm supply-chain policy** — pnpm 12 enforces a minimum release age. Versions were pinned to
   pass it, apart from `react`/`react-dom` 19.3.1, which are excluded in `pnpm-workspace.yaml`
   because they look like a same-day security release across every 19.x line. Remove the
   exclusion once 19.3.1 ages past the gate. `esbuild` is allowed to run its install script
   (Storybook needs its binary).

### Cross-module notes

- **L01** — `@senakster/tokens` currently exports only an empty `./dist/index.js`. Add
  `./tokens.css` to `exports` and import it in `apps/docs/.storybook/preview.ts`. The tsdown
  build runs publint, so a wrong `exports` path fails the build (probed).
- **L02** — `packages/react/vitest.config.ts` only includes `*.test.{ts,tsx}`; enable typecheck
  mode for `*.test-d.tsx` there. TypeScript's `include` skips dot-directories unless they are
  named with a file glob (see `apps/docs/tsconfig.json`).
- **L03** — axe wiring goes into `packages/react/vitest.setup.ts`. Component CSS must be copied
  into `dist` by the tsdown config and exposed through `exports` (ADR-0001, ADR-0003).
- **L10** — neither package has a `license` field or `repository` yet; both are needed before
  the first publish.

### Package names (Emil, 2026-10-26)

The packages are renamed before the first publish: **`@senakster/senui`** (components, was
`@senakster/react`) and **`@senakster/senui-tokens`** (tokens, was `@senakster/tokens`). The names
say which library they belong to, and the tokens stay a separate package, so a non-React consumer
can use them alone. Rejected: one combined package; and renaming only the components. Nothing had
been published, so no deprecation was owed.

The directories stay `packages/react` and `packages/tokens`. The implementation log, this file and
the PROGRESS changelog keep the old names where they record history.

## L01 — Design tokens

| Deliverable / criterion                                               | Decision | Reason                                                                                             | Re-include when                                   |
| --------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Pipeline: `sd.config.mjs` (Style Dictionary 5, modes, `light-dark()`) | in       | agent work; ADR-0004 replaces ADR-0002's Style Dictionary v4 + pre-stable format                   | —                                                 |
| Build-time contrast check (`contrast.mjs`)                            | in       | acceptance criterion; hardened after review (malformed pairs fail, worse of mapped/clipped counts) | —                                                 |
| Typed map (`dist/index.{js,d.ts}`) and `./tokens.css` export          | in       | generated into `src/generated/`, bundled and copied by tsdown (ADR-0003)                           | —                                                 |
| Tokens docs page in `apps/docs`                                       | in       | renders every public token in both themes from the typed map, plus the reduced-motion table        | —                                                 |
| Pipeline tests (`packages/tokens/test/`)                              | in       | not in the plan; makes every pipeline guard a check that can fail (31 tests)                       | —                                                 |
| Token values and names (`src/*.tokens.json`)                          | in       | the plan gives them to Emil; after the review Emil chose "Claude drafts, I review" (2026-10-16)    | —                                                 |
| Colour space                                                          | in       | oklch (Emil, 2026-10-16); resolves L01's open question, recorded in ADR-0004                       | —                                                 |
| Primitives in `tokens.css`                                            | out      | resolved away so that "internal" is enforced, not promised (Emil, 2026-10-16; ADR-0004)            | consumers need to re-theme at the primitive level |
| Figma variable sync                                                   | out      | out of scope in the plan; DTCG keeps the door open                                                 | a Figma library becomes a source of truth         |
| `[data-theme]` base rule in `senui.base`                              | in       | review finding (modern-web-curator); Emil accepted as an ADR (ADR-0005)                            | —                                                 |
| `--senui-motion-reduce` factor                                        | in       | review finding (both reviewers); Emil accepted as an ADR (ADR-0005)                                | —                                                 |
| `surface: true` instead of a bare `contrast: []`                      | in       | review finding (wcag-auditor); Emil accepted as an ADR (ADR-0005)                                  | —                                                 |
| State, invalid, focus-geometry and raised-surface tokens              | in       | review finding (both); Emil accepted all four groups; drafted and gated                            | —                                                 |
| rem for space and control sizes; linear `space.N`; `size.control.*`   | in       | review findings (modern-web-curator); Emil accepted each                                           | —                                                 |
| Focus-ring contrast pair against `bg.accent`                          | out      | proved impossible in dark mode (see deviation 5); replaced by a mandatory ring offset (ADR-0005)   | a ring is ever drawn flush against a fill         |

### Review (2026-10-16)

`modern-web-curator` (11 findings) and `wcag-auditor` (11 findings), with overlap between them.
Emil accepted every finding; none were rejected or escalated beyond ADR-0005, so `OVERRIDES.md`
has no new rows. One fix was applied before triage, because it was a defect in agent-written
tooling rather than a design choice: a missing or misspelled `min` let any contrast pair pass.

### Known-unmet acceptance criteria

- None. Every L01 criterion holds on the real `src/` token set: deterministic build;
  `light-dark(` 25 = 25 colour tokens; no primitive in `dist` or in `packages/react/src`; all CSS in
  `senui` layers; every contrast pair passes in both themes (tightest: `fg.accent` on `bg.subtle`,
  light, 5.20:1 against 4.5); one reduced-motion block, documented on the Tokens page.

### Deviations from the plan

1. **Style Dictionary 5 and DTCG 2025.10 instead of v4 and the pre-stable format** — ADR-0004,
   because ADR-0002's own revisit trigger fired.
2. **Primitives are not emitted.** The plan says `tokens.css` carries all tiers. ADR-0004 resolves
   primitives away instead.
3. **The primitive-reference guard is a different grep.** Since primitives are never emitted, any
   `--senui-primitive-` reference, or any numbered colour step `--senui-color-<name>-<n>`, is a bug:
   `grep -rnE -- '--senui-primitive-|--senui-color-[a-z]+-[0-9]+' packages/react/src` must return
   nothing.
4. **Pipeline code is split in two** (`sd.config.mjs`, `contrast.mjs`), plain `.mjs`, linted but not
   type-checked; the tests cover them.
5. **No focus-ring pair against `bg.accent`, although Emil accepted one.** When it was applied, the
   pair turned out to be unsatisfiable: in dark mode a ring needs relative luminance ≥ 0.112 for 3:1
   against the page, and ≤ 0.091 for 3:1 against the accent fill. Instead, ADR-0005 makes the ring an
   `outline` with a mandatory `--senui-focus-ring-offset`, so it is only ever adjacent to the page
   background, and its pairs are declared against `bg.default`, `bg.subtle` and `bg.raised`. This is
   a material change to an accepted suggestion. Emil confirmed it on 2026-10-16, on the condition
   that the offset really replaces the pair; it does for every surface in the token set. It is now
   a row in `OVERRIDES.md`, and the one case it doesn't cover (a control on an accent-filled
   container) is an ADR-0005 revisit trigger.
6. **The tokens `tokens.css` writes now span two layers**: `senui.tokens` and `senui.base`
   (ADR-0005).

### Revisit triggers this module has fired

- **ADR-0004, "the pipeline code grows past about 300 lines"** — it is 308 non-blank, non-comment
  lines after the review changes. Resolved 2026-10-16 (Emil): measured by purpose, only about 90
  lines work around Style Dictionary. ADR-0005 replaces the line count with a trigger aimed at
  that code: revisit when the transforms and mode passes pass about 150 lines, a third mode pass is
  needed, or Style Dictionary functionality is reimplemented.

### Cross-module notes

- **L02** — fold the primitive-reference grep (deviation 3) into L02's check scripts so it runs in
  `pnpm check`. A lint rule against raw colour, space, radius, type, motion and elevation values in
  component CSS (principle 4) belongs there too.
- **L03** — component tokens (`--senui-button-*`) are defined in the component's CSS with semantic
  defaults. Draw focus as `outline: var(--senui-focus-ring-width) solid
var(--senui-color-focus-ring); outline-offset: var(--senui-focus-ring-offset)`, never with
  `box-shadow`. `size.control.sm` is `1.5rem`, which drops below 24px when a user's root font size
  is under 16px: use `min-block-size: max(var(--senui-size-control-sm), var(--senui-size-target-min))`.
  Multiply any movement by `--senui-motion-reduce`.
- **L04** — an invalid field uses `color.border.danger` with `border.width.strong` and an error
  message; colour alone never carries the error (WCAG 1.4.1).
- **L11** — every movement is multiplied by `--senui-motion-reduce` (ADR-0005). Components must not
  add their own `prefers-reduced-motion` blocks for token-driven motion.

### Defects found later

- **2026-10-17: `data-theme` subtrees broke in production builds** (fixed by ADR-0010). Emil saw
  an unreadable Dark column on the Tokens page. That had two causes:
  - In dev, Storybook's unlayered docs styles set the `code` colour, beating the layered
    `[data-theme]` rule. Fixed with `sb-unstyled` on the docs tables, which are now styled from
    tokens.
  - Investigating it showed the real defect. Vite 8's default production build rewrites
    `light-dark()` through Lightning CSS into variables that resolve where the token is declared,
    and tokens were declared only on `:root`, so dark subtrees rendered light. A default Vite
    consumer app kept 0 of 28 `light-dark()` calls.

  Tokens are now declared on `:where(:root, [data-theme])`, reduced motion included. Verified in
  Chromium in source and in a default Vite build: dark subtree, nested light subtree, OS dark mode,
  reduced motion in a subtree. Dark text in the docs table measures 16.8:1. The gap in L01's
  verification: everything was checked against unminified CSS, and no check ran a production build
  in a browser. L08's Playwright gate should run against built output.

## L02 — Component API conventions

| Deliverable / criterion                               | Decision                                        | Reason                                                                                                                                 | Re-include when                                           |
| ----------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Polymorphic `as` / `asChild`                          | out (ADR-0006)                                  | Emil: no polymorphism. Each component renders one element, named in its contract                                                       | ADR-0006's revisit triggers (link-styled Button, routers) |
| Hook, `deprecate`, contract type, `CONVENTIONS.md`    | in, Claude drafts and Emil reviews              | Emil's call; L02 is conventions and tooling, not component source                                                                      | n/a                                                       |
| Raw-value guard for component CSS                     | in, Stylelint (ADR-0007, amended by 0009)       | Built-in rules beat a grep script that reads CSS as text                                                                               | n/a                                                       |
| Ref forwarding                                        | in: `forwardRef`, React 18.3 kept in peer range | On 18 a `ref` prop is silently dropped                                                                                                 | The peer range drops React 18                             |
| `adaptation` section in the a11y contract             | in (ADR-0008)                                   | WCAG review: target size, forced colours, motion, RTL and overflow had nowhere to go                                                   | n/a                                                       |
| Contract bound to props, runtime contract test        | in                                              | WCAG review blocker: free strings let a contract drift from its component unnoticed                                                    | n/a                                                       |
| Tested-with evidence per method, WCAG 2.2 table       | in                                              | WCAG review: empty lists, invalid criteria and unattributed runs passed the type                                                       | n/a                                                       |
| AT, browser and OS product names in `testedWith` data | in: exempt from the no-brand rule               | Emil: compatibility facts, not branding. Types and fixtures stay generic (CLAUDE.md)                                                   | n/a                                                       |
| Focus ring vs consumer resets                         | in: documented and tested, not `!important`     | Emil: keeps principle 3. Every focusable contract lists `RESPONSIBILITIES.keepFocusRing`; L08 tests a reset                            | A reset breaks the ring in a real consumer anyway         |
| Per-component stylesheet export                       | in: `./styles/<Name>.css`                       | API review: ADR-0001 promised one; once published, the subpath is semver API                                                           | n/a                                                       |
| Contract staleness                                    | in: warning only, skipped in shallow clones     | Failing on every refactor would block commits until a manual screen-reader run; CI checks out shallow, where commit dates mean nothing | Contracts drift despite the warning                       |
| Positive `tabIndex` in the type                       | out                                             | Not in the accepted triage option (only `role` is removed from native props); the reviewer marked it "where practical"                 | A component ships with a positive tabindex in use         |

### Review (2026-10-16)

`component-api-reviewer` (12 findings) and `wcag-auditor` (12 findings, 2 blockers) ran read-only on
the drafts. Emil accepted every finding, rejected none, and escalated two to ADRs: ADR-0008
(`adaptation` section) and ADR-0009 (unit allow-list, amending ADR-0007). One finding was common to
both reviews (the entry could export from `internal/` without a contract). No `OVERRIDES.md` rows.

### Deviations from the plan

1. **`deprecate(component, prop, migration)`** instead of the plan's two-argument form. The
   component name makes the warning findable, and the key is per component and prop.
2. **Contract export form.** The plan's `satisfies A11yContract` became
   `export const a11y = defineA11yContract<Props>()({ … })`, so the contract is checked against the
   component's props and the runtime test has a fixed export name to load.
3. **Contract staleness check lives in `scripts/check-a11y-contracts.mjs`**, not in Vitest: the
   react package has no Node types, and adding `@types/node` for one check wasn't worth a dependency.
4. **Vitest's persistent module cache is off in `packages/react`** (`fsModuleCache: false`). A probe
   showed the cached contract test kept its glob results from before a component existed, so a new
   component went unchecked locally. Costs about a second per cold run.
5. **The WCAG table is generated, not hand-written** (Emil, 2026-10-16: "I would expect this to come
   from a maintained package"). No maintained npm package covers 2.2, so `pnpm sync:wcag`
   (`scripts/sync-wcag.mjs`) generates `src/internal/wcag.ts` from W3C's machine-readable
   `https://www.w3.org/WAI/WCAG22/wcag.json`. W3C's terms allow this with attribution and with the
   content unchanged. The script runs by hand, never in `pnpm check`, which stays offline, and it
   refuses to write anything other than 86 well-formed criteria. The generated file holds only W3C
   data (number, level, title); senui's `FOCUSABLE_BASELINE` moved to `a11y-contract-check.ts`.
   Rerun it when W3C publishes a new WCAG 2.x version. WCAG 3 would need an ADR, not a sync. The
   hand-written table it replaced matched W3C exactly.

### Cross-module notes

- **L03** — Button is the first user of: `NativeProps<'button'>`, the icon-only union with icon
  children, `useComposedRefs(forwardedRef, useNameCheck('Button'))`, root ownership (rest first,
  merged class, resolved `data-variant` / `data-size`), and `aria-disabled` plus a guarded handler for
  loading. Its contract needs a screen-reader and a keyboard run before `pnpm test` passes. Add
  `@senakster/tokens` as a dependency of `@senakster/react`. `size.control.sm` must still meet the
  24px minimum (see § L01). The component-CSS copy step and the `./styles/*.css` export are done;
  publint warns that the export matches no files until Button's CSS exists.
- **L04** — FormField wrapping TextInput is the first `DistributiveOmit` case. Error styling keys off
  `[aria-invalid="true"]` only, and `aria-describedby` is merged with `mergeIds()`.
- **L08** — add the server-render test per component; a Playwright spec that loads a typical consumer
  reset (`:focus { outline: none }`, `all: unset`) and checks the ring survives; the keyboard spec
  iterates each contract's `keyboard` keys; forced-colours and target-size checks derived from
  `adaptation`.
- **L09** — generate `components.json` / `llms.txt` from the contracts. Derive each criterion's level
  from `WCAG22`; label `announces` as observed with the AT named in `testedWith`.

### Defects found later

- **2026-10-26 (found in L07): the unit guard never covered `@container` conditions.** ADR-0009's
  allow-list and ADR-0015's media-feature rule are Stylelint rules, and none of them checks an
  `@container` condition: a probe passed `px`, `em` and `ch` there, while the same file rejected `px`
  in `@media` and in a declaration. Nothing had used a container query before L07. Fixed by ADR-0016:
  `check-component-css.mjs` now allows only `rem` on size features in a container condition, and
  requires a `senui-` container name. Probed with 14 forms, valid and invalid. On 2026-10-27 Emil
  kept the name rule and it gained a declared-name check: the queried name must be declared
  (`container:` or `container-name:`) in the same stylesheet, so a typo fails instead of never
  matching. Probed with four forms.

## L03 — Button

| Deliverable / criterion                            | Decision                                       | Reason                                                                                                                                   | Re-include when                                      |
| -------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Icon-only API                                      | in: `icon` prop, no children (plan decision 6) | Emil, over L02's `iconOnly` + children: the type can forbid children, but can't tell an icon child from text. CONVENTIONS rule 3 updated | n/a                                                  |
| Unit axe                                           | in: `axe-core` + internal helper               | Emil: `vitest-axe` is 0.1.0 and unmaintained; the helper is a few lines (`src/internal/testing/axe.ts`)                                  | A maintained wrapper adds something the helper lacks |
| Width identical in loading and idle (bounding box) | in, Vitest browser mode (Chromium)             | Emil: jsdom measures every box as 0, so the test would pass for any CSS                                                                  | n/a                                                  |
| Component, CSS, contract, tests                    | in, Emil writes them (pair mode)               | CLAUDE.md working mode                                                                                                                   | n/a                                                  |
| Stories                                            | in, agent only on request by name              | Plan: "agent on request"; pair-mode rule                                                                                                 | n/a                                                  |
| First changeset (`minor`)                          | in                                             | Plan deliverable                                                                                                                         | n/a                                                  |

### Deviations from the plan

1. **`Button.css`, not `button.css`.** `check-component-css.mjs` requires `<Name>/<Name>.css` (L02).
2. **Component tokens are `--senui-button-*`**, not `--ds-button-*` (CLAUDE.md naming).
3. **Stories live in `packages/react/src/components/Button/Button.stories.tsx`**, not `apps/docs/src/`.
   Decided in L00 (`apps/docs/.storybook/main.ts` loads colocated stories) and in CONVENTIONS.
4. **The raw-value grep criterion is replaced by Stylelint** (ADR-0007, ADR-0009), which covers
   every unit and colour form, not just hex and `px`.
5. **Icon-only type test:** the plan's `<Button icon={x} />` without a name, and `icon` with
   children, both fail. The reference type test in `src/internal/conventions.test-d.tsx` now models
   exactly this shape.
6. **`axe-core` instead of `vitest-axe`**, and colour contrast is off in jsdom (it needs layout).
   Contrast is covered by the token build's pair check (L01) and, rendered, by Storybook/L08.
7. **Pair mode: Claude wrote Button; Emil reviews it** (Emil, 2026-10-17: "Please write Button
   example", then chose "The real Button, you review it" over a reference copy). Every component
   file is agent-written, so Emil owns it through review: the reviewers still run, and each line of
   public API must be one he accepts. Emil's stub `Button.types.ts` and empty folder `index.ts` were
   removed; `ButtonProps` lives in `Button.tsx` per CONVENTIONS.
8. **New token `motion.easing.linear`.** The spinner needs constant speed; Stylelint rejects the
   raw `linear` keyword, and no existing easing token is linear. A minor in `@senakster/tokens`.
9. **Spinner under reduced motion turns four times slower instead of stopping**, through
   `--senui-motion-reduce`, so it still shows activity (modern-web-guidance `spinner`). ADR-0005's
   factor is used to scale duration here, not distance.
10. **Loading is `data-state="loading"`**, not `aria-busy` (decision 4: Button announces nothing).
    The CONVENTIONS root-ownership example had `aria-busy`; corrected.

### Review (2026-10-18)

The `review-component` workflow ran `component-api-reviewer`, `wcag-auditor` and `modern-web-curator`
read-only: 16 findings (5 major, 11 minor), no ADRs. Overlaps reduced them to 11 decisions. Emil
accepted all 16, rejected 0, escalated 0, so there are no `OVERRIDES.md` rows. Applied:

- **Label type narrowed** to `Exclude<ReactNode, null | undefined | boolean>`, in Button and in the
  reference type; an empty string is still left to `useNameCheck` (CONVENTIONS rule 3).
- **`aria-pressed` supported** (Emil chose support over removal): typed `boolean` (no `mixed`), a
  pressed style with fill plus a text-colour border (shape, not colour alone), a forced-colours rule,
  a contract state, and Toggle/Pressed stories. Its announcement is not yet heard with a screen
  reader; the contract says so.
- **Axe with rendered colour contrast** runs on every story in Chromium (WCAG 2.2 A/AA plus
  best-practice tags). A probe that lowered the primary label's contrast failed 7 stories. The
  contract gains 1.4.3, and 2.4.11 is reworded to what Button guarantees.
- **Secondary border is `border.strong`**, so the 1.4.11 claim is true.
- **Spinner in forced colours** keeps its gap with system colours (`ButtonText` / `ButtonFace`), not
  `forced-color-adjust: none` (the two reviewers disagreed; Emil chose this).
- **Consumer `aria-disabled` is public**: JSDoc, contract state, AriaDisabled story.
- **Button hides the icon itself** (`aria-hidden` wrapper); the consumer responsibility is gone.
- **`onClickCapture` is guarded** like `onClick`; the contract says pointer handlers and native
  listeners are not.
- **Hover only under `@media (hover: hover)`**.
- **Public surface declared**: a comment at the top of Button.css and a CONVENTIONS note mark the
  `__label` / `__icon` / `__spinner` part classes internal.
- **Stories added**: IconOnlyLoading, IconOnlyLabelledBy, AriaDisabled, Toggle, Pressed, LongLabel,
  plus loading icon-only and pressed cells in Matrix (18 stories).

### More deviations

11. **Loading label is `opacity: 0`, not `visibility: hidden`** (plan decision 5). Visibility also
    removed the label from the accessibility tree, so Narrator heard a loading button with no name
    (2026-10-17). Locked by a browser test.
12. **`aria-pressed` is in scope for Button** (Emil, review triage), though the plan didn't mention
    toggles. Only `true` / `false`; a tri-state toggle would be its own decision.

### Known-unmet acceptance criteria

- **Hover and active stories.** Storybook can't force `:hover`/`:active` without an addon (a new
  dependency, so an ADR under principle 2). Every other state has a story; hover and active are
  visible in the Matrix story by pointing at it. Re-include with a pseudo-states addon decision.
- **Keyboard and screen-reader runs:** done 2026-10-17 (keyboard, and Narrator in Chrome). The first Narrator run found the loading button had no name; fixed before recording.

### Cross-module notes

- **L08** — the Vitest `browser` project (Chromium via Playwright, `*.browser.test.tsx`) exists from
  L03. L08's Playwright gate can build on the same `playwright` pin; `@storybook/addon-vitest` would
  run every story in that browser project.
- **L08: the `forcedColors` story parameter** (Emil, 2026-10-18). A story with
  `parameters.forcedColors: 'active'` (Button's `ForcedColors`) is a contract with L08: the gate
  screenshots it with Playwright's `forcedColors: 'active'`, under both `colorScheme: 'light'` and
  `'dark'`. Until L08 reads it, the parameter does nothing and the story renders like Matrix; that's
  why it exists separately (it was a plain duplicate before). L03's "forced-colors story" criterion
  is met by the story now and enforced once L08 lands. A manual check with Chrome emulation on
  2026-10-18 found the pressed backplate bug, fixed the same day.

### Defects found later

- **2026-10-19: Storybook controls did nothing on six Button stories** (Emil: IconOnlyLoading
  ignored `variant`). IconOnly, IconOnlyLoading, IconOnlyLabelledBy, Toggle and LongLabel rendered
  hard-coded JSX, `render: () => …`, which never reads `args`; Matrix and ForcedColors are fixed
  grids. The first five now spread their args (icon-only stories drop the meta's label and name args
  through `iconOnlyArgs`). The grids, and L04's FormField compositions, disable their controls. A
  new test per component renders every story that has controls with a changed arg and checks it
  lands (`withControls()`); with the old IconOnlyLoading put back, it fails. CONVENTIONS' file
  layout states the rule.

## L04 — FormField + TextInput

| Deliverable / criterion                    | Decision                                                 | Reason                                                                                                                                            | Re-include when                                          |
| ------------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Component, CSS, contracts, tests, stories  | in, Claude writes and Emil reviews (as L03, deviation 7) | Emil, 2026-10-18: "Claude writes, Emil reviews"                                                                                                   | n/a                                                      |
| Live region (open question 1)              | in: `announce="polite"`, opt-in, off by default          | Emil took the plan's recommendation                                                                                                               | Consumers report missed errors with on-change validation |
| `focusFirstInvalid(form)`                  | in, public export                                        | Emil: consumers running their own validation need it to meet decision 3; the submit story uses it                                                 | n/a                                                      |
| TextInput `size` (`sm`/`md`/`lg`)          | in                                                       | Emil: aligns a field with a Button in a row (CONVENTIONS rule 11)                                                                                 | n/a                                                      |
| Textarea, Select, Checkbox/Switch in field | out (plan)                                               | Plan: not first release / L05                                                                                                                     | L05 for Checkbox/Switch                                  |
| Hover style for TextInput                  | out                                                      | No input-hover token, and a darker border than `border.strong` doesn't exist; the field isn't a target whose look should change under the pointer | A design asks for it; it needs a token first             |

### Deviations from the plan

1. **Invalid styling is `[aria-invalid="true"]` only; `:user-invalid` is not styled** (plan decision
   5). A probe on 2026-10-18 showed Chromium matches `:user-invalid` while the accessibility tree still
   reports `invalid: false`, which is exactly what CONVENTIONS rule 6 forbids. Emil chose to sync
   instead: on the native `invalid` event the control sets `aria-invalid`, and FormField shows the
   browser's `validationMessage` in its error node (replacing the bubble). The handler acts only when
   the control already matches `:user-invalid`, which a second probe showed is true during a submit
   and false for a `checkValidity()` on an untouched form. Nothing looks or reads invalid before a
   submit attempt. ADR-0001 still lists `:user-invalid` among state signals; rule 6 and this module
   say otherwise, so that wants an ADR (see cross-module notes).
2. **A native error stays until the value is valid**, with the current message (Emil, over clearing
   on any change; modern-web-guidance `required-field-feedback`: remove the error on correction).
   A form reset clears it.
3. **FormField wires its control through a sealed render-prop binding, not context** (plan decision 6
   and the type-test criterion conflicted: a parent can't change a child's prop types). Emil chose
   `<FormField label="…">{(field) => <TextInput field={field} />}</FormField>`. `FormFieldBinding` is
   opaque, so only FormField makes one; it satisfies TextInput's name requirement and forbids a
   competing `aria-label`, `id`, `required` or `aria-invalid`. `useFormFieldControl(binding, props)`
   stays the one place wiring lives, for L05.
4. **FormField's `id` prop is the control's id**, not the root `div`'s, so an error summary can link to
   the field (plan: "consumer may pass `id` explicitly").
5. **FormField suppresses the browser's bubble and moves focus itself** on a native submit failure:
   cancelling `invalid` also cancels the browser's focus move. Standalone TextInput leaves both to the
   browser. Known issue in the contract: `checkValidity()` after a submit attempt behaves like a submit.
6. **`useNameCheck` counts `<label>` elements** (`node.labels`). It read only text content, so an input
   named by a label would have warned.
7. **TextInput passes native `value` / `defaultValue` / `onChange` through**, rather than adding
   `onValueChange` (CONVENTIONS rules 5 and 11). The input owns its state; rule 5 is written for
   components that own state themselves. **Confirmed by Emil, 2026-10-19: keep native.** Rules 5
   and 11 now say so: a wrapped native control keeps its own `value` / `onChange`, and
   `on<Prop>Change(value)` is for state a component owns. Reasons: form libraries
   (`register()`, `handleChange`) expect the native event; one way to do it; adding a callback
   later is a minor, removing one a major. ~~**L05:** Checkbox passes native `checked` / `onChange`
   through; Switch decides when it gets there.~~ **Corrected 2026-10-19 (L05):** Emil chose the
   L05 plan's `checked` / `onCheckedChange` through `useControllableState` for Checkbox and Switch,
   with native `onChange` still passed through; rule 5's exception covers text-entry controls only.
8. **Stories are colocated** and **axe is `axe-core` via the internal helper**, as L03 deviations 3 and 6.
9. **TextInput's stories type their meta against the `aria-label` branch.** Storybook's arg types
   collapse the three-way name union to `never`.
10. **The paste criterion is checked in jsdom as "not cancelled"**: `fireEvent.paste` returns `true`,
    then the value reaches `onChange`. jsdom doesn't insert clipboard text.

### Review (2026-10-19)

The `review-component` workflow ran `component-api-reviewer`, `wcag-auditor` and
`modern-web-curator` read-only over FormField and TextInput. The API reviewer failed in the first
run, and the re-run repeated all three, so there were two passes: 30 findings, 17 distinct
decisions. Emil accepted 16, rejected 0, and escalated 1 to ADR-0011. No `OVERRIDES.md` rows.
Applied:

- **Focus on submit reaches an earlier field invalid only through `error`.** Each `invalid`
  handler focuses the first field that shows or is about to show an error, not only itself.
- **A native error clears when code sets a valid value.** While a native error shows, the control
  re-checks validity after every render; a value set from code fires no change event.
- **One reset listener per shown error**, removed when the error clears or the control unmounts
  (it was added on every `invalid` event and never removed).
- **Native messages are never live.** They render in their own non-live node, so with
  `announce="polite"` a failed submit doesn't queue every field's message. The live node carries
  the `error` prop only.
- **FormField spaces only its own parts.** TextInput's `margin: 0` cancelled the old `* + *` gap,
  depending on stylesheet order.
- **The message is one element**, aligned to the first line's baseline, so a message with markup
  isn't split into flex items.
- **`error` is a message, never a boolean**: `error={true}` doesn't compile, and `true` cast past
  the type counts as no error. `undefined` stays allowed for `error={errors.email}`.
- **FormField's root takes no control ARIA props** (`aria-describedby`, `-label`, `-labelledby`,
  `-invalid`, `-required`). They are declared `never`, not just omitted: JSX doesn't check
  hyphenated attribute names it doesn't know.
- **A development warning when the binding reaches no control, or more than one.**
- **`useNameCheck` counts a `<label>` only if it has visible text**, so an empty FormField label
  (the hidden `*` alone) warns.
- **`focusFirstInvalid` (public) matches `aria-invalid` only** and skips controls that can't take
  focus. The submit handler's native scan is internal (`focusFirstInvalidOnSubmit`).
- **Read-only gets a dashed border in forced colours.** It was a fill only, which forced colours
  replace. The contract's forced-colours detail no longer claims read-only was checked.
- **`type="search"` gets `appearance: textfield`** (WebKit's search-field look overrode radius and
  padding).
- **`sm` takes md's text size on touch screens** (`pointer: coarse`), so iOS doesn't zoom on focus.
- **The live-region announcement text is reworded** (Emil chose rewording over a re-run): the label
  and role heard with it come from focus.
- **Firefox and WebKit.** Both ran the FormField and TextInput browser tests (88 passed), including
  the `:user-invalid` submit check, which had only been probed in Chromium. See § L00 for the
  `SENUI_BROWSERS` switch.
- **ADR-0011** records the `aria-invalid`-only rule and the sealed binding (escalated).

### Cross-module notes

- **ADR-0011 (accepted 2026-10-19):** form controls bind through a sealed render-prop binding, and
  native validity reaches `aria-invalid` by syncing on `invalid`, never through `:user-invalid`
  styling. It amends ADR-0001's list of state signals, and overrides this plan's decisions 5 and 6
  (deviations 1 and 3).
- **L05** — Checkbox and Switch take `field?: FormFieldBinding` the same way and call
  `useFormFieldControl`. `FieldElement` is `HTMLInputElement`, which already fits.
- **L08** — the FormField and TextInput `ForcedColors` stories carry `parameters.forcedColors`.

## L05 — Checkbox / Switch

Plan synced 2026-10-19 (the planner added L05 to L07 in `89ae68b`, after ADR-0011).

| Deliverable / criterion                                    | Decision                                                                                       | Reason                                                                                                                                                      | Re-include when                                                                                                        |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Checkbox, CheckboxGroup, Switch, wiring hook               | in, Claude writes and Emil reviews                                                             | Emil, 2026-10-19, as in L03 and L04                                                                                                                         | n/a                                                                                                                    |
| Label ownership (plan #4)                                  | in: own `label`, `description`, `error`                                                        | Emil chose the plan over ADR-0011's L05 note: a checkbox's label sits after the control. ADR-0012 amends ADR-0011                                           | n/a                                                                                                                    |
| `checked` / `onCheckedChange` (plan #6, #7)                | in, through `useControllableState`; native `onChange` passes through                           | Emil: the component owns checked state (and the select-all pattern needs `onCheckedChange`). CONVENTIONS rule 5's amendment narrowed to text-entry controls | n/a                                                                                                                    |
| Screen-reader runs (plan: NVDA, JAWS, VoiceOver, TalkBack) | in: Narrator and NVDA (Windows)                                                                | Emil's setup; NVDA is free and is the reader the plan's announcement claims cite                                                                            | Someone with JAWS, macOS/iOS VoiceOver or TalkBack runs them; until then the contracts claim nothing for those readers |
| Open question 1, thumb under reduced motion                | in (resolved): `--senui-motion-reduce` scales the duration, never the distance                 | Emil. The thumb's position is the state; the same pattern as Button's spinner (L03 deviation 9)                                                             | L11 refines motion                                                                                                     |
| `className` / `style`                                      | in: on the wrapper (`.senui-checkbox`, `.senui-switch`); native props and the ref on the input | Emil: consumers lay out the row                                                                                                                             | n/a                                                                                                                    |
| Group `required`                                           | in: the prop is the message: `required="Choose at least one topic."`                           | Emil: the library ships no English text, and the type forces a message                                                                                      | n/a                                                                                                                    |
| Group children                                             | in: context, matched by each Checkbox's `value`; a dev warning for a child without one         | Emil: plain children read better for a list of options; the type can't see context (as with FormField)                                                      | n/a                                                                                                                    |

### Deviations from the plan

1. **No `:user-invalid` styling** (plan: group style `:has(:user-invalid, [aria-invalid="true"])`, states "user-invalid and prop-driven"). ADR-0011 wins: invalid is styled from `[aria-invalid="true"]` only, and native validity reaches it through the `invalid` event.
2. **No `em` units** (plan #15: visual box in `em`). ADR-0009's unit allow-list excludes `em`; sizes come from tokens.
3. **`--senui-*` tokens and classes**, colocated stories, the `axe-core` helper, and Vitest browser mode for the plan's Playwright criteria (as L03 deviations 2, 3 and 6).
4. **The wiring extraction reuses L04's pieces.** `useFormFieldControl` and `focusFirstInvalid` move to `internal/`, next to the new `internal/useFieldWiring.ts` (ids, description and error state), which FormField and the new controls share.
5. **CheckboxGroup lives in its own directory**, not `Checkbox/` as the plan lists: the layout checks need one component, one contract and one entry export per `<Name>/` directory.
6. **The group's error describes every checkbox, not the fieldset** (plan decision 13; open question 2, resolved). Emil's NVDA run (Chrome, 2026-10-20) read the legend on entering the group ("Topics, gruppering") but never the fieldset's description, so the error was never heard, only "invalid entry". The plan's fallback (the first box only) would miss entry by Shift+Tab, which lands on the last box. Emil chose every box: each reads "invalid entry" and the message, whichever takes focus. The fieldset keeps only its description. The double reading decision 13 warned about needs the error on the fieldset _and_ the boxes, which is no longer the case. Re-heard by Emil with NVDA, 2026-10-20: each box now reads the message.
7. **Form controls always render `aria-invalid`** (ADR-0013): found in the same runs, it replaces the "absent when valid" criterion.

### Review (2026-10-20)

The `review-component` workflow ran `component-api-reviewer`, `wcag-auditor` and `modern-web-curator`
read-only over Checkbox, CheckboxGroup, Switch and the shared wiring: 18 findings, 14 distinct.
Emil accepted all 14, rejected 0 and escalated 0, so there are no `OVERRIDES.md` rows. Applied:

- **The group's "choose at least one" host is the first enabled option, re-evaluated after every
  render** (all three reviewers). A disabled first option, or options mounted after the group,
  meant the rule never blocked a submit.
- **Form reset keeps state in step**: CheckboxGroup (and uncontrolled Checkbox and Switch) listen
  for their form's `reset` for their whole life and return to the default (`internal/useFormReset`).
  Before, a reset unchecked the DOM but not the state, and a required group let an empty submit
  through.
- **The group's description describes every box too**, with the error; the fieldset keeps only a
  consumer's own `aria-describedby`. Re-heard by Emil with NVDA: each box reads it.
- **`indeterminate` is controlled-only in the type**: a union requires `checked` and
  `onCheckedChange` with it; type tests lock it.
- **Hover component tokens** (`--senui-checkbox-checked-bg-hover`, `-border-color-hover`,
  `--senui-switch-on-bg-hover`, `-track-border-color-hover`), so overrides hold on hover. New
  public tokens, in this minor.
- **Size tokens are clamped to the 24 px target**: Checkbox's input is `max(target, box)`; the
  Switch track can't be shorter than the target. Browser tests override each token.
- **Internal calc variables are `--_senui-*`** (Switch); CONVENTIONS rule 6 now states both rules.
- **Controls align to a wrapping label's first line** (`align-items: start`); Switch LongLabel story.
- **Development warnings**: a Checkbox in a group with `checked`, `defaultChecked` or `required`;
  an empty group `required` message.
- **Tests**: type tests for every `never` prop; a browser test and a RequiredSubmit story (`play`)
  for a standalone required Checkbox.
- **Contracts**: Checkbox gains 1.3.1 and 3.3.1; Switch lists its always-`"false"` `aria-invalid`;
  CheckboxGroup's text describes the per-box wiring.

Probes: putting the host back on the first box, narrowing the effect's dependencies, removing the
group's reset and removing the Switch clamp each failed its new test; all restored.

## L06 — Dialog

Plan synced 2026-10-19, with the planner's ADR-0015 (dialog scroll lock). L02, L04 and L05 were re-synced
on 2026-10-20 before starting. Those were the L03 to L05 lessons going back upstream, and senui already
follows them.

| Deliverable / criterion                                                   | Decision                                                                                                                                                                                                                                                                          | Reason                                                                                                 | Re-include when                                                               |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Dialog, AlertDialog, `useModalDialog`                                     | in, Claude writes and Emil reviews                                                                                                                                                                                                                                                | Emil, 2026-10-20, as in L03 to L05. Public-API choices go to Emil as questions before they are written | n/a                                                                           |
| Playwright criteria (plan: `apps/docs/e2e/dialog.spec.ts`, three engines) | in, as `*.browser.test.tsx` in Vitest browser mode, with custom Playwright commands for wheel and viewport. Three engines run locally through `SENUI_BROWSERS`, and CI runs Chromium only                                                                                         | Emil: one harness, as in L03 to L05. A second runner is L08 work                                       | L08 decides the cross-engine CI gate                                          |
| New tokens: backdrop scrim, dialog widths                                 | in, Claude drafts and Emil reviews: semantic `color.bg.backdrop` (`surface: true`) and `size.dialog.sm/md/lg`, plus `--senui-dialog-*` component tokens that default to them (L02 rule 10)                                                                                        | Emil. Principle 4 rules out raw values in `dialog.css`, and nothing in the L01 set fits                | n/a                                                                           |
| ADR-0015 (planner repo)                                                   | in: adopted as senui ADR-0014, which cites it                                                                                                                                                                                                                                     | Emil: the scroll-lock selector is public API, so the decision belongs in senui's own corpus            | n/a                                                                           |
| Open question 1, support data                                             | resolved 2026-10-20 against webstatus.dev, with nothing changed. `closedby` has no Safari entry, so the fallback stays (plan #5). Overscroll containment has no Safari entry, so the root lock stays. `overlay` is Chromium-only, so the exit animation is driven by `data-state` | The plan asked for a re-check at implementation start                                                  | Safari ships `closedby` (drop the fallback) or containment (ADR-0015 trigger) |
| Screen-reader runs                                                        | in: NVDA (Windows), as in L05                                                                                                                                                                                                                                                     | Emil's setup                                                                                           | Someone runs JAWS, VoiceOver or TalkBack                                      |
| Sheets, non-modal, Invoker Commands, unsaved-changes blocking             | out, as the plan says                                                                                                                                                                                                                                                             | Plan decisions 2 and 19, and Out of scope                                                              | The plan's own triggers                                                       |

### Deviations from the plan

1. **AlertDialog lives in its own directory**, not in `Dialog/` as the plan lists, because the layout checks need one component, one contract and one entry export per `<Name>/` directory (as L05 deviation 5). Shared internals go in `internal/`.
2. **`--senui-*` tokens and classes, colocated stories, the `axe-core` helper, and Vitest browser mode** in place of the plan's `--ds-*`, `apps/docs/src/*.stories.tsx`, `vitest-axe` and `apps/docs/e2e/` (as L03 deviations 2, 3 and 6).
3. **Reduced motion multiplies distance and scale by `--senui-motion-reduce`** (ADR-0005), which is how senui implements the plan's "L01 #6 collapses distance/scale and keeps the fade".
4. **ADR-0015 is cited as senui ADR-0014.**
5. **Backdrop clicks are detected in every engine, and `closedby` is never rendered** (plan #4, #5: `dismiss` maps to `closedby`, with a fallback only where it is missing). Chrome's light dismiss fires the same `cancel` event as Esc, so the close reason couldn't be told apart, and a second code path would have needed its own tests. Both press and release must be on the backdrop. The behaviour the plan asks for is unchanged.
6. **Percentages, not `dvh`, for the size limits** (plan, Layout). ADR-0009's unit allow-list has no viewport units. A modal dialog is `position: fixed`, so `100%` is the viewport, including a mobile browser's moving toolbar.
7. **One raw value: `@media (max-height: 30rem)`** (plan #16: unstick the header and footer on short viewports). No token can drive a media query (plan #21 says the same). The first draft used a `stylelint-disable`. **Resolved (Emil, 2026-10-20):** ADR-0015 amends ADR-0009 to allow `rem` in size media features only, using three built-in rules (probed). No disables remain in component CSS.
8. **AlertDialog's styles depend on Dialog.css.** **Resolved (Emil, 2026-10-20):** `AlertDialog.css` starts with a plain `@import '../Dialog/Dialog.css'`, so `styles/AlertDialog.css` works alone. `check-component-css.mjs` now allows a plain import of another component's stylesheet before the layer block, and rejects `layer()`, which would nest Dialog's rules in a sub-layer that loses to other components. A browser test loads `AlertDialog.css` alone; probes with `layer()` and with no import both fail it.
9. **Header and footer heights are measured** (a ResizeObserver writing `--_senui-dialog-header-size` and `-footer-size`) so that `scroll-padding-block` can match them (plan #16). They are measured as layout size: a `getBoundingClientRect()` measurement taken during the enter scale left the padding about 2 px short (found by the browser tests).
10. **Shared internals live in `internal/dialog/`** (`useModalDialog`, `ModalDialog`), not in `Dialog/useModalDialog.ts`: AlertDialog has its own directory (deviation 1).
11. **The dialog's focus ring sits on its border, not inset** (plan #10: an inset ring). Emil saw it in Chrome at 100 %, keyboard-opened (2026-10-21): the sticky header painted over the ring's inner pixel. Headless Chromium, Firefox and WebKit didn't show it at 100 %, 125 % or 150 % zoom, so screenshots can't guard it. The ring now starts at the padding edge (`outline-offset` of minus the border width): it covers the 1 px border and 1 px outside, and nothing inside the dialog can reach it. In fullscreen the border is as wide as the ring and transparent, so the ring stays on screen. A browser test pins the geometry in all three engines; with the old inset value it fails.

### Public API (Emil, 2026-10-20)

| Choice                                              | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Reason                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| How a dialog opens                                  | in: no trigger prop: `open` / `onOpenChange` from the consumer, and `defaultOpen` for a dialog shown on mount                                                                                                                                                                                                                                                                                                                                                                               | Emil. No `cloneElement`. Focus return captures `document.activeElement` at open, so the trigger needn't be known                                                                                                                                                                          |
| Footer                                              | in: `footer?: ReactNode`, a sticky footer after the body                                                                                                                                                                                                                                                                                                                                                                                                                                    | Emil. Actions stay visible while the body scrolls                                                                                                                                                                                                                                         |
| AlertDialog action                                  | in: `action: ReactNode` (the consumer's own Button); AlertDialog renders Cancel from `cancelLabel` and focuses it                                                                                                                                                                                                                                                                                                                                                                           | Emil. The consumer keeps control of the variant, loading state and handler                                                                                                                                                                                                                |
| Cancel's reason                                     | in: a new `'cancel'` member of `DialogCloseReason`                                                                                                                                                                                                                                                                                                                                                                                                                                          | Emil. A consumer can tell an explicit Cancel from Dialog's close button. The plan already lets the union grow in a minor                                                                                                                                                                  |
| Decided by Claude, accepted by Emil (2026-10-20)    | `titleLevel` 1 to 6; AlertDialog `size` is `'sm'` or `'md'` (default `sm`); AlertDialog has no close button and no `initialFocus`; the close button is a `ghost` Button, `size="sm"`; `className`, native attributes and the ref go on the `<dialog>`; `onCancel`, `onClose`, `autoFocus`, `tabIndex` and `aria-modal` are typed `never`; the `data-state` values and the 11 `--senui-dialog-*` tokens are public; `returnValue` exists only on a form close; the helper types are exported | Not asked first. Emil reviewed the list and kept every choice as written                                                                                                                                                                                                                  |
| Footer close, aligned with AlertDialog (2026-10-21) | in: optional `cancelLabel` on Dialog renders a Cancel first in the footer that closes with reason `'cancel'`. It is the same button as AlertDialog's, rendered once in `ModalDialog`. The consumer's `footer` actions close the dialog themselves by setting `open`                                                                                                                                                                                                                         | Emil: a Cancel put in the footer didn't close the dialog, while AlertDialog's did. Rejected: `footer` as a render function, wrapping the footer in `<form method="dialog">` (Button defaults to `type="button"`, so easy to miss), and a `DialogClose` component (a new public component) |

### Found in the browser runs (2026-10-20)

- **WebKit doesn't focus a button on a mouse click** (Safari's platform behaviour, also Firefox on macOS), so a click-opened dialog had no trigger to return to. **Resolved (Emil, 2026-10-20):** a document-level `pointerdown` listener (installed once per document while a dialog is mounted) remembers the pressed control. At open, when focus is on `<body>` or on the parent dialog, a press under a second old stands in for the trigger. `restoreFocus` now focuses a connected trigger even when native return already put focus elsewhere (WebKit returns to the outer dialog). Mouse-path browser tests pass in all three engines and fail in WebKit without the fallback. Still a known issue: a dialog mounted only after the click, or opened more than a second after it.
- **WebKit scrolls a focused control 2 to 3 px short of `scroll-padding`.** The 2.4.11 check allows 4 px: the criterion (AA) is about a control being entirely hidden. That slack would no longer catch a regression the size of deviation 9's (2 px). Losing the padding entirely (a full footer height) still fails.
- **Firefox sends Tab past the last control to the browser UI** rather than wrapping (plan #12, known issue). The reflow test starts from the dialog, where Tab reaches the close button first in every engine.
- **Dead tests found by probing** (rule 36): the exit tests passed with no exit wait, and nothing failed with Esc no longer prevented. They now assert the time from `closing` to `closed`, and a controlled owner's veto in a real browser. Both probes fail as intended.

### Review (2026-10-21)

The `review-component` workflow ran `component-api-reviewer`, `wcag-auditor` and `modern-web-curator`
read-only over Dialog, AlertDialog and `internal/dialog/`. It returned 14 findings, 10 of them
distinct, and no reviewer was left unreviewed. Emil accepted all 10, rejected none and escalated
none, so there are no `OVERRIDES.md` rows. Applied:

- **A. A forced close is reported, as the new reason `'forced'`** (all three reviewers). A second Esc
  with no user action between, or a `close()` on the element, closed the dialog without telling the
  owner, so `open` stayed true and the trigger stopped working. `onClose` now reports
  `onOpenChange(false, { reason: 'forced' })`, and the unsaved-changes recipe accepts it. Tested by a
  unit test and a `ref.close()` browser test, which both fail without the report. A double-Esc
  browser test asserts the owner's state agrees with the dialog either way; headless Chromium did
  not force the close on the second Esc, so that test checks consistency, not that the browser forces.
- **B. Controlled needs `onOpenChange`**: `DialogOpenState` is a union shared by both components,
  and `open` with `defaultOpen` is rejected. The dev warning stays for JavaScript consumers.
- **C. AlertDialog `action` is a `ReactElement`**, so plain text no longer compiles (api, a11y).
- **D. Fullscreen sets its geometry directly**, not through the public tokens, so a theme's
  `--senui-dialog-inline-size`, `-viewport-gap` or `-radius` no longer un-fullscreens it (api,
  platform). A browser test sets all three on the dialog, and the old CSS fails it.
- **E. `hideCloseButton` requires another visible way out** (`cancelLabel`, `footer` or
  `dismiss="any"`), because a touch screen has no Esc. The NoTitleNoCloseButton story uses
  `cancelLabel="Done"`.
- **F. Short viewports reset `scroll-padding-block` to 0**, since nothing sticks there. This is
  asserted in the 320 × 256 test, and the old CSS fails it.
- **G. Type tests** for the remaining `never` and name-conflict cases on both components.
- **H. AlertDialog's contract** lists the Tab-to-browser-UI known issue and matches Dialog's Tab row.
- **I. Stories:** AlertDialog FocusVisible (a play function: Cancel has focus), ActionLoading and
  RightToLeft, and Dialog FooterLoading. The unit and browser axe loops cover them.
- **J. Exact NVDA speech** (Emil's Speech Viewer, NVDA in Danish), recorded in AlertDialog's contract.
  - On open: "Delete project? dialog Its files and history are deleted for everyone. This can't be
    undone.", then "Cancel knap".
  - On close: "Delete project knap".
  - NVDA says "dialog" for the alertdialog role. A CDP probe shows Chromium exposes `alertdialog` with
    its name and description, and leaves the inert page out of the tree.
  - Dialog (Emil, 2026-10-21): on open "Edit profile", then the heading, Close and the body; on close "Open dialog knap". NVDA 2026.2 (2026.2.0.57764) is recorded in both contracts.
  - Not heard: the announcement for `finalFocus` (browser-tested only).

### Cross-module notes

- **L01:** new tokens `color.bg.backdrop` (a translucent surface: black at 50 %, 70 % in dark mode, `surface: true`) and `size.dialog.sm/md/lg` (24, 32 and 48 rem), plus primitive `black.70`. Drafted by Claude for Emil's review.
- **L02:** `packages/react/src/internal/` is grouped by concern (`a11y/`, `dev/`, `dialog/`, `dom/`, `field/`, `state/`, `testing/`) with a README (Emil, 2026-10-20; its own commit). Side effect: `check-a11y-contracts` now warns that Button, FormField and TextInput changed after their last manual runs, although only their import paths did. The warning keys on commit dates. A fix (ignoring commits that touch only imports) is L08 or tooling work.
- **L08:** custom browser commands (`packages/react/vitest.commands.ts`: backdrop wheel and click, reduced-motion emulation) are the first use of Playwright beyond Vitest's API. The a11y gate can reuse them.

## L07 — EmptyState

Plan synced 2026-10-20 and current at the start (2026-10-26). No ADR supersedes any of its 12
decisions. L02 and L06 have newer plans upstream; both modules are done, so no re-sync first.

| Deliverable / criterion                                     | Decision                                                                                                                                                                                   | Reason                                                                                                                   | Re-include when                          |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| Component, CSS, contract, tests, stories                    | in, Claude writes and Emil reviews                                                                                                                                                         | Emil, 2026-10-26, as in L03 to L06. Public-API choices go to Emil as questions before they are written                   | n/a                                      |
| Container breakpoint                                        | in: `rem`, through a new ADR that extends ADR-0015 to size container features. `check-component-css.mjs` rejects any other unit in an `@container` condition                               | Emil, 2026-10-26. A probe showed Stylelint checks no unit in an `@container` condition (`px` and `em` passed): see § L02 | n/a                                      |
| Illustration size                                           | in: new semantic `size.illustration.sm/lg`, Claude drafts and Emil reviews; `--senui-empty-state-*` component tokens default to them                                                       | Emil, 2026-10-26. Nothing in the token set fits; same path as `size.dialog.*` (L06)                                      | n/a                                      |
| Playwright axe on `#storybook-root`, forced-colours capture | in, as L03 to L06: axe on every composed story in unit and browser tests (with `heading-order` on for the page and card stories), and a `ForcedColors` story with `forcedColors: 'active'` | Emil, 2026-10-26: one harness. A second runner and the screenshot are L08 work                                           | L08 builds the Playwright gate           |
| Screen-reader runs                                          | in: NVDA (Windows), as in L05 and L06                                                                                                                                                      | Emil's setup                                                                                                             | Someone runs JAWS, VoiceOver or TalkBack |
| Loading state, error pages, illustration set, auto-use      | out, as the plan says                                                                                                                                                                      | Plan, Out of scope and decision 5                                                                                        | The plan's own triggers                  |

### Public API (Emil, 2026-10-26)

| Choice                                              | Decision                                                                                                                             | Reason                                                                                                                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Breakpoint                                          | in: `30rem` container inline size. Narrower is compact, wider is stacked and centred                                                 | Emil. A card or sidebar is compact; a page column or wide card is stacked                                                                                            |
| Compact                                             | in: a start-aligned row, the illustration at the inline start, with the heading, description and actions in a column beside it       | Emil. Saves height in table cells                                                                                                                                    |
| Empty title                                         | in: a once-per-component development warning for `""` or whitespace; the heading still renders                                       | Emil. The type rules out `null` and `false`, not empty strings (principle 1)                                                                                         |
| Description                                         | in: `description?: ReactNode`, rendered in a `<p>`; the JSDoc says phrasing content only                                             | Emil. Same type as Dialog's description; the plan's `<p>`                                                                                                            |
| `role`                                              | in: not accepted (L02's `NativeProps`); `aria-live` still passes through, and the contract says overriding it is the consumer's call | Emil: "roles are context dependent, components are intended to be independent". A consumer who wants a landmark wraps EmptyState in their own `<section aria-label>` |
| `aria-label`, `aria-labelledby`                     | in: typed `never`, locked by a type test                                                                                             | Emil. Naming is prohibited on a role-less `<div>` (ARIA `generic`), so a name there is never heard; the heading is the name                                          |
| Status debounce in the NoResults story (2026-10-26) | in: 1,000 ms, not the first draft's 300 ms; the contract tells consumers to update the status once typing pauses for about a second  | Emil's NVDA run: with key echo, typing was slower than 300 ms, and NVDA read a result after every letter                                                             |

### Deviations from the plan

1. **`--senui-*` tokens and classes, `EmptyState.css`, colocated stories, the `axe-core` helper and
   Vitest browser mode** in place of the plan's `--ds-*`, `empty-state.css`,
   `apps/docs/src/EmptyState.stories.tsx` and the Playwright run (as L03 deviations 2, 3 and 6, and
   L06 deviation 2).
2. **`role` can't be overridden** (plan #3 lets `role` and `aria-live` pass through). The plan was
   synced after L02 removed `role` from every component's native props, and Emil kept L02's rule
   (2026-10-26): a role depends on the context, and a component is meant to be independent of it.
   `aria-live` passes through as the plan says.
3. **`title` is `string | ReactElement`** as the plan says, narrower than Dialog's `Content`.
4. **The plan's "story tests" are browser tests that render the composed story** (no-results,
   deleted-last-item), because the suite doesn't run play functions; the stories keep their play
   functions for Storybook. Same harness as L03 to L06.
5. **Two browser tests the plan doesn't list:** the root fills a start-aligned grid and a flex row.
   Probing showed the table-cell criterion ("root width non-zero") passes with `inline-size: auto`
   too, because the story gives its cell a width; the `100%` matters in a parent that sizes items
   to fit. The new tests fail with `auto`.

### Review (2026-10-26)

The `review-component` workflow (API, accessibility, platform) over `components/EmptyState`: 14
findings, 13 distinct (the API and accessibility reviewers both found `tabIndex` on the root). Emil
accepted all 13, rejected none and escalated none, so `OVERRIDES.md` has no rows. Each fix's test
was probed against the old code.

- **A. `actions` is `ReactElement | undefined`** (plan #6 says `ReactNode`; a deviation). A string,
  `null`, `false` and an array are type errors; a fragment of Buttons and links still works, and a
  conditional action passes `undefined`. A development warning fires when `actions` contains nothing
  focusable.
- **B. `tabIndex` is `never`**, pointing to `headingRef`. Event handlers still pass through for
  delegation; the contract says never to make the root the only trigger of an action, and 2.1.1 and
  1.4.10 are now "enables".
- **C. The illustration wrapper is also `inert`**, set in the ref callback (React 18 drops a boolean
  `inert`), after the focusable check. A link in it is now unreachable for everyone, not only
  unannounced, and the warning explains why. The browser test that asserted axe's
  `aria-hidden-focus` now asserts no violation.
- **D. An empty-string description renders no paragraph.**
- **E. `--senui-empty-state-description-font-size`**: the fourteenth token.
- **F. Illustrations of any shape fit the box:** media at any depth fills it with
  `object-fit: contain`, and the wrapper clips. A proposed `> *` rule was dropped: probes showed
  the nested media rule alone fits a `<span>`-wrapped SVG and a `<picture>` in Chromium. New
  IllustrationShapes story.
- **G. Inline margin on EmptyState overflows** (`inline-size: 100%` doesn't cover margin):
  documented in the contract and the JSDoc ("put inline margin on a wrapper"). Re-open when
  `inline-size: stretch` ships unprefixed in Chromium, Firefox and WebKit.
- **H. `adaptation.forcedColors` is `'no-states'`**: no border or fill marks a state, and the focus
  ring is an outline, which forced colours keep.
- **I. A contract can say its element has no name** (`semantics.name: 'none'`, L02 tooling), and
  the check then doesn't require `labelInName`. EmptyState drops the sentence.
- **J. `aria-describedby`, `aria-description` and `aria-roledescription` are `never`**: never read
  on an unnamed, unfocusable `<div>`, and the last is prohibited there (ARIA 1.2).
- **K. 2.1.1 and 1.4.10 are claimed as "enables"** (with B and G).
- **L. The warnings follow value changes**: the title check is keyed to `title`; the illustration
  and actions checks are inline ref callbacks that run after every commit.
- **M. DeletedLastItem sets its status after the focus move** (NVDA read it twice before). A browser
  test reads the status at the moment focus lands. To be re-heard by Emil.

### Cross-module notes

- **L01:** new semantic tokens `size.illustration.sm` (2.5 rem) and `size.illustration.lg` (5 rem),
  drafted by Claude for Emil's review (2026-10-26).
- **L02:** `firstFocusable` moved from `internal/dialog/useModalDialog.ts` to
  `internal/dom/focusable.ts`, since EmptyState's illustration check uses it too. Dialog imports it
  from there; nothing else changed. The container-query guard gap is under § L02, "Defects found
  later" (ADR-0016).
- **L02 (resolved in the review, I):** `A11yContract`'s `semantics.name` can be `'none'` for an
  element with no accessible name, and `contractErrors` then doesn't require
  `RESPONSIBILITIES.labelInName`. Tested in `a11y-contracts.test.ts`. L09's generator must handle
  the `'none'` value when it renders the name row.
- **L08:** the `ForcedColors` story carries `forcedColors: 'active'` (compact and stacked side by
  side). The browser tests set the viewport with `page.viewport()` because the runner's default
  414 px is below the 30rem breakpoint; a Playwright gate over Storybook will hit the same.
