# senui

A public, standalone React + TypeScript component library: design tokens, a small set of
thoroughly finished components, and documentation that engineers and AI agents can use without
help. Published as `@senakster/tokens` and `@senakster/react` (pnpm workspace).

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

| ADR                                                           | Decision                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [0001](docs/decisions/0001-plain-css-on-custom-properties.md) | Plain CSS in `@layer senui.*` and `:where()`, variants as data attributes. No Tailwind, CSS Modules or CSS-in-JS                                                                                                                                                                            |
| [0003](docs/decisions/0003-library-build-tsdown.md)           | Both packages build with tsdown (tsup is unmaintained): ESM + `.d.ts`, CSS copied rather than bundled, `publint` in the build                                                                                                                                                               |
| [0004](docs/decisions/0004-token-pipeline-sd5-dtcg-2025.md)   | DTCG 2025.10 JSON → Style Dictionary 5 → `light-dark()` custom properties + a typed map. Colours authored in oklch. Primitives (`primitive.*`) are never emitted; semantic and component tokens are public. Dark, reduced-motion and contrast live in `$extensions.senui` (supersedes 0002) |

## Naming

- npm scope: `@senakster` (packages `@senakster/tokens`, `@senakster/react`)
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
  commit messages. The project and its fixtures are generic.
- Commit as `senakster@gmail.com` (set in this repo's git config).

## Verification

`pnpm check` (typecheck + lint + format:check) must pass before any module is marked done, and so
must `pnpm test` (Vitest in `packages/react`; it passes with no test files until L03). CI
(`.github/workflows/ci.yml`) also runs `pnpm --filter docs build-storybook`. `pnpm build` runs
tsdown with publint, which fails on a broken `exports` map.

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
