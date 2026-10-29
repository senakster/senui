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
- **Harness change, 2026-10-27 (with L08's close, Emil): docs-only changes skip the expensive CI.**
  - **The problem:** `main`'s ruleset requires `verify` and has no bypass, so `[skip ci]` would
    leave such a PR unmergeable.
  - **Pull requests:** `ci.yml`'s `verify` lists the changed files. When every one is under
    `docs/` or ends in `.md`, it runs only `pnpm format:check` and skips the check, tests, Storybook
    build and gate, and still reports.
  - **Pushes to `main`:** `ci.yml` and `gate-full.yml` ignore the same paths.
  - **Probed** locally with seven file lists. A workflow file, `apps/docs/`, or a mix with code
    runs everything, and an empty diff runs everything too. The docs-only path itself is unproven
    in CI until the first docs-only PR.

### Package names (Emil, 2026-10-26)

The packages are renamed before the first publish: **`@senakster/senui`** (components, was
`@senakster/react`) and **`@senakster/senui-tokens`** (tokens, was `@senakster/tokens`). The names
say which library they belong to, and the tokens stay a separate package, so a non-React consumer
can use them alone. Rejected: one combined package; and renaming only the components. Nothing had
been published, so no deprecation was owed.

The directories stay `packages/react` and `packages/tokens`. The implementation log, this file and
the PROGRESS changelog keep the old names where they record history.

### Defects found later

- **2026-10-27 (found in L08): dark-theme stories were never measured against a themed page.** The
  Storybook preview set no page background, and the library styles none (only `[data-theme]`
  subtrees, ADR-0005), so a dark-theme story sat on the browser's canvas. Axe, which can't see the
  canvas, measured dark text against white (1.09:1) in 61 stories. The per-component browser tests
  check contrast in light only. Fixed with `apps/docs/.storybook/preview.css`, which gives `body`
  the theme's background and text tokens, as a consumer page would. Also from L08: the CI `verify`
  job now runs the gate (`pnpm --filter docs exec playwright test`) and uploads its results on
  failure, and `pnpm test:gate` runs it locally. It isn't part of `pnpm check`: it builds Storybook
  and runs browsers (scope-decisions § L08).

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
- **2026-10-27 (found in L08 PR 4): a controlled mount set state during render, which broke
  hydration ids under React 18.3.** `useControllableState` started its internal copy from
  `defaultValue` and synced it to the controlled value during render, so every controlled component
  rendered twice on mount. Under React 18.3, a render-phase update on mount in a component that calls
  `useId` (ModalDialog, every form control through `useFieldWiring`) can make server and client
  disagree on its descendants' ids. L08's hydration test failed on Dialog's Form story (FormField's
  label `htmlFor`). A probe matrix of 16 Dialog shapes under 18.3 failed only with a controlled
  `open`, and never with `defaultOpen`. React 19 is clean. Fixed by starting the internal copy from
  the controlled value. No public behaviour changes: the copy was only ever read after a switch to
  uncontrolled. A unit test locks one render on mount, and it fails with the old line (probed).
  CONVENTIONS rule 5 records the rule. A code edit outside `components/**` (Emil chose the fix,
  2026-10-27).

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
- **L08 PR 4 (open, Emil deferred it, 2026-10-27):** TextInput's contract row "Home, End: moves the
  caret to the start or end" isn't true on macOS, where Home and End don't move the caret in a text
  field. The key-titled test passes in Chromium on Windows and Linux. Settle the row with
  `wcag-auditor`: make it platform-specific, or drop it. Found by `component-api-reviewer` (M1).

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

### Defects found later

- **2026-10-27 (found in L08): Switch's thumb didn't mirror in right-to-left text in a production
  build.** The `:where(.senui-switch__control:checked:dir(rtl))::before` rule was correct in source,
  and every per-component test passed on source CSS. Vite's default production build lowers `:dir()`
  to a `:lang(ar, ckb, fa, he, …)` list, so a `dir="rtl"` page in any other language left the thumb
  on the left-to-right side. Found by the L08 gate's runtime RTL check over the built Storybook.
  Fixed by ADR-0018: the thumb moves with `margin-inline-start`, a logical property that mirrors
  natively; Stylelint now rejects `:dir()`. Reduced motion is unchanged (the duration is scaled, the
  thumb still jumps the whole way).

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

### Defect found after done (2026-10-28, by the L10 plan review)

- **The defect:** `internal/dialog/ModalDialog` renders `Button` (the close button and the footer's
  Cancel), but `Dialog.css` didn't import `Button.css`.
  - **Who it hit:** a consumer who loaded per-component CSS (`tokens.css` plus `styles/Dialog.css`
    or `styles/AlertDialog.css`) got browser-default buttons, 21 px tall, under the 24 px target
    minimum (WCAG 2.5.8).
  - **Who it didn't:** consumers of `styles.css` and the gate, which loads the whole stylesheet.
- **Why nothing caught it:** every check loaded `styles.css`. The generator's `cssIncludes` is
  derived from the stylesheet's own `@import`s, so it can't notice a missing one.
- **Fix (Emil):** `@import '../Button/Button.css';` at the top of `Dialog.css`.
  - **Probe:** Chromium, `tokens.css` plus one Dialog stylesheet. The built file gives a 32 px
    button with token padding, radius and colour. A copy without the import gives the 21 px
    default.
  - **The first version** misspelled the file (`Buttton.css`); `check-dist-css` failed it, as it
    should.
- **No patch changeset:** nothing is published yet. The pending `add-dialog` changeset now says
  `styles/Dialog.css` brings Button's styles.
- **The guard:** L10 decision 11 compares each stylesheet's `@import`s with the components its JS
  renders, and reverting this line is one of its probes.

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

## L08 — Test & a11y gate

Plan written in the planner on 2026-10-27 with Emil (harness shape, CI engines, screenshot scope,
reset check, React 18.3 job, `essentialMotion`), reviewed by `wcag-auditor` and
`modern-web-curator` (21 findings, all adopted), and synced the same day; the re-sync also brought
newer L02, L06 and PLAN copies (both modules done). No ADR contradicts the plan: ADR-0007/0009's
built-in Stylelint rules fit decision 10, and L02's React 18.3 peer range is what decision 9a tests.

Sizing at the start (step 2b): 113 stories over 9 components, 11 with play functions; 22 contract
keys and no key-titled browser test; no browser test for Switch or CheckboxGroup; no physical CSS
property in component CSS; runtime dependencies are the tokens package only.

| Deliverable / criterion                       | Decision                                                                                                                                                                                                                                                               | Reason                                                                                                                                         | Re-include when                                |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Gate harness and every check in the plan      | in, Claude builds and Emil reviews                                                                                                                                                                                                                                     | Harness work, not pair mode                                                                                                                    | —                                              |
| Edits in component folders the gate needs     | in: Claude makes them, each listed here; a public-API change goes to Emil first                                                                                                                                                                                        | Emil, 2026-10-27. Key-titled browser tests (22 keys, new Switch tests), `forced-colors` tags, Button's `essentialMotion`, fixes the gate finds | —                                              |
| Defects the gate finds in existing components | in: fixed in L08, recorded under the earlier module's section                                                                                                                                                                                                          | Emil, 2026-10-27                                                                                                                               | —                                              |
| Delivery                                      | in: four PRs. 1) harness, CSS marker, render wait, axe, semantics; 2) target size, reflow, text spacing, motion and its ADR, RTL, tab walk, ring, resets; 3) forced-colours screenshots, container, CI workflows; 4) SSR, hydration, React 18.3, keyboard traceability | Emil, 2026-10-27: each green and reviewable alone; L08 is done after the fourth                                                                | —                                              |
| Gate in `pnpm check`                          | out: the gate runs in CI and as `pnpm test:gate`; `check:components` gains the fast static checks (keyboard traceability)                                                                                                                                              | The gate builds Storybook and runs browsers: slow and needs browsers (skill, "Did this module change what done means")                         | The gate gets fast enough to run on every save |

### PR 1 (2026-10-27): harness, CSS marker, render wait, axe, semantics

- **Day-one probes settled:** Playwright's loader imports the contracts directly (their `.js`
  suffixes resolve to `.ts`), so there is no `contracts.json`. The installed Storybook (10.6.2) emits
  `storyRendered`, `storyErrored`, `storyThrewException`, `playFunctionThrewException` and
  `storyMissing` on the preview channel, as planned. (The forced-colours palette probe belongs to
  PR 3.)
