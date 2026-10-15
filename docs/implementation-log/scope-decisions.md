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

| Deliverable / criterion                                     | Decision | Reason                                                                                         | Re-include when                                   |
| ----------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| pnpm workspace, strict `tsconfig.base.json`, three packages | in       | core to the module contract                                                                    | —                                                 |
| `pnpm check` (typecheck + lint + format:check)              | in       | core to the module contract                                                                    | —                                                 |
| Library build tool                                          | in       | tsdown, not the plan's tsup, which its own README says is unmaintained (ADR-0003)              | —                                                 |
| Vitest + jsdom + Testing Library harness                    | in       | wired with `passWithNoTests`, so `pnpm test` is green before the first component               | —                                                 |
| Storybook shell in `apps/docs`                              | in       | react-vite + addon-docs, with one Introduction page; stories colocated in `packages/react/src` | —                                                 |
| Changesets                                                  | in       | `access: public`, docs app ignored; publish workflow stays in L10                              | —                                                 |
| `.github/workflows/ci.yml`                                  | in       | install (frozen) → check → test → build-storybook                                              | —                                                 |
| CI runs green on a PR                                       | deferred | the repo has no GitHub remote yet; workflow steps were run locally instead                     | a GitHub remote exists and the first PR is opened |
| `.claude/workflows/review-component.js`                     | in       | reviewer fan-out for pair mode; three reviewers until the L09/L10 agents exist                 | —                                                 |
| Harness docs (CLAUDE.md, decisions, log, OVERRIDES)         | in       | landed at bootstrap; ADR index and locked-decisions table brought up to date here              | —                                                 |

### Known-unmet acceptance criteria

- **CI runs green on a PR** — no remote. Every step in `ci.yml` was run locally on Node 26
  (CI uses Node 24 via `.node-version`) and passed. The action versions (`checkout@v5`,
  `setup-node@v5`, `pnpm/action-setup@v4`) are unverified until the first run.

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
