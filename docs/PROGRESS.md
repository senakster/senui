# Progress

Authoritative module status for senui. Plans are vendored (gitignored) in `.catalogue/library_catalogue/`.

Status legend — plan: `plan-ready` · `not-planned` (plan not written yet upstream); implementation: `not-started` · `in-progress` · `done`.

| #   | Module                            | Plan                          | Plan status | Implementation | Last updated |
| --- | --------------------------------- | ----------------------------- | ----------- | -------------- | ------------ |
| L00 | Workspace, harness & CI           | L00-workspace-and-harness     | plan-ready  | done           | 2026-10-15   |
| L01 | Design tokens                     | L01-design-tokens             | plan-ready  | in-progress    | 2026-10-16   |
| L02 | Component API conventions         | L02-component-api-conventions | plan-ready  | not-started    | 2026-10-15   |
| L03 | Button                            | L03-button                    | plan-ready  | not-started    | 2026-10-15   |
| L04 | FormField + TextInput             | L04-formfield-and-textinput   | plan-ready  | not-started    | 2026-10-15   |
| L05 | Checkbox / Switch                 | —                             | not-planned | not-started    | 2026-10-15   |
| L06 | Dialog                            | —                             | not-planned | not-started    | 2026-10-15   |
| L07 | EmptyState                        | —                             | not-planned | not-started    | 2026-10-15   |
| L08 | Test & a11y gate                  | —                             | not-planned | not-started    | 2026-10-15   |
| L09 | Docs & machine-readable manifest  | —                             | not-planned | not-started    | 2026-10-15   |
| L10 | Release, versioning & deprecation | —                             | not-planned | not-started    | 2026-10-15   |
| L11 | Motion                            | —                             | not-planned | not-started    | 2026-10-15   |

## Changelog

- **2026-10-16** — L01 in progress. The token pipeline is built and tested: Style Dictionary 5, DTCG 2025.10 source, `light-dark()` pairing through mode passes, an oklch-preserving colour transform, and a build-time contrast check in both themes. Also the typed map, the `./tokens.css` export, and a Tokens docs page. ADR-0004 supersedes ADR-0002 (its revisit trigger fired), resolves the colour-space question (oklch) and stops emitting primitives. `pnpm check` now builds first. L00's "CI green on a PR" is closed: the first push ran green. Waiting on Emil's `src/*.tokens.json`.
- **2026-10-15** — L00 done. pnpm workspace (`packages/tokens`, `packages/react`, `apps/docs`), `pnpm check`, Vitest harness, Storybook shell, Changesets, CI workflow and the review-component workflow. ADR-0003 picks tsdown over tsup, which is unmaintained, and resolves L00's open question. Pins: TypeScript 6.0 (typescript-eslint ceiling) and ESLint 9 (jsx-a11y ceiling). Deferred: "CI green on a PR" until a GitHub remote exists. See scope-decisions.md § L00.
- **2026-10-15** — Bootstrapped with the library profile: plans vendored, implementation log, decision corpus and override log seeded. Next: L00.