- **The CSS path, verified both ways:** the preview imports `@senakster/senui/styles.css`; in
  development `viteFinal` aliases it to the source (Vite resolves it to
  `packages/react/src/styles/index.css`), and production builds bundle `dist`. A rule added only to
  `dist` reached the built Storybook; the `senui-css` marker is set in production only.

#### Deviations from the plan

1. **`@types/node` 24.9.2 is a second dev dependency** (decision 13 names only `@playwright/test`).
   Types only, matched to `.node-version`: the gate's files use `node:fs`, `node:module` and
   `process`.
2. **The render wait also waits for every finite animation to finish.** Axe first reported a dialog
   title as obscured: it ran during the enter animation (rule 42). Infinite animations (a spinner)
   are left running; PR 2's motion checks record animations from first paint separately.
3. **Axe reports incomplete contrast as `color-contrast:incomplete`**, its own id, so an exception
   can excuse only what axe couldn't compute and never a contrast violation (a narrowing of
   decision 12).
4. **Semantics allows a story that renders no element of its component** (a scenario story such as
   EmptyState's NoResults shows it after an interaction); each component's first story must render
   it, so a contract naming the wrong element can't pass by matching nothing.
5. **CI runs the gate on `ubuntu-latest` in Chromium** until PR 3 moves it into the pinned container.

#### Component-folder edits (Emil's authorisation, 2026-10-27)

- `Dialog.stories.tsx`: `gate-skip-axe` tags on Fullscreen and LongContent, with entries in
  `apps/docs/gate/exceptions.json` expiring 2027-04-27. Axe 4.14 reports their sticky title as
  partially obscured and names no obscuring element; once animations finish, the title is the
  topmost element at every sampled point. Its colours are `fg.default` on `bg.raised`, a pair the L01
  token build checks in both themes. Only `color-contrast:incomplete` is excused.

#### Probes

Each failed as intended, and everything was restored in the same command:

- A low-contrast rule in `dist` only fails every EmptyState story with a description, in light and not dark.
- A new probe story, unknown to the gate, is checked: a throwing play function and a `console.error` fail at render, and an image without `alt` fails axe.
- Removing Switch's `role` from its contract fails all 10 Switch semantics tests.
- An expired exception fails the bookkeeping test.
- Stripping the `senui-css` marker fails a story before any check.

#### Verified

`pnpm check`; `pnpm test` (tokens 32, react 648); `pnpm test:gate` 351/351 (Chromium).

### PR 2 (2026-10-27): target size, reflow, text spacing, motion, RTL, tab walk, ring, resets

- **ADR-0017** (amends ADR-0008, whose revisit trigger fired): an optional `adaptation.essentialMotion`
  (`'progress-rotation'`, with `reducedMotion: 'motion-factor'` only; type-tested). Button declares
  it for its loading spinner.
- **ADR-0018** (Emil, 2026-10-27): component CSS never uses `:dir()`, enforced by Stylelint's
  built-in `selector-pseudo-class-disallowed-list`. Found by the gate's runtime RTL check (below).
- **Stylelint (decision 10, static):** physical inline properties (`margin-left`, `left`, `float`,
  `clear`, `border-left-*`, `border-top-right-radius`…), `text-align: left|right`, and four-value
  `margin`/`padding`/`inset`/`scroll-*`/`border-radius` shorthands are rejected. Probed both ways
  (20 forms); component CSS was clean.
- **Gate specs:** `adaptation.spec.ts` (target size at 1280 and 320 px, reflow at 320 px, text
  spacing, RTL mirroring), `motion.spec.ts`, `tab-walk.spec.ts` (6a, 6b, both viewports),
  `resets.spec.ts`; in-page helpers in `gate/browser/measure.js`.

#### Deviations from the plan

1. **Reflow is measured per component, not per document:** the component may not scroll sideways,
   its content stays inside it (or inside a clipping box within it), and it fails for its own width
   only when it pushes a container that fits the viewport past the viewport. Stories lay components
   in fixed-width scaffolding (side-by-side comparisons, a `12ch` box), which a document-level check
   would report as the component's fault.
2. **The RTL runtime check flips `dir` on `<html>` after render** (`:dir()` restyles live) and waits
   for finite animations; infinite ones are paused at their first frame for both snapshots. Stories
   that set their own `dir` are skipped.
3. **Motion is judged by the owning component's contract:** an animated element belongs to its
   nearest component root (a Button's spinner inside a Dialog is judged by Button's contract).
4. **The control-boundary check (1.4.11) applies to targets only**, not to a focused container (a
   dialog, a heading focused by script), and skips `aria-disabled` controls.
5. **"Painted over" follows CSS paint order**, not hit-testing: outlines aren't hit-testable, and a
   sticky header's descendant's ring paints over the non-positioned body below it.
6. **The reset fixtures are written in-house** (normalize-style, preflight-style), not vendored: the
   project names no third-party products in fixtures (CLAUDE.md), and the MIT licences of the
   well-known resets name their authors.
7. **`truncates` on a non-input** (its full value in the accessible name) is not implemented: no
   component uses it. Re-include when one does.
8. **The text-spacing overlap rule compares text within one layer:** a sticky header or footer covers
   content scrolling under it by design.
9. **A story whose only errors are OS socket failures loads once more.** Full local runs on Windows
   failed single stories with `net::ERR_NO_BUFFER_SPACE`, then `net::ERR_ADDRESS_IN_USE` (a fresh
   context per test exhausted local ports; capping workers at four didn't prevent it, and CI on
   Linux never saw it). Any other error, or the same one twice, still fails; probed all three ways.
   Not Playwright retries, which would also hide a story's own nondeterminism. `openStory` also
   stopped stacking listeners and init scripts when a test reopens a story.

#### Defect found (Emil: fixed in L08)

- **Switch's thumb didn't mirror in a consumer's production build.** Vite's default build lowers
  `:dir(rtl)` to a `:lang(ar, he, …)` list. Fixed by moving the thumb with `margin-inline-start`
  (ADR-0018); recorded under L05. A component-folder edit (`Switch.css`).

#### Component-folder edits (Emil's authorisation)

- `Button.a11y.ts`: `essentialMotion: 'progress-rotation'` (ADR-0017).
- `Switch.css`: the thumb moves with `margin-inline-start`; the `:dir(rtl)` rule is gone (ADR-0018).

#### Probes

Each failed for its own reason, and everything was restored:

- **Built CSS, batch A:** a 16 px small button fails target size. A moving EmptyState title fails motion in both modes, and Button's spinner without `essentialMotion` fails under reduce. A 500 px description fails reflow, and a 600 px paragraph fails it inside the top-layer dialog. A physical `margin-left` on the checkbox label fails RTL. A transparent TextInput ring and a Switch ring below 3:1 fail the tab walk. A fixed-height, clipping FormField description fails text spacing. A reset fixture that kills outlines fails every component's reset test.
- **Probe stories:** a button inside `aria-hidden`, an unnamed button, a button covered by a fixed overlay (both viewports), and a clipped ring each fail the tab walk.
- **Batch B:** a 2 px pair of 16 px targets under `spacing-exception` fails, and the same pair 40 px apart passes. A raw button in EmptyState's actions fails `not-a-target`. An `!important` ring "still shows" under both resets that should remove it.
- **The batch-B ring probe first passed:** the reset check treated opaque black, `rgb(0, 0, 0)`, as transparent (a string test for `" 0)"`). Fixed to read alpha through the canvas, then re-probed.

### PR 3 (2026-10-27): forced colours, the pinned container, three engines on main

- **Story tags:** the nine stories that carried `parameters.forcedColors: 'active'` (one per component)
  now carry the tag `forced-colors`, which Storybook's `index.json` exposes; comments updated.
  Component-folder edits, one line each, under Emil's authorisation.
- **`gate/forced-colors.spec.ts`:** a screenshot of each tagged story in light and dark (Chromium,
  forced colours emulated), and decision 6b's ring and boundary checks under forced colours on every
  story. **`gate/walk.ts`** holds the tab walk both specs share.
- **Bookkeeping:** a component whose `forcedColors` is `border` or `system-colour` must have a
  `forced-colors` story.
- **Workflows:** `ci.yml`'s `verify` job runs in `mcr.microsoft.com/playwright:v1.64.0-noble` (no
  browser install step); `gate-full.yml` runs the gate in Chromium, Firefox and WebKit on a push to
  `main`, nightly and on demand; `update-snapshots.yml` regenerates the baselines with the gate's own
  command and uploads them, on demand or when a pull request gets the `update-snapshots` label.
