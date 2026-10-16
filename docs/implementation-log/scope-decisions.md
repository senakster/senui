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

| Deliverable / criterion                                               | Decision | Reason                                                                                                 | Re-include when                                   |
| --------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| Pipeline: `sd.config.mjs` (Style Dictionary 5, modes, `light-dark()`) | in       | agent work; ADR-0004 replaces ADR-0002's Style Dictionary v4 + pre-stable format                       | —                                                 |
| Build-time contrast check (`contrast.mjs`)                            | in       | acceptance criterion; pairs declared per token in `$extensions.senui.contrast`, checked in both themes | —                                                 |
| Typed map (`dist/index.{js,d.ts}`) and `./tokens.css` export          | in       | generated into `src/generated/`, bundled and copied by tsdown (ADR-0003)                               | —                                                 |
| Tokens docs page in `apps/docs`                                       | in       | renders every public token in both themes from the typed map, plus the reduced-motion table            | —                                                 |
| Pipeline tests (`packages/tokens/test/`)                              | in       | not in the plan; makes every pipeline guard a check that can fail                                      | —                                                 |
| Token values and names (`src/*.tokens.json`)                          | in       | owned by Emil, per the plan; the pipeline is built and tested against a fixture until they land        | —                                                 |
| Colour space                                                          | in       | oklch (Emil, 2026-10-16); resolves L01's open question, recorded in ADR-0004                           | —                                                 |
| Primitives in `tokens.css`                                            | out      | resolved away so that "internal" is enforced, not promised (Emil, 2026-10-16; ADR-0004)                | consumers need to re-theme at the primitive level |
| Figma variable sync                                                   | out      | out of scope in the plan; DTCG keeps the door open                                                     | a Figma library becomes a source of truth         |

### Known-unmet acceptance criteria

These criteria are met by the pipeline, and were proved with a temporary fixture through the real CLI
on 2026-10-16. They can't be ticked against the real token set until Emil writes it:

- **Semantic fg/bg pairs meet 4.5:1 and 3:1 in both themes** — the check exists and fails the
  build on a miss (exit 1, naming the token, background, theme and ratio). There are no real
  pairs yet.
- **Reduced-motion block present** — the media block is emitted whenever any token has
  `reducedMotion`, and it is documented on the Tokens page. No real motion tokens yet.
- **`light-dark(` count equals the semantic colour count** — true with the fixture (2 = 2), and
  true but empty (0 = 0) on the real build.

### Deviations from the plan

1. **Style Dictionary 5 and DTCG 2025.10 instead of v4 and the pre-stable format** — ADR-0004,
   because ADR-0002's own revisit trigger fired.
2. **Primitives are not emitted.** The plan says `tokens.css` carries all tiers. ADR-0004 resolves
   primitives away instead.
3. **The primitive-reference guard is a different grep.** The plan greps for numbered primitive
   colour names. Since primitives are never emitted, any `--senui-primitive-` reference, or any
   numbered colour step `--senui-color-<name>-<n>`, is a bug:
   `grep -rnE -- '--senui-primitive-|--senui-color-[a-z]+-[0-9]+' packages/react/src` must return
   nothing.
4. **Pipeline code is split in two.** `sd.config.mjs` holds the Style Dictionary passes and output
   formats, and `contrast.mjs` holds the WCAG check. Both are plain `.mjs`, as the plan names the
   config file, so they are linted but not type-checked. The pipeline tests cover them instead.

### Cross-module notes

- **L02** — fold the primitive-reference grep (deviation 3) into L02's check scripts so it runs in
  `pnpm check`. A lint rule against raw colour, space, radius, type, motion and elevation values in
  component CSS (principle 4) belongs there too.
- **L03** — component tokens (`--senui-button-*`) are defined in the component's CSS with semantic
  defaults, not in `packages/tokens`. Use `var(--senui-size-target-min)` for target size once the
  `size` tokens exist.
- **L11** — the motion tokens' `reducedMotion` values are the single place reduced motion is
  handled. Components must not add their own `prefers-reduced-motion` blocks for token-driven
  motion.
