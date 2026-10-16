# Progress

Authoritative module status for senui. Plans are vendored (gitignored) in `.catalogue/library_catalogue/`.

Status legend — plan: `plan-ready` · `not-planned` (plan not written yet upstream); implementation: `not-started` · `in-progress` · `done`.

| #   | Module                            | Plan                          | Plan status | Implementation | Last updated |
| --- | --------------------------------- | ----------------------------- | ----------- | -------------- | ------------ |
| L00 | Workspace, harness & CI           | L00-workspace-and-harness     | plan-ready  | done           | 2026-10-15   |
| L01 | Design tokens                     | L01-design-tokens             | plan-ready  | done           | 2026-10-16   |
| L02 | Component API conventions         | L02-component-api-conventions | plan-ready  | done           | 2026-10-16   |
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

- **2026-10-16** — L02 done. Conventions (`packages/react/CONVENTIONS.md`, 11 rules plus the public surface), `useControllableState`, `deprecate`, the `A11yContract` type with its runtime check, type helpers (`NativeProps`, `DistributiveOmit`, `mergeIds`, `useNameCheck`), and check scripts for contracts, component CSS and dist CSS. ADR-0006 (no polymorphism), ADR-0007 and ADR-0009 (Stylelint token guard, unit allow-list), ADR-0008 (contract `adaptation` section). Reviewed by `component-api-reviewer` and `wcag-auditor`: 24 findings, all accepted, none rejected. Tests: tokens 31, react 44, type tests clean.
- **2026-10-16** — L01 done. Reviewed by `modern-web-curator` and `wcag-auditor`; Emil accepted every finding, with none rejected. ADR-0005 amends ADR-0004: `[data-theme]` subtrees get their own background and colour, components multiply movement by `--senui-motion-reduce`, opting out of contrast needs `surface: true`, states are suffixed siblings, and focus rings are offset outlines. The token set is redrafted by Claude for Emil's review: 68 tokens, with state fills, invalid borders, border widths, focus geometry, a raised surface, rem space on a linear `space.N` scale, and `size.control.*`. Contrast checker fixes: a missing or misspelled `min` no longer passes, out-of-gamut colours use the worse of mapped and clipped, and ratios print to three decimals. Tests 31/31. The focus-ring pair against `bg.accent` was dropped as unsatisfiable (scope-decisions § L01, deviation 5). ADR-0004's 300-line trigger has fired (308 lines).

- **2026-10-16** — L01 in progress. The token pipeline is built and tested: Style Dictionary 5, DTCG 2025.10 source, `light-dark()` pairing through mode passes, an oklch-preserving colour transform, and a build-time contrast check in both themes. Also the typed map, the `./tokens.css` export, and a Tokens docs page. ADR-0004 supersedes ADR-0002 (its revisit trigger fired), resolves the colour-space question (oklch) and stops emitting primitives. `pnpm check` now builds first. L00's "CI green on a PR" is closed: the first push ran green. Waiting on Emil's `src/*.tokens.json`.
- **2026-10-15** — L00 done. pnpm workspace (`packages/tokens`, `packages/react`, `apps/docs`), `pnpm check`, Vitest harness, Storybook shell, Changesets, CI workflow and the review-component workflow. ADR-0003 picks tsdown over tsup, which is unmaintained, and resolves L00's open question. Pins: TypeScript 6.0 (typescript-eslint ceiling) and ESLint 9 (jsx-a11y ceiling). Deferred: "CI green on a PR" until a GitHub remote exists. See scope-decisions.md § L00.
- **2026-10-15** — Bootstrapped with the library profile: plans vendored, implementation log, decision corpus and override log seeded. Next: L00.
