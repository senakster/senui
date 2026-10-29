# senui

A public, standalone React + TypeScript component library: design tokens, a small set of
thoroughly finished components, and documentation that engineers and AI agents can use without
help. Published as `@senakster/senui-tokens` and `@senakster/senui` (pnpm workspace).

## Where things live

| What                             | Where                                                         | Committed?                    |
| -------------------------------- | ------------------------------------------------------------- | ----------------------------- |
| Module plans (library catalogue) | `.catalogue/library_catalogue/LNN-*.md`                       | **No** — vendored, gitignored |
| Module status                    | `docs/PROGRESS.md`                                            | yes                           |
| Implementation log               | `docs/implementation-log/` (checkpoint, log, scope-decisions) | yes                           |
| Architecture decisions           | `docs/decisions/`                                             | yes                           |
| Override log                     | `OVERRIDES.md`                                                | yes                           |
| Decision index                   | `.catalogue-decisions/index.json`                             | **No** — rebuilt locally      |

Never copy text from `.catalogue/` into committed files. Paraphrase the decision and cite the
module number instead.

## Library principles

These are the contract. Change one only via an ADR.

1. **APIs are hard to misuse.** Variants are closed unions. No free `color`/`sx`/`css` props.
   A required accessible name is required at the type level, and a `@ts-expect-error` type test
   locks it.
2. **The platform first.** Use a native element before ARIA, and ARIA before a dependency. A new
   dependency needs an ADR naming the native alternative it beat.
3. **Plain CSS that consumers can override by default.** All styles go in
   `@layer senui.tokens, senui.base, senui.components`, with base selectors in `:where()`. No
   Tailwind, no CSS-in-JS, no CSS Modules.
4. **Tokens are the single source.** No raw colour, space, radius, type, motion or elevation value
   in component CSS, and no primitive tokens referenced from components.
5. **Every state is designed.** Default, hover, focus-visible, active, disabled, loading, error and
   empty each get a story.
6. **Accessibility is a gate, not a review.** Unit axe, Storybook a11y and Playwright checks
   block CI. A "minor" violation still ships to every consumer.
7. **Semver is a promise.** Removing or renaming a prop, export or public token is a major
   version, preceded by a deprecation release with a dev warning and a migration note.
8. **Docs are data.** Each component's `*.a11y.ts` contract and its types generate both the human
   docs and `components.json`/`llms.txt`.

## Locked decisions

