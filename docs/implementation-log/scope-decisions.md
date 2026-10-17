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

| Deliverable / criterion                               | Decision                                    | Reason                                                                                                                                 | Re-include when                                           |
| ----------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Polymorphic `as` / `asChild`                          | out (ADR-0006)                              | Emil: no polymorphism. Each component renders one element, named in its contract                                                       | ADR-0006's revisit triggers (link-styled Button, routers) |
| Hook, `deprecate`, contract type, `CONVENTIONS.md`    | in, Claude drafts and Emil reviews          | Emil's call; L02 is conventions and tooling, not component source                                                                      | n/a                                                       |
| Raw-value guard for component CSS                     | in, Stylelint (ADR-0007, amended by 0009)   | Built-in rules beat a grep script that reads CSS as text                                                                               | n/a                                                       |
| Ref forwarding                                        | `forwardRef`, React 18.3 kept in peer range | On 18 a `ref` prop is silently dropped                                                                                                 | The peer range drops React 18                             |
| `adaptation` section in the a11y contract             | in (ADR-0008)                               | WCAG review: target size, forced colours, motion, RTL and overflow had nowhere to go                                                   | n/a                                                       |
| Contract bound to props, runtime contract test        | in                                          | WCAG review blocker: free strings let a contract drift from its component unnoticed                                                    | n/a                                                       |
| Tested-with evidence per method, WCAG 2.2 table       | in                                          | WCAG review: empty lists, invalid criteria and unattributed runs passed the type                                                       | n/a                                                       |
| AT, browser and OS product names in `testedWith` data | in: exempt from the no-brand rule           | Emil: compatibility facts, not branding. Types and fixtures stay generic (CLAUDE.md)                                                   | n/a                                                       |
| Focus ring vs consumer resets                         | in: documented and tested, not `!important` | Emil: keeps principle 3. Every focusable contract lists `RESPONSIBILITIES.keepFocusRing`; L08 tests a reset                            | A reset breaks the ring in a real consumer anyway         |
| Per-component stylesheet export                       | in: `./styles/<Name>.css`                   | API review: ADR-0001 promised one; once published, the subpath is semver API                                                           | n/a                                                       |
| Contract staleness                                    | warning only, skipped in shallow clones     | Failing on every refactor would block commits until a manual screen-reader run; CI checks out shallow, where commit dates mean nothing | Contracts drift despite the warning                       |
| Positive `tabIndex` in the type                       | out                                         | Not in the accepted triage option (only `role` is removed from native props); the reviewer marked it "where practical"                 | A component ships with a positive tabindex in use         |

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

### Known-unmet acceptance criteria

- **Hover and active stories.** Storybook can't force `:hover`/`:active` without an addon (a new
  dependency, so an ADR under principle 2). Every other state has a story; hover and active are
  visible in the Matrix story by pointing at it. Re-include with a pseudo-states addon decision.
- **Keyboard and screen-reader runs:** done 2026-10-17 (keyboard, and Narrator in Chrome). The first Narrator run found the loading button had no name; fixed before recording.

### Cross-module notes

- **L08** — the Vitest `browser` project (Chromium via Playwright, `*.browser.test.tsx`) exists from
  L03. L08's Playwright gate can build on the same `playwright` pin; `@storybook/addon-vitest` would
  run every story in that browser project.
