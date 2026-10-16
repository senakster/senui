# Architecture Decision Records

Decisions that shape senui's public API, styling, accessibility or release process. One file per
decision: `NNNN-kebab-title.md`, numbered sequentially. A locked decision changes only via a new
ADR that supersedes it. Every ADR names what was rejected and what the choice costs.

## Index

| ADR                                            | Title                                                                                                            | Status                     |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------- |
| [0001](0001-plain-css-on-custom-properties.md) | Plain CSS on custom properties, no utility framework                                                             | Accepted                   |
| [0002](0002-token-pipeline.md)                 | Design-token pipeline: DTCG source, Style Dictionary build, `light-dark()` themes                                | Superseded by 0004         |
| [0003](0003-library-build-tsdown.md)           | Library build tool: tsdown                                                                                       | Accepted                   |
| [0004](0004-token-pipeline-sd5-dtcg-2025.md)   | Design-token pipeline: DTCG 2025.10 source, Style Dictionary 5, oklch, unpublished primitives                    | Accepted (amended by 0005) |
| [0005](0005-token-contract-amendments.md)      | Token contract amendments: themed subtrees, motion factor, explicit surfaces, state names, pipeline-size trigger | Accepted                   |
| [0006](0006-no-polymorphic-components.md)      | No polymorphic components (`as` / `asChild`)                                                                     | Accepted                   |
| [0007](0007-stylelint-token-guard.md)          | Stylelint guards component CSS against raw values                                                                | Accepted (amended by 0009) |
| [0008](0008-a11y-contract-adaptation.md)       | The a11y contract gains an `adaptation` section                                                                  | Accepted                   |
| [0009](0009-stylelint-unit-allow-list.md)      | Stylelint: a unit allow-list, and selector specificity as a check                                                | Accepted                   |

## Template

```markdown
# NNNN — <title>

- **Status:** Proposed | Accepted | Superseded by NNNN
- **Date:** YYYY-MM-DD
- **Deciders:** <who>
- **Affects modules:** <LNN, LNN>

## Context

What problem / forces led to this decision?

## Decision

What we chose — and what we rejected.

## Consequences

Trade-offs and costs.

- **Revisit when:** <the concrete condition that would reopen this>
```