- **Config:** `snapshotPathTemplate` without a platform; `updateSnapshots: 'none'` in CI.

#### Deviations from the plan

1. **The screenshot is of the whole page**, not `#storybook-root`: a modal dialog is in the top
   layer, outside the root's box.
2. **The forced-colours ring check runs on every story**, not only the tagged ones: it measures, so
   it needs no baseline, and it costs one page per story.
3. **The update workflow also runs on a labelled pull request.** A `workflow_dispatch` workflow can
   only be started once it is on `main`, so the first baselines (and any update made on a branch)
   come from labelling the pull request; a pull request's workflows come from its own branch.
4. **The first baselines were generated locally, in the pinned image:** `mcr.microsoft.com/playwright:v1.64.0-noble`
   under Docker (Emil started Docker Desktop). The working tree was copied in without
   `node_modules`, because those are Windows builds. Inside it ran the lockfile install, the build,
   the Storybook build and the update workflow's own command. CI's first run compares against them,
   which tests reproduction across machines. The `update-snapshots` workflow stays the normal path
   for later updates.
5. **The container runs as root**, so `HOME=/root` (Firefox needs it) and `--ipc=host` (Chromium in
   Docker), as Playwright documents.

#### Probes

- **Forced colours only:** a ring removed only under `forced-colors: active` (Button, built CSS)
  fails the forced-colours ring check on every Button story and on Dialog's story whose only
  controls are Buttons, while the normal tab walk passes.
- **Bookkeeping:** removing Switch's `forced-colors` tag fails the bookkeeping test.
- **Reproduction:** in a fresh container, all 18 screenshots match the baselines with
  `updateSnapshots: 'none'`.
- **A hidden state is a diff:** with a checked checkbox drawn as unchecked in forced colours (its
  `::before` box and `::after` tick, in the built CSS), both Checkbox screenshots fail, 282 and
  317 px. A first probe recoloured the control element itself, which its `::before` covers, so
  nothing changed visibly and it passed: a wrong probe, found by looking at the baseline.
- **Light against dark (decision 7's day-one probe):** all nine pairs differ, as distinct
  high-contrast palettes (black on white with dark-red disabled and navy pressed; white on black with
  green disabled and cyan pressed). Both are kept.

### PR 4 (2026-10-27): SSR and hydration, React 18.3, keyboard traceability

- **Emil's calls (2026-10-27):** a test covers several keys by listing them before the colon,
  comma-separated (`'Tab, Shift+Tab: …'`). The React 18.3 job swaps React in on the runner with
  `pnpm add`, so nothing extra is committed.
- **`scripts/check-keyboard-trace.mjs`**, run by `check:components`. It parses the browser tests with
  the TypeScript compiler API (regex literals in test bodies rule out a bracket matcher). The 22 keys
  are now traced by key-titled tests in seven components.
- **Vitest `ssr` project** (`src/internal/ssr/`): every composed story rendered with `renderToString`
  in Node, failing on a throw or a console warning. It writes the markup and a manifest (this run's
  id, and the story ids) to `.ssr-fixtures/`. `hydrate.browser.test.tsx` hydrates each story and
  fails on `onRecoverableError` or `console.error`, and refuses markup from another run. Ordered by
  `sequence.groupOrder`.
- **React 18.3 job** in `gate-full.yml` (main and nightly): the unit, ssr and browser projects, with
  `SENUI_EXPECT_REACT=18.3.1`, which each project asserts from inside its tests.

#### Deviations from the plan

1. **The run id is shared through `globalThis`**, because Vitest evaluates `vitest.config.ts` more
   than once per process (the first full run had two ids 64 ms apart).
2. **Fixture ids are compared as sets**: Node and the browser order `import.meta.glob`'s matches
   differently.
3. **The React 18.3 job doesn't swap `@types/react`**: it proves runtime behaviour only. That is said
   in the workflow and in CONVENTIONS rule 10 (review finding R2).
4. **Main's first three-engine run (PR 3's workflow) failed 5 of 3,918 tests**, all fixed here:
   - Firefox: Storybook's own loading spinner (`.sb-wrapper`) was recorded as the story's motion.
     The motion check now skips `.sb-wrapper`.
   - WebKit, two failures: Checkbox's RequiredSubmit story used a raw `<button>`, which failed
     contrast and the boundary check in dark mode. It is senui's Button now.
   - WebKit, two failures: it scrolls a Tab-focused element into view at the next rendering update,
     so the tab walk measured inputs below the fold as off screen. Probed in the pinned image: right
     after the press `scrollY` was 0, two frames later 2, while Chromium had already scrolled. The
     walk waits two animation frames per stop.
   - Re-run in the pinned image, all three engines: 141 passed, 21 skipped. The Firefox fix rests on
     the code, not the re-run: the spinner appears only when a story is slow.

#### Defect found (Emil: fix it in ModalDialog's area)

- **Hydration ids under React 18.3**, from `useControllableState`'s render-phase update on mount.
  Recorded under L02, "Defects found later". Before the fix, React 18.3 passed 879 of 880, and only
  Dialog's Form story failed.

#### Component-folder edits (Emil's authorisation)

- New `Switch.browser.test.tsx`: Switch's share of Checkbox's `describe.each`, and the thumb tests,
  moved unchanged, with its Space test key-titled.
- `Checkbox.browser.test.tsx`: Checkbox only now, with its Space test key-titled.
- `AlertDialog.browser.test.tsx`: the AlertDialog behaviour block moved from Dialog's file, plus
  key-titled tests for Escape, Tab/Shift+Tab and Enter/Space.
- `Dialog.browser.test.tsx`: Escape and Tab/Shift+Tab tests retitled. The Tab loop presses literals.
  A new test for the arrow and page keys.
- `Button.browser.test.tsx`: two `test.each` rows became literal key-titled tests, with the same
  assertions.
- `TextInput.browser.test.tsx`: new tests for typing, Enter's implicit submission, and Home/End.
- `EmptyState.browser.test.tsx`: a new Tab, Shift+Tab test.
- `Checkbox.stories.tsx`: RequiredSubmit uses senui's Button.
- `useControllableState.ts` (outside `components/**`): the fix above, with a unit test.

#### Review (`component-api-reviewer`, 2026-10-27)

18 findings, none blocking. Emil accepted all of them, rejected none, and escalated none. M1 is
deferred to TextInput (see L04). No `OVERRIDES.md` rows.

- **Keyboard trace:** tests that may not run no longer count (`skipIf`, `runIf`, `fails`,
  `skip.each`, a `skip()` in the body). Only plain literals count. Modifiers are held across calls.
  Code-form modifiers are read, and a non-literal `tab()` option is an error. Contract keys must be
  inline literals. Almost-right key lists are errors, and the messages say what isn't read.
- **SSR:** the run-id manifest (S1). The setup file moved onto the unit and browser projects (S2).
  The `ssr` project asserts every component with stories contributes (S3).
- **React 18.3:** the in-test version assertion (R1) and the types note (R2).
- **Dialog's scroll test** waits for each scroll to start before it settles (M2).

#### Probes

Each failed for its own reason, and everything was restored:

- **Traceability:**
  - a key pressed only in a differently titled test;
  - `test.skip`, `test.skipIf`, `describe.skip`, `describe.skip.each`, and `skip()` in the body;
  - a titled test that no longer presses its key;
  - `fill` instead of `type`;
  - a conditional press;
  - Shift held from an earlier call, and `[ShiftLeft>]`;
  - a non-literal `tab()` option;
  - `keys: CONSTANT`;
  - a lowercase or misspelt key list.
    Shift held across three separate calls now passes, where it used to fail wrongly.