| ADR                                                               | Decision                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [0001](docs/decisions/0001-plain-css-on-custom-properties.md)     | Plain CSS in `@layer senui.*` and `:where()`, variants as data attributes. No Tailwind, CSS Modules or CSS-in-JS                                                                                                                                                                                                                                                                                                                  |
| [0003](docs/decisions/0003-library-build-tsdown.md)               | Both packages build with tsdown (tsup is unmaintained): ESM + `.d.ts`, CSS copied rather than bundled, `publint` in the build                                                                                                                                                                                                                                                                                                     |
| [0004](docs/decisions/0004-token-pipeline-sd5-dtcg-2025.md)       | DTCG 2025.10 JSON → Style Dictionary 5 → `light-dark()` custom properties + a typed map. Colours authored in oklch. Primitives (`primitive.*`) are never emitted; semantic and component tokens are public. Dark, reduced-motion and contrast live in `$extensions.senui` (supersedes 0002)                                                                                                                                       |
| [0005](docs/decisions/0005-token-contract-amendments.md)          | `[data-theme]` subtrees get their own bg/colour (`senui.base`); components multiply movement by `--senui-motion-reduce`; a colour needs contrast pairs or `surface: true`; states are suffixed siblings (`bg.accent-hover`); focus rings are an `outline` with `--senui-focus-ring-offset`, never `box-shadow`; Style Dictionary is revisited on workaround code (transforms + mode passes > ~150 lines), not total pipeline size |
| [0006](docs/decisions/0006-no-polymorphic-components.md)          | No `as` / `asChild`: every component renders one known element, named in its a11y contract                                                                                                                                                                                                                                                                                                                                        |
| [0007](docs/decisions/0007-stylelint-token-guard.md)              | Stylelint (built-in rules only) rejects raw colours, lengths, durations, easings, font values, shadows and primitive refs in component CSS                                                                                                                                                                                                                                                                                        |
| [0008](docs/decisions/0008-a11y-contract-adaptation.md)           | Every a11y contract has an `adaptation` section with closed values: target size, activation, forced colours, reduced motion, RTL, text overflow                                                                                                                                                                                                                                                                                   |
| [0009](docs/decisions/0009-stylelint-unit-allow-list.md)          | Amends 0007: units are an allow-list (`%`, `fr`, `ch`, `deg`, `turn`); selectors max `0,1,0` specificity and no ids, so base selectors stay in `:where()`                                                                                                                                                                                                                                                                         |
| [0010](docs/decisions/0010-tokens-declared-on-themed-subtrees.md) | Tokens are declared on `:where(:root, [data-theme])`, so `data-theme` subtrees stay correct when a build tool rewrites `light-dark()` (Vite's default does). Consumer token overrides target `:root, [data-theme]`                                                                                                                                                                                                                |
| [0011](docs/decisions/0011-form-control-validity-and-binding.md)  | Invalid is styled from `[aria-invalid="true"]` only, never `:user-invalid` (amends 0001). Native validity reaches `aria-invalid` on the `invalid` event, gated on `:user-invalid`. Form controls bind to FormField through a sealed render prop: `{(field) => <TextInput field={field} />}`                                                                                                                                       |
| [0012](docs/decisions/0012-binary-controls-own-their-label.md)    | Binary controls (Checkbox, Switch, CheckboxGroup) own their label, description and error; text-entry controls bind to FormField (amends 0011). All share `internal/field/useFieldWiring` and `useFormFieldControl`                                                                                                                                                                                                                |
| [0013](docs/decisions/0013-aria-invalid-always-explicit.md)       | Form controls always render `aria-invalid` as `"true"` or `"false"`, never absent: without it, browsers announce native invalidity before any interaction (amends 0011 and L04 decision 1)                                                                                                                                                                                                                                        |
| [0014](docs/decisions/0014-dialog-scroll-lock.md)                 | Dialogs always contain overscroll; on by default, `:where(html:has(.senui-dialog:modal)) { overflow: hidden }` locks the root for senui's own dialogs only (layered, zero specificity, one rule to override). senui never sets `scrollbar-gutter`; consumers are advised to. Adopts the planner's library ADR-0015                                                                                                                |
| [0015](docs/decisions/0015-rem-in-media-queries.md)               | Amends 0009: `rem` is allowed in size media features only (`width`, `height`, `min-`/`max-`), because a breakpoint can't be a token. No `stylelint-disable` in component CSS. Unrelated to the planner's ADR-0015 (that one is senui 0014)                                                                                                                                                                                        |
| [0016](docs/decisions/0016-rem-in-container-queries.md)           | Amends 0015: `rem` is allowed in size container features too, and no other unit in an `@container` condition; every container query names a `senui-` container its stylesheet declares. Stylelint can't see `@container` conditions, so `check-component-css.mjs` enforces it                                                                                                                                                     |
| [0017](docs/decisions/0017-contract-essential-motion.md)          | Amends 0008: an optional `adaptation.essentialMotion` (`'progress-rotation'`, with `reducedMotion: 'motion-factor'` only) names the one animation a component keeps under reduced motion (Button's spinner). The L08 gate allows exactly that and nothing else                                                                                                                                                                    |
| [0018](docs/decisions/0018-no-dir-pseudo-class.md)                | Component CSS never uses `:dir()`: bundlers lower it to a `:lang()` list (Vite's default build does), which a `dir="rtl"` page in another language never matches. Mirror with logical properties; Stylelint rejects `:dir()`                                                                                                                                                                                                      |
| [0019](docs/decisions/0019-screen-reader-run-language.md)         | Every screen-reader run in an a11y contract records the language of the reader's speech (`language`, BCP 47), so published quotes carry `lang` and aren't read as component output (amends L02 decision 7)                                                                                                                                                                                                                        |
| [0020](docs/decisions/0020-attw-publish-check.md)                 | `@arethetypeswrong/cli` checks the packed tarballs' types under `node16` and `bundler` (ESM only; asset subpaths excluded). `publint` stays; principle 2's alternative                                                                                                                                                                                                                                                            |

## Naming

- npm scope: `@senakster` (packages `@senakster/senui-tokens`, `@senakster/senui`)
- CSS class and token prefix: `senui` (`.senui-button`, `--senui-color-fg-danger`, `@layer senui.components`)

## Working mode: pair

From L03 on, Emil writes the components and agents review them. Every line of the public API
must be something Emil can defend.

- **Agents do not write files under `packages/react/src/components/**`** unless Emil asks for a
  specific file by name ("write the Button stories", "scaffold the type test"), and then only
  that file.
- Tooling, CI, build scripts and harness work (L00, L01's build pipeline, L02's check scripts)
  are agent work that Emil reviews.
- After a component is written, run the reviewers (`component-api-reviewer`, `wcag-auditor`,
  `modern-web-curator`) read-only. Each finding needs a `file:line`, the concrete misuse it
  allows, and a fix.
- Every rejected or materially changed agent suggestion becomes a row in `OVERRIDES.md`, with
  the reason in Emil's words. Architecture-level findings become ADRs via `/modular-web:add-adr`.

## Working conventions

- One module at a time, in order. Write the plan before the code. Open questions go to the
  user and are recorded, never guessed in code.
- Scope calls go in `docs/implementation-log/scope-decisions.md`. Deviations from a plan go
  there too, never into `.catalogue/`.
- Update `docs/PROGRESS.md` and the checkpoint before marking anything done.
- **Never use client, employer or third-party brand names** in code, docs, stories, fixtures or
  commit messages. The project and its fixtures are generic. One exception: a component's
  `testedWith` data in `*.a11y.ts` names the assistive technology, browser and OS actually tested,
  because those are compatibility facts (scope decision, L02). Types and fixtures stay generic.
- Commit as `senakster@gmail.com` (set in this repo's git config).

## Verification

`pnpm check` must pass before any module is marked done. It runs, in order: build + typecheck, lint
(ESLint, then Stylelint on component CSS), `check:components` (every component has a typed
`*.a11y.ts`; component CSS sits inside `@layer senui.components`; every `@import` in the built CSS
resolves; importing one component bundles only the components it renders, and its stylesheet
loads theirs; the packed tarballs hold only the expected files, no `workspace:` range, and types
that resolve under attw), and format:check. `pnpm test` must pass too: Vitest in `packages/tokens` and
`packages/react`, including type tests (`*.test-d.tsx`, type-checked, never executed), the
runtime check of every a11y contract, and `*.browser.test.tsx` in Chromium (run
`pnpm --filter @senakster/senui exec playwright install chromium` once per machine). CI (`.github/workflows/ci.yml`) also runs
`pnpm --filter docs build-storybook` and then **the a11y gate** (L08): Playwright over the built
Storybook, styled by the package's built CSS, checking every story against its component's a11y
contract. Run it locally with `pnpm test:gate` (it builds first); it is not part of `pnpm check`.
Its exceptions live in `apps/docs/gate/exceptions.json` (tagged, dated, expiring). `pnpm build` runs tsdown with publint, which fails on a broken
`exports` map. Component conventions are in `packages/react/CONVENTIONS.md`.

The toolchain is pinned below its newest majors on purpose: TypeScript 6.0 (typescript-eslint's
ceiling) and ESLint 9 (eslint-plugin-jsx-a11y's ceiling). Don't bump either without checking those
peer ranges. See scope-decisions.md § L00.

## Skills and commands

- `modular-web:catalogue-decisions` — **mandatory before building or changing a component,
  contract or approach**: check whether it is already decided.
- `modern-web-guidance` — before any HTML/CSS/client-JS pattern choice.
- `/modular-web:implement-module` — drives the next module.
- `/modular-web:add-adr` — records a decision.
- `/modular-web:next-step` — says where the project stands.