- **SSR:**
  - text from `typeof window` fails hydration in 54 stories (55 once RequiredSubmit had a Button),
    under React 19 and 18.3;
  - a `typeof window` attribute fails, under React 19;
  - reading `window` during render throws in Node;
  - a plain `useLayoutEffect` fails the ssr project under 18.3, which warns (19 doesn't);
  - stale fixtures (a browser-only run) are refused;
  - an empty stories glob fails;
  - a throwing setup file no longer loads in the ssr project;
  - `SENUI_EXPECT_REACT=18.3.1` on React 19 fails all three projects.
- **useControllableState:** its one-render test fails with the old line.

#### Verified

- `pnpm check`.
- `pnpm test`: tokens 32, react 886, on React 19. The same 886 pass on React 18.3 with the version
  asserted.
- `pnpm test:gate`: 1,378 passed, 122 skipped (Chromium, with the walk's frame wait).
- The pinned image: the four failing stories in three engines.

### Done (2026-10-27)

PR 4 merged as #11.

- **On `main`:** the "Gate (all engines)" run passed: 3,918 tests in Chromium, Firefox and WebKit,
  33 min 46 s. The `react-18` job ran in CI for the first time and passed: 886 of 886 on React
  18.3.1, with the version asserted in every project. CI passed.
- **PR gate budget (Emil, 2026-10-27):**
  - **The baseline:** PR #11's `verify` job took 10 min 35 s, of which the gate step took 8 min 41 s.
  - **The budget:** the gate step is held to 10 minutes. A PR whose gate step goes over is reviewed.
  - **Deviation:** the option Emil chose put `timeout-minutes: 15` on the job. It is on the step
    instead, because on `main` the whole job took 13 min 20 s (both workflows share the runner pool),
    which a job-level 15 would barely clear. The step timeout only stops a hang.
- **Acceptance criteria:** all met, with three narrowings in the earlier PRs' deviations:
  - truncation of a non-input isn't implemented (PR 2, deviation 7);
  - screenshots run only in the pinned container (PR 3);
  - the 18.3 job covers runtime, not types (PR 4, deviation 3).
- **Open, not L08's:** TextInput's Home/End row on macOS (see L04, cross-module notes).
- **CI for docs-only changes:** a fast path (see L00, cross-module notes); this record's own PR ran in full, because it edits the workflows.
- **No nightly run (Emil, 2026-10-27):** `gate-full.yml` loses its schedule, a deviation from decision 11. Every push to `main` still runs the three engines and React 18.3, and a run can be started by hand (`workflow_dispatch`). Re-include it when a dependency (a browser in the pinned image, a React patch) changes without a push to `main`.

### After done: the three-engine workflow is disabled (2026-10-28)

- **The deviation:** "Gate (all engines)" (`gate-full.yml`: the gate in Firefox and WebKit, and
  the React 18.3 job) is disabled on GitHub. This deviates from decisions 11 and 9a.
- **Emil's words:** "disabling due to budget concerns. checks done locally and manually until
  further notice."
- **What CI runs now:** pull requests and pushes to `main` run only the Chromium `verify` job.
- **How it surfaced:** the disabled workflow left #13 and #14 without the three-engine run, found
  while checking their merges.
- **What says so:** the published gate run (L09's generator) says Firefox and WebKit runs are made
  on demand, and the workflow comments, `playwright.config.ts` and CONVENTIONS rule 10 say the
  same.
- **Re-include when:** Emil says the budget allows it. Then run `gh workflow enable
gate-full.yml` and update the published wording in `scripts/docs/evidence.mjs`.

## L09 — Docs & machine-readable manifest

Plan written in the planner on 2026-10-28 with Emil:

- Emil's calls: the manifest source, where it is published, typed `.docs.ts`, how unreleased site
  builds are marked, enum growth, the run language, and composition rules.
- Review: `component-api-reviewer`, `wcag-auditor` and `modern-web-curator` read it against this
  repo (about 70 findings, all accepted, two moved to Out of scope).
- Synced the same day. No ADR contradicts the plan; ADR-0017's forecast (`essentialMotion`
  published with the contract) is decision 5.

Sizing at the start (step 2b):

- 9 components, 19 entry exports;
- 50 lines of published contract strings that cite private planning references, review notes or
  names, in all nine contracts;
- 10 screen-reader runs that need `language`;
- no `.docs.ts` files.

The entry exports every component's props type. A one-line grep first suggested three were missing: they sit in multi-line `export type { … }` blocks.

| Deliverable / criterion                            | Decision                                                                                                                                                                                                                                                                                                                                                                                                             | Reason                                                                                       | Re-include when                                                                   |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Everything in the plan                             | in, Claude builds and Emil reviews                                                                                                                                                                                                                                                                                                                                                                                   | Harness work                                                                                 | —                                                                                 |
| `<Name>.docs.ts` and `USAGE.md` (plan decision 11) | in: Claude drafts all of them; Emil reviews                                                                                                                                                                                                                                                                                                                                                                          | Emil, 2026-10-28                                                                             | —                                                                                 |
| Component-folder edits                             | in: `.docs.ts` files, contract cleanup and `language`,. Each is listed here                                                                                                                                                                                                                                                                                                                                          | The module's inputs live there; Emil's choice above                                          | —                                                                                 |
| Removing the nightly gate run                      | in, PR 1 (commit `ff1e616`)                                                                                                                                                                                                                                                                                                                                                                                          | Emil, 2026-10-27: it missed #12's merge; folded into L09 rather than a separate PR           | —                                                                                 |
| Delivery                                           | in: four PRs. <ol><li>Data foundations: nightly removal, the `language` ADR and field, the contract cleanup, `ComponentDocs`, 9 `.docs.ts` files, `USAGE.md`</li><li>Generator: the manifest and mirror types, props by axis, `components.json`/`llms.txt`/`docs/*.md`, `exports`, determinism and data checks</li><li>Storybook docs pages: template, blocks, theme, gate</li><li>The GitHub Pages deploy</li></ol> | Emil, 2026-10-28: each green and reviewable alone; the content Emil reviews most comes first | —                                                                                 |
| Gating Storybook's manager frame                   | out (plan)                                                                                                                                                                                                                                                                                                                                                                                                           | Emil, 2026-10-28                                                                             | A reader reports a navigation barrier, or a Storybook upgrade regresses its frame |
| API diff check                                     | out → L10 (plan)                                                                                                                                                                                                                                                                                                                                                                                                     | Needs a published baseline                                                                   | L10                                                                               |

### PR 1 (2026-10-28): data foundations

- **The nightly gate run is removed** (commit `ff1e616`, cherry-picked).
- **ADR-0019** (Emil): screen-reader runs record their `language`. Emil extended it while it was
  still uncommitted: an announcement that quotes speech gives its language too, because Button
  has an English and a Danish run. Double quotes mark verbatim speech only; a quote inside inline
  code is code. Checkbox's run is Danish (Emil: the same session as Switch and CheckboxGroup).
- **The nine contracts:**
  - every screen-reader run and every quoting announcement has a `language`;
  - glosses are unquoted (`"til" means on`);
  - published strings no longer cite module plans, reviews or people. No `Lnn decision` reference
    had a public ADR, so each was dropped and the fact kept;
  - examples that were never heard are unquoted ("for example, Item deleted");
  - CheckboxGroup's relationship note describes the reading order instead of quoting Danish speech
    in a field that has no `language`;
  - an agent drafted the rewrite, and Claude reviewed it and restored two code spans.
- **`ComponentDocs`** (`src/internal/docs/component-docs.ts`), with type tests, and nine `.docs.ts`
  files drafted by Claude, for Emil's review.
- **Published-text rules** for contracts and `.docs.ts`, in `published-text.ts`: no private
  references, no Markdown beyond inline code, no accessibility claims in `summary` or
  `description`. A missing `.docs.ts` fails `check:components`.
- **CONVENTIONS:** rule 7 gains the language and quoting rules and the published-text rules; new
  rule 12 covers `.docs.ts`. CLAUDE.md lists ADR-0019.

#### Deviations from the plan

1. **No separate `USAGE.md` source.** The package README already is the usage guide, and npm
   shows it, so writing `USAGE.md` too would put every fact in two places (principle 8). The
   README stays the source. It gains server rendering, the conformance wording and "What senui
   doesn't do for your page". PR 2's generator publishes it as `dist/USAGE.md` for `llms.txt`.
2. **`examples` for EmptyState** include NoResults and DeletedLastItem, as the WCAG review
   proposed: neither has a play function. A first probe said NoResults had one; an awk listing
   had pinned the play function to the wrong story (rule 34: the probe was wrong, not the check).

#### Cross-module notes for later PRs

- **PR 2:** props JSDoc is published too (decision 8), and several components' JSDoc cites
  `Lnn decision N`. Apply the published-text rules to it, and clean it up.
- **PR 3:** Storybook shows each story's JSDoc on the docs page. Story descriptions cite plans and
  names (EmptyState's DeletedLastItem), so the rules apply to them too.

#### Probes

Each failed for its own reason, and everything was restored:

- a missing `Button.docs.ts` fails `check:components`;
- `(L03 decision 6)` added to a Button contract string fails "publishes only public text";
- an English quote with its `language` removed fails "is a valid contract";
- an example with a play function (FocusVisible) fails the docs test.

#### Verified

`pnpm check`; `pnpm test`: tokens 32, react 919.

### PR 2 (2026-10-28): the generator

- **Day-one probes, settled:**
  - **tsdown 0.23.1 order:** clean, then `build:before`, bundle, copy, publint. The generator runs
    in `build:before`, so its files exist when publint checks `exports`.
  - **Loading:** one Vite server with `createServerModuleRunner` loads all nine contracts and
    `.docs.ts` files in about a second; the tsdown fallback isn't needed.
  - **Props:** every props type already has the axis shape. AlertDialog and Switch import their
    axes, so the generator resolves them with the type checker.
- **Built:**
  - `src/manifest.ts`: mirror types, `schemaVersion` 1, open enums. It is exported type-only, and
    its type tests assert the internal contract and docs types are assignable to it.
  - `scripts/build-docs.mjs` and its helpers, run from tsdown's `build:before`.
  - Output: `components.json`, `llms.txt`, `llms-full.txt`, `docs/<component>.md` and
    `USAGE.md` (the README), all exported.
  - Props by axis and branch, `forbidden`, native attributes, data attributes (from the
    checker, cross-checked against the CSS), tokens (cross-checked against each stylesheet's
    comment) and story ids (from Storybook's CSF functions).
  - The fixed accessibility wording and per-run `sourceChangedSince`.
  - Checks in the generator (the build fails with a list) and in `manifest.test.ts`.
  - CONVENTIONS: rule 3 (axes are named aliases at the top level) and a "Public surface" row.
  - Also: `pnpm/action-setup` v4 → v6 in every workflow (Node 20 deprecation), and the
    `.catalogue-sync.json` change from the L06 note re-sync.
- **Props JSDoc:**
  - private references removed from the nine components' `.tsx` files, and from two internal
    files whose types are published as exports;
  - one-line JSDoc added to every union branch and to every own and forbidden prop that lacked
    one (agent-drafted, reviewed).
- **Decision 5, finished (Emil: in PR 2):**
  - **Gate as a run:** the L08 gate is published as an automated run, generated from
    `apps/docs/gate/checks.ts`. A drift check compares that list with the spec files' test
    titles, both ways.
  - **Evidence links:** each claim links to the runs it rests on.
  - **Traced evidence:** automated evidence must trace to an axe rule that tests the criterion
    (from axe-core's rule metadata), a gate check that lists it, or a test titled
    `(WCAG x.y.z)`.
  - **The 12 untraced claims (Emil: trace them now):** 11 had tests that exercised the criterion,
    each checked and retitled; Button's 2.5.2 had no test of the up event, and now has a
    browser test, probed by switching activation to pointerdown. Five more focused tests were
    added where no existing test covered the whole `how`. The `UNTRACED` list is empty, and a new
    untraced claim fails the build.

#### Deviations from the plan

1. **The README is `USAGE.md`'s source** (PR 1, deviation 1). Its link to the tokens README is now
   the npm URL, which works in `dist/USAGE.md` and on npm.
2. **`homepage` and `repository` in `package.json`.** The generator builds story links from
   `homepage` (the Pages site). This closes two of the npm-publishing gaps.
3. **"Not in this branch" is wider than the plan:** a `never` prop counts as not in a branch when
   anything else accepts it, not only a sibling. Otherwise TextInput's `id` would be published as
   forbidden.
4. **One nested union is allowed:** DialogCloseButton's `{cancelLabel} | {footer} | {dismiss}`
   is published as `requiresOneOf`. CONVENTIONS says so.
5. **Union members print sorted by code unit**, so `values` lose their authored order;
   determinism wins.
6. **`testRuns[]` sits beside the contract**, so `accessibility` stays exactly as written.
7. **Two extra manifest fields:** `wcag.claims` and `conformance`, so PR 3's blocks render the
   same wording from data.
8. **Two judgement calls in the gate's criteria:**
   - the tab walk isn't credited with 2.1.1, because it reaches stops but doesn't operate them;
   - RTL mirroring, the forced-colours screenshots and bookkeeping are credited with no
     criterion.

#### Probes

Each failed for its own reason, and everything was restored from backups:

- **Build-time data checks:** a prop without JSDoc, an inline union in a props type, and a module
  reference in prop JSDoc each fail the build.
- **Gate check list:** removing the gate's 2.4.11 coverage fails the build for seven components;
  a renamed gate title fails the drift check both ways.
- **Button's 2.5.2 test:** pointerdown activation fails the new test.

#### Verified

- `pnpm check`;
- `pnpm test`: tokens 32, react 952;
- `pnpm test:gate`: 1,378 passed, 122 skipped;
- two builds byte-identical, including reordered program files and a CRLF read.

### PR 3 (2026-10-28): Storybook docs pages

- **Day-one probes, settled:**
  - Storybook 10.6.2 emits `docsRendered` (the docs entry's id) once a docs page's React tree has
    rendered; inline stories render after it, each with `storyRendered`. A docs entry opens alone
    at `iframe.html?viewMode=docs&id=<id>`.
  - Storybook's DocsWrapper paints its theme's white. An id-qualified override gives it
    `--senui-color-bg-default`/`-fg-default`; tokens.css already sets `color-scheme: light dark`.
    Measured: light `oklch(0.99 0.003 260)`, dark `oklch(0.16 0.012 260)`.
  - Framed stories (WebKit included) take the page's scheme: the frame reads its parent's
    scheme (same origin) and sets `color-scheme` on its own root, following changes.
  - Every story id in `components.json` was already in the built `index.json` (113 of 113).
- **Built:**
  - `scripts/docs/wording.mjs`: every sentence of the published docs, as functions of the
    manifest, used by both `render.mjs` (Markdown) and the docs blocks (HTML). The Markdown output
    was byte-identical before and after the move, except one deliberate change: the gate's run now
    reads "on every story and every docs page".
  - `apps/docs/src/blocks/`: the docs-page template (`ComponentPage`), Props per axis and branch,
    Accessibility, `DocsStory`, `DocsContainer` (`<main>`), `Inline` (inline code, links, quoted
    speech marked with `lang`), `ScrollRegion`, and docs.css (`@scope` to the page, never into a
    story canvas). Read from `@senakster/senui/components.json`, so in development an edit shows
    after `pnpm build`.
  - preview: `autodocs` everywhere, the template, the container, MDX code components, and a
    decorator that sets `headingLevel`/`titleLevel` to 4 on docs pages only.
  - main: `staticDirs` maps exactly the five generated paths to the site root in production
    builds, and throws, naming what's missing, when dist lacks one. `componentsManifest` is on in
    development only.
  - Gate: `docs.spec.ts` (axe at 1280 and 320 px in both schemes with page rules on, outline,
    reflow, tab walk, state, colour scheme), six rows in `checks.ts`, and three bookkeeping tests
    (manifest story ids in `index.json`, a docs page per component, no `storybook-static/manifests`).
  - Story JSDoc: the build applies the published-text rules to every story's and meta's JSDoc
    and to `docs.description` strings. 30 findings in nine stories files were rewritten (private
    references, review notes, a name, Markdown lists); meaning kept.

#### Deviations from the plan

1. **A Styling section** sits between Props and Accessibility on the docs page, as it does in
   `docs/*.md`, so the two keep one order.
2. **The primary story has an `Example` heading** and every story its name as an `<h3>`, so a
   story's own heading is always an `<h4>`: one override level for every story.
3. **Code blocks wrap instead of scrolling.** A line of code is one element: scrolled out of view,
   axe reports its contrast incomplete, and MDX blocks have no name a region could use. Data tables
   and over-wide story canvases scroll inside focusable, named regions; a canvas is in the tab
   order only while its story overflows it.
4. **Modal stories load on request.** A framed story that opens a modal dialog pulls focus and the
   page's scroll position into its frame on load, so `inline: false` stories show a "Show the
   <name> story" button that loads the frame. `fullscreen` stories (EmptyState's InPage, which has
   its own `<h1>`) load in a frame at once. Frames use `embed=true`, Storybook's switch for no
   play function.
5. **Axe at 320 px re-checks scrolled-out contrast.** Text scrolled out of view in a table region
   reads "partially obscured"; the gate scrolls each such element into view and checks it alone,
   failing on anything still incomplete or failing.
6. **Docs-page tab walk credits 1.4.11, 2.4.7, 2.4.11 and 4.1.2**, like the story walk; outline,
   state and colour-scheme checks credit no criterion.
7. Inline stories that hard-code their headings (EmptyState's InCard, InTableCell) keep them: an
   `<h2>` under the story's `<h3>` passes `heading-order`; only args can be overridden.

#### Probes

Each failed for its own reason, and everything was restored from backups:

- no `<main>`: `landmark-one-main`, `region`, and the outline check;
- a second `<h1>`: the outline check (axe's `page-has-heading-one` only checks presence);
- a skipped level (h2 → h4): the outline check and `heading-order`;
- a table wrapper without `tabindex`: the reflow check and `scrollable-region-focusable`;
- a manifest story id that isn't in `index.json`: the bookkeeping test;
- `dist/llms.txt` missing: `build-storybook` fails, naming it;
- the story JSDoc check, before the cleanup: 30 findings in nine files.

#### Verified

- `pnpm check`; `pnpm test`: tokens 32, react 952;
- `pnpm test:gate`, first run: 1,479 passed, 122 skipped, 1 failed. `axe, dark ›
components-emptystate--title-only` timed out waiting for the story to render, with no error. It
  passed on a re-run, with every docs-page and EmptyState test (134 passed).
- `pnpm test:gate`, full run after the branch moved onto `main` and the budget wording was
  corrected: 1,480 passed, 122 skipped, 0 failed (10.8 min).
- 99 new docs-page tests over 11 docs entries, and 3 new bookkeeping tests. No gate exception was
  added.
- Also in this PR: the published gate run, the workflow comments and CONVENTIONS rule 10 say Firefox
  and WebKit run on demand, because the three-engine workflow is disabled for budget reasons
  (§ L08, "After done").

#### The gate's time budget (2026-10-28, after #15's first CI run)

- **The cause.** On CI's default 2 Playwright workers, the 99 docs-page tests pushed the gate step
  past its 15-minute timeout. 1,483 tests had passed and none had failed when it was stopped.
- **Workers (Emil: "4 workers in CI, then measure").** The runner has 4 vCPUs, so CI now runs 4
  workers; local runs keep Playwright's default. The step then passed in 13 min 56 s, still over
  the 10-minute budget, so the runner's CPU isn't the limit.
- **Emil: "try cheaper checks and raise budget and timeout."**
  - The four docs-page axe runs (light and dark, 1280 and 320 px) now share one page load per docs
    page, with the scheme and width switched in place. Axe is injected once per page.
  - At 320 px, the contrast re-check is batched: every scrolled-out element visible at one scroll
    position is checked in a single axe run, not one run per element.
  - Locally the docs tests went from 490 s to 400 s of test time; the axe part from about 246 s to
    156 s.
  - Probe: a dark-only contrast break in the docs CSS fails in dark at both widths and never in
    light. Restored and rebuilt.
  - **Budget:** the gate step is now held to 15 minutes, up from L08's 10, with a 25-minute
    timeout against hangs.

### PR 4 (2026-10-28): the GitHub Pages deploy

- **Emil, 2026-10-28:** "deploy storybook now". The deploy goes ahead despite the CI budget limit;
  it adds one short job per push to `main`.
- **Pages** is enabled with GitHub Actions as its source, at `https://senakster.github.io/senui/`.
  That is the `homepage` the generator already uses for story links.
- **`ci.yml`, pushes to `main` only:**
  - after the gate, `verify` fails if Storybook's own `manifests/` folder is in the build, then
    uploads `apps/docs/storybook-static` (`actions/upload-pages-artifact@v5`);
  - a `deploy-storybook` job (`needs: verify`) publishes it with `actions/deploy-pages@v5`,
    which runs on Node 24. It has `pages: write` and `id-token: write`, the `github-pages`
    environment, and its own `pages` concurrency group, which never cancels a deploy in progress.
- **CI concurrency:** a newer pull-request run cancels an older one; runs on `main` always finish.
- **The docs-only classifier** (the `changes` step and both workflows' `paths-ignore`): only the
  repo's `docs/`, top-level `.md` files and `.changeset/` count as docs-only now. Any `.md` under
  `packages/` or `apps/` is code, because the package README is the published `USAGE.md` (a PR 3
  review finding missed in PR 2). Probed locally with nine file lists.
- **The unreleased stamp:** built from `main`, the site's `components.json` and `llms.txt` say the
  build is unreleased (`0.0.0-main.<sha>`, `released: false`), from PR 2's generator.

#### Verified

- Workflows parse, and `pnpm format:check` passes.
- The deploy itself can only be verified on `main` after merge. Check that the run deploys, and
  that `https://senakster.github.io/senui/llms.txt` and `…/components.json` are served (acceptance
  criterion, "Site and propagation").

#### After the first deploy (2026-10-28)

- **How #16 merged:** stacked on #15, it merged into `feature/docs-L09-3` 42 seconds after #15
  merged. GitHub retargets a stacked PR only when its base branch is deleted, and the repository
  doesn't delete merged branches. The same change was re-landed on `main` as #17.
- **The live site** serves the Storybook, `llms.txt`, `llms-full.txt`, `components.json`,
  `USAGE.md` and `docs/*.md` under `/senui/`, each with the right content type. It does not serve
  Storybook's own `manifests/components.json` (404).
- **Defect:** the stamp read `0.0.0-main.unknown`.
  - **Cause:** the container runs as root over a checkout git won't touch, and `ci.yml` only marked
    it `safe.directory` on pull requests. Every git call in a push build failed silently, which also
    left every run's `sourceChangedSince` blank on the site.
  - **Fix:** a `safe.directory` step after every container checkout (`ci.yml`, both `gate-full.yml`
    jobs, `update-snapshots.yml`). Under `CI`, the generator now fails the build when git can't
    read the commit; locally it still falls back, for builds from a tarball.
  - **Probe:** `GIT_DIR` pointed nowhere, with `CI=1`, fails the build. The first version of the
    guard compared with `null` while the helper returns `undefined`, so it could never fire; the
    probe caught it (rule 34).
- **After #18 on `main`:** CI passed, including the Chromium gate. The site stamps
  `0.0.0-main.98527e4` with `released: false` in `llms.txt` and `components.json`, and every run's
  `sourceChangedSince` is filled in ("Component changed since this run" on the site).

### Done (2026-10-28)

All four PRs merged: #13, #14, #15, #17 (the re-landed #16), plus the stamp fix, #18.

- **Acceptance criteria:** all met. The evidence for each:
  - **Build:** `pnpm build` writes the five outputs and publint passes. Determinism is
    `manifest.test.ts` ("is deterministic, whatever the program order or line endings").
  - **Props and exports:** `manifest.test.ts` covers the export list, axes, Checkbox's
    `aria-invalid` and unexported identifiers. The missing-JSDoc probe is from PR 2. **New probe:**
    a fourth `DialogOpenState` branch took Dialog's and AlertDialog's axis from 2 to 3 branches,
    with no other change.
  - **Accessibility content:** `manifest.test.ts` covers the levels, the preamble, "observed",
    run versions and Known issues. "Changed since this run" is live on the site, for real runs.
    **New probes:**
    - Button's built docs page (9 claims, both Meets and Enables), `docs/button.md` and
      `llms-full.txt` carry each claim line identically. Checked by a script against the served
      Storybook.
    - The live Button page marks its quoted speech with `lang`: four spans, `en` and `da`.
  - **Published strings:** the PR 1 probe, and `component-docs.test.ts` for the "accessible"
    claim.
  - **Usage guidance:**
    - the missing `.docs.ts` probe (PR 1);
    - `component-docs.test-d.ts` for story and component references and native alternatives;
    - `manifest.test.ts` and the page's "Inside other components" for Checkbox's composition rule.
  - **Links:** `manifest.test.ts` covers the links, `llms-full.txt` and the order of each page;
    PR 3's bookkeeping test covers story ids.
  - **Docs pages:** `docs.spec.ts` and the PR 3 probes. CI's gate on #18's push passed.
  - **Site and propagation:** live checks after #18. Storybook's `manifests/components.json`
    returns 404. **New probe:** one build with a marker in each of Button's contract, a prop's
    JSDoc and its `.docs.ts`. Each marker reached `components.json`, `llms-full.txt`,
    `docs/button.md` and the built docs page.
- **One narrowing:** `llms.txt` holds links and one-line summaries only (decision 6), so of the
  three sources only the `.docs.ts` summary appears in it. Contract and JSDoc changes reach the
  files it links to.
- **Every probe was restored** with `git checkout`, then `dist` and Storybook were rebuilt clean.
- **Open, not L09's:**
  - `check:components` warns that all nine components changed after their last manual run, from
    L09's JSDoc and contract text edits. Turning that warning into a release error is L10's.
    Whether to re-run the readers before then is Emil's call.
  - TextInput's Home/End row on macOS (L04).
  - npm publishing gaps (LICENSE, `bugs`) → L10.
- **Verified:** `pnpm check`; `pnpm test`: tokens 32, react 952. CI on `main` (98527e4) passed.

## L10 — Release, versioning & deprecation

Plan written in the planner on 2026-10-28 with Emil:

- **Review:** `component-api-reviewer`, `wcag-auditor` and `server-boundary-enforcer`, about 30
  findings, all adopted.
- **Synced** the same day.
- **Found by the review:** an L06 defect, `Dialog.css` without `Button.css`. Fixed in #20, recorded
  under L06.

Starting state (step 2b, 2026-10-28):

- **npm:** no npm token anywhere; only the Pages deploy has `id-token: write`.
- **Build:** a single-file `dist/index.js`; tokens is a regular `workspace:^` dependency.
- **`gate-full.yml`:** disabled by hand.
- **Repository settings:** merge commits and rebase merges are still allowed, merged branches
  aren't deleted, and Actions can't open pull requests.
- **The `main` ruleset is already active** (id 25892694), identical to `.github/rulesets/main.json`.
  The plan assumed it had never been applied; `.github/rulesets/README.md` still says so.

| Deliverable / criterion                       | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Reason                                                                                       | Re-include when                                                             |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Everything in the plan                        | in, Claude builds and Emil reviews                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Harness work                                                                                 | —                                                                           |
| Delivery                                      | in: five PRs. <ol><li>Package and build: preserved modules, the tree-shaking probe and CSS-import check, tokens as a peer, LICENSE, the tokens package's fields, `attw` (ADR), the tarball check</li><li>API diff and deprecation data</li><li>`sourceHash`: ADR, stamping, backfill, stale wording</li><li>The `changesets` job, the changeset text check, changelog and migration pages</li><li>The release pipeline: `release.yml`, the reusable gate, the `npm` environment, repository settings, the 1.0.0 changesets, then Emil's first publish</li></ol> | Emil, 2026-10-28                                                                             | —                                                                           |
| `sourceHash` backfill in the nine contracts   | in: the script writes the hashes, each file is listed here, and Emil reviews the diff                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Emil, 2026-10-28 (as in L09)                                                                 | —                                                                           |
| Repository settings and the `npm` environment | in, PR 5 only: no GitHub setting changes before the release pipeline lands                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Emil, 2026-10-28                                                                             | —                                                                           |
| "A failing gate stops the publish" probe      | changed: locally, plus a stubbed fast gate job in CI. The three-engine run isn't spent on a probe                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Emil, 2026-10-28 (CI budget). The real reusable call is first exercised by the 1.0.0 release | A release's gate passes when it shouldn't, or the budget allows a probe run |

### PR 1 (2026-10-28): package and build

- **Day-one probes, settled:**
  - **tsdown 0.23.1 `unbundle`** keeps one file per module: `dist` mirrors `src` (24 JS modules),
    `index.js` stays where `exports` points, and publint and the docs generator pass unchanged.
  - **Reading a bundle's module list:** Vite's build API with `write: false` gives each chunk's
    modules and their rendered length. `dist`'s own import graph is the value-import graph,
    because the build strips type-only imports, so "what a component renders" needs no TypeScript
    pass.
  - **attw on an ESM-only package:** the code entries and `components.json` resolve under
    `node16` and `bundler`. The CSS, `.txt` and `.md` subpaths always read as unresolvable,
    because TypeScript never imports them, so they are excluded by name. Wildcard subpaths aren't
    analysed.
  - **Changesets and a peer dependent:** at `1.x`, a tokens minor leaves the components package
    alone (correct), but a tokens **major** bumps it only a **patch** (`1.0.1`), rewriting its peer
    range to `^2`. That is the break the review warned about, and Changesets doesn't prevent it. The
    check that a tokens major forces a components major moves to PR 2, with the API diff
    (acceptance criterion "A tokens major forces a components major").
- **Built:**
  - `tsdown.config.ts`: `unbundle: true`.
  - `scripts/check-tree-shaking.mjs`: per component, a Vite production bundle of an app importing
    only it. It fails on any other component module the component doesn't render, and on a
    stylesheet that doesn't load (directly or through its imports) the stylesheet of a component it
    renders.
  - Tokens as a peer dependency of the components package (and a dev dependency). The generator
    reads the manifest's tokens range from `peerDependencies` and fails the build without one; the
    README says why.
  - `scripts/copy-license.mjs` as each package's `prepack`; the copies are gitignored. `bugs` on
    both packages; `homepage` and `repository` (with `directory`) on the tokens package.
  - `scripts/check-pack.mjs`: `pnpm pack` per package, then the tarball's file list against
    allowed and required patterns, no `workspace:` range in the packed `package.json`, the tokens
    peer at `^<tokens version>`, and attw on the same tarball.
  - **ADR-0020:** `@arethetypeswrong/cli` 0.18.5, with `publint` kept.
  - Both checks run in `check:components`, so in `pnpm check` (it builds first). CLAUDE.md's
    Verification section says so. `pnpm check` took 60 s locally with them.

#### Deviations from the plan

1. **The CSS check asks for coverage, not equality.** The plan said each stylesheet's `@import`s
   equal the stylesheets of the components it renders. `AlertDialog.css` imports `Dialog.css`
   although AlertDialog's JS never reaches `Dialog.js`: its dialog styles live there, because the
   shared `ModalDialog` renders `.senui-dialog`. So the check fails only on a missing stylesheet;
   extra imports stay allowed and are published as `cssIncludes`.
2. **The side-effect probe is "no `sideEffects` field"**, not "a top-level side effect in one
   component". With `sideEffects: ["**/*.css"]`, a bundler drops an unused component module
   whatever it contains, so the plan's probe could never fail (rule 34). Dropping the field is the
   realistic regression.
3. **Pack check, not `npm pack --dry-run`.** Only `pnpm pack` rewrites `workspace:` ranges and runs
   the same `prepack`, so it's the one that shows what publishes.
4. **attw runs in `pnpm check`**, not only in the release gate: one pack and one attw run per
   package, and a broken `exports` entry is caught when it is written.

#### Probes

Each failed for its own reason, and everything was restored:

- **A single-file `dist`** (`unbundle: false`): the first version of the tree-shaking check found
  no component modules and **passed** (rule 34). It now takes the component list from `src` and
  fails, naming all nine.
- **No `sideEffects` field:** 70 leaks (importing AlertDialog bundles Checkbox, and so on).
- **`Dialog.css` without its `Button.css` import:** fails for Dialog and AlertDialog. This branch
  is cut from `main`, before #20, so the check found the L06 defect on its own.
- **A stray file in `dist`:** the pack check names it.
- **Tokens back as a regular dependency:** the pack check fails twice (peer missing, and a
  dependency where a peer belongs).
- **`dist/index.d.ts` removed:** attw reports "No types" for `node16` and `bundler`.

#### Verified

Rebased onto `main` after #20 (the `Dialog.css` fix):

- `pnpm check`;
- `pnpm test`: tokens 32, react 952;
- `build-storybook`: the docs app still resolves the tokens through its own dependency.

Before the rebase, `pnpm check` failed in `check-tree-shaking`, which was correct.

#### Ruleset docs (Emil, 2026-10-29)

The `main` ruleset has been live since 2026-10-26, when the repository went public (id
`25892694`, enforcement `active`), but its README and CONTRIBUTING.md still said it wasn't applied
(the L00 record of 2026-10-17 stays as history). Fixed here rather than in PR 5, which only changes
the repository settings. Compared with the live ruleset, the JSON lacked two fields GitHub returns
by default (`required_reviewers: []`, `require_extra_approval_for_unattributed_changes: true`), so
they were added and the file now matches it exactly. The repository-level squash-only and
delete-merged-branches settings are still off and stay for PR 5.

### PR 2 (2026-10-29): API diff, deprecation as data, majors travel together

- **Built:**
  - **Deprecation as data** (decision 7). The generator reads `@deprecated` on a prop, a union
    branch's summary, a literal union member and an export, and `deprecated <old>: use <new>` in a
    stylesheet's "Public surface" comment (tokens, `[data-*='value']`, classes). `components.json`
    gains optional fields: `deprecated` on exports, components, props and branches,
    `deprecatedValues` on props, and `css.deprecated`. `schemaVersion` stays 1. The text
    "Deprecated. Use … instead." comes from one wording function, used by `docs/*.md`, `llms.txt`
    and the docs pages: first in a prop's description, a `<p>` after a deprecated component's `<h1>`
    or a branch's `<h4>`, beside a token in Styling.
  - **Checks on it:** a `@deprecated` prop without `deprecate('<Name>', '<prop>', …)` in the
    component (comments don't count); an empty `@deprecated`; a deprecated token that is still
    declared, or that the new token doesn't read as its fallback; a deprecated data value or class
    that no longer renders; a deprecated component alias that never calls `deprecate()`.
  - **The API diff** (decision 5): `scripts/check-api-diff.mjs` with `scripts/api-diff/`, as
    `pnpm check:api` in `pnpm check`, so `verify` runs it on every pull request. The baseline is
    each package's npm `latest` (fetched and checked against the registry's integrity hash, never
    installed), or the committed baseline while the package isn't on npm. The facts follow
    CONVENTIONS "Public surface". Narrowing is the compiler's: each baseline `*Props` type must be
    assignable to this build's, in a throwaway program. The pending bump comes from
    `changeset status`, or, on the version pull request, from `package.json` against the baseline.
  - **Majors travel together** (decision 2, ADR-0021, new): a pending tokens major needs a pending
    components major.
  - `api-exceptions.json`: `{ package, fact, reason, expires }`. Expired or unused entries fail,
    as the gate's do.
  - Probes as tests: `scripts/api-diff/diff.test.mjs` (`node --test`, in `pnpm test`, no new
    dependency), one per "API diff" acceptance criterion plus the edges below; and
    `src/internal/docs/deprecation.test.ts` for the generator's deprecation checks and wording.
  - CONVENTIONS rule 8 (the marks, as a table, and what enforces them) and "Public surface" (what
    enforces it); CLAUDE.md's Verification; ADR-0021.

#### Deviations from the plan

1. **Branch keys.** The plan keys a branch by "its discriminant plus its prop-name set". With the
   prop names in the key, adding an optional prop to a branch would read as the branch removed and
   another added: a false major. A branch is keyed by its discriminant when that is unique in its
   axis, else by its prop names, and a new build's branches are first matched to the baseline's
   (same discriminant, else the most prop names in common, at least half). Checkbox's
   `CheckboxMixed` has two branches with no discriminant, so this case is real.
2. **Narrowing is checked per `*Props` type, not per branch.** Assigning a union checks every
   member, and the compiler's message names the member that fails. Branch identity is in the facts
   already.
3. **Brands.** `FormFieldBinding`'s `unique symbol` (ADR-0011) is a different type in each copy of
   the declarations, so two identical builds failed the narrowing check for `FormFieldProps` and
   `TextInputProps` (found on the first run). Consumer code can't name a brand, so the same brand
   in the same file is one symbol in the throwaway program.
4. **Restrictions.** Lifting one (a forbidden, not-in-branch or omitted prop, or a `requiresOneOf`)
   is a minor and needs no deprecation. Adding one is a major only where the component or branch
   already existed; on a new branch it restricts nothing.
5. **A deprecated component alias** has no folder, so its `components` entry goes. The diff doesn't
   compare the facts of a component whose export stays, deprecated; its `*Props` type, if kept, is
   still type-checked.
6. **Values are primitives**, so a deprecated value is `deprecatedValues` on its prop (by the value
   as a string), and CSS deprecations are one `css.deprecated` map keyed by the name as written.
   The plan said "`deprecated` on the value".
7. **Where it runs:** in `pnpm check`, not a separate `ci.yml` step: `verify` already runs
   `pnpm check` on every pull request. Offline, it skips with a warning outside CI and fails in CI.
   The release gate's run is PR 5's.
8. **The committed baseline is trimmed:** the manifest without contracts, stories or prose, the
   `.d.ts` tree, `tokens.css`, and `name`/`version`/`exports` from each `package.json` (184 KB,
   kept out of Prettier). It was written from this branch's build, whose public surface equals
   `main`'s. Once both packages are on npm it is unused, and the release PR deletes it.

#### Probes

The generator ones were temporary edits to Button (restored with `git checkout`; pair mode). Each
one failed for its own reason:

- **`@deprecated` on `size` without a `deprecate()` call:** the build fails, naming the prop and
  the call it needs. The same with the call only in a comment.
- **A renamed token** (`--senui-button-bg` → `--senui-button-background`) whose replacement
  doesn't read the old one: the build fails, giving the declaration it needs.
- **Everything deprecated correctly** (the `size` prop with its call, a `'subtle'` variant value,
  the second `ButtonContent` branch, the token rename): the manifest carries each mark, and
  `docs/button.md` and `llms-full.txt` say "Deprecated. Use … instead.". The docs-page gate passed
  on the Button page in Chromium, with the text in the built site. The API diff reads three
  additions and no removal.
- **The first value probe found a bug:** a JSDoc that opens with `@deprecated` lost its tag,
  because JavaScript's `split` skips a zero-length match at index 0. Fixed.
- **`description?: ReactNode` → `ReactElement`** in EmptyState's source: the API diff fails a
  minor, naming `EmptyStateProps` and `description`.
- **A temporary `'@senakster/senui-tokens': major` changeset:** fails, asking for a components
  major.

#### Verified

- `pnpm check`, including `check:api`: 0 differences against the committed baseline.
- `pnpm test`: tokens 32, react 955, scripts 21.
- `build-storybook`.

#### Review (`component-api-reviewer`, read-only)

Eight findings. Five were fixed in this PR, each with a probe or test:

1. **`package.json` wasn't compared.** A narrowed peer range (`react: ^19`), a retargeted subpath
   and a dropped `sideEffects` all passed. Now each is a fact. A widened peer range is a minor,
   and the tokens peer is left to the majors-travel-together check. The committed baseline now
   keeps `sideEffects` and `peerDependencies`.
2. **An alias hid the old component's CSS.** The alias skip now covers only props, values and
   elements: the class, tokens and data values a consumer's stylesheet targets are still compared.
   Data values are now keyed as a consumer selects them (`data .senui-button[data-variant='danger']`),
   not by component name. With component-name keys, a rename that kept the class read as a
   removal; the existing alias probe caught it. An alias must also stay a `component` export.
3. **Only `*Props` types were type-checked.** Now every shared type export is.
   - A type other than props is checked both ways: one that narrows is a major, one that widens
     (a new `DialogCloseReason`) is a minor, because the manifest treats enumerations as open.
   - Generic types (`DistributiveOmit`) can't be named without their arguments, so they are
     skipped. Their export fact still catches a removal.
4. **Layer order wasn't a fact.** It is now, for both packages, and any change is a major.
5. **Ignored deprecation marks:**
   - a "deprecated" mention in a Public surface comment that the grammar can't read is an error;
   - a deprecated class must render as a whole class name, not as part of a longer one;
   - a deprecated component with its own folder must call `deprecate('<Name>', …)`.

   Probed on Button and restored; each failed with its own message. Branches and literal values
   stay without a required `deprecate()` call, as the plan's table has them ("Checked: —").

Recorded, not fixed:

6. **The tokens package has no deprecation mark.** Removing a semantic token after a deprecation
   minor still needs an `api-exceptions.json` entry. Marking it belongs in the L01 pipeline (DTCG
   2025.10 has `$deprecated`), and the plan's deprecation table doesn't list semantic tokens.
   **Re-include when** the first semantic token is renamed or removed.
7. **Prop facts are keyed by axis (type-alias) name, and a component without axes uses `props`.**
   Renaming an axis alias, or giving a component its first axis, reads as every prop removed: a
   false major, which fails loudly and is resolvable. Exported axis aliases are public names
   anyway. **Revisit when** it fires on a real change.
8. **Two smaller edges, both false majors in the safe direction:**
   - branch matching by prop-name overlap, on branches without a discriminant;
   - a new branch that lacks a prop every other branch of its axis had: that prop drops out of the
     other axes' contexts.
