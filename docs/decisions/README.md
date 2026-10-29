# Architecture Decision Records

Decisions that shape senui's public API, styling, accessibility or release process. One file per
decision: `NNNN-kebab-title.md`, numbered sequentially. A locked decision changes only via a new
ADR that supersedes it. Every ADR names what was rejected and what the choice costs.

## Index

| ADR                                                | Title                                                                                                            | Status                           |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| [0001](0001-plain-css-on-custom-properties.md)     | Plain CSS on custom properties, no utility framework                                                             | Accepted (amended by 0011)       |
| [0002](0002-token-pipeline.md)                     | Design-token pipeline: DTCG source, Style Dictionary build, `light-dark()` themes                                | Superseded by 0004               |
| [0003](0003-library-build-tsdown.md)               | Library build tool: tsdown                                                                                       | Accepted                         |
| [0004](0004-token-pipeline-sd5-dtcg-2025.md)       | Design-token pipeline: DTCG 2025.10 source, Style Dictionary 5, oklch, unpublished primitives                    | Accepted (amended by 0005, 0010) |
| [0005](0005-token-contract-amendments.md)          | Token contract amendments: themed subtrees, motion factor, explicit surfaces, state names, pipeline-size trigger | Accepted (amended by 0010)       |
| [0006](0006-no-polymorphic-components.md)          | No polymorphic components (`as` / `asChild`)                                                                     | Accepted                         |
| [0007](0007-stylelint-token-guard.md)              | Stylelint guards component CSS against raw values                                                                | Accepted (amended by 0009)       |
| [0008](0008-a11y-contract-adaptation.md)           | The a11y contract gains an `adaptation` section                                                                  | Accepted                         |
| [0009](0009-stylelint-unit-allow-list.md)          | Stylelint: a unit allow-list, and selector specificity as a check                                                | Accepted (amended by 0015)       |
| [0010](0010-tokens-declared-on-themed-subtrees.md) | Tokens are declared on every themed subtree                                                                      | Accepted                         |
| [0011](0011-form-control-validity-and-binding.md)  | Form controls: validity reaches `aria-invalid`, and controls bind through a sealed binding                       | Accepted (amended by 0012, 0013) |
| [0012](0012-binary-controls-own-their-label.md)    | Binary controls own their label; text-entry controls bind to FormField                                           | Accepted                         |
| [0013](0013-aria-invalid-always-explicit.md)       | Form controls always render `aria-invalid`, `"true"` or `"false"`                                                | Accepted                         |
| [0014](0014-dialog-scroll-lock.md)                 | Dialog scroll lock: containment, plus a scoped root lock on by default                                           | Accepted                         |
| [0015](0015-rem-in-media-queries.md)               | `rem` is allowed in size media queries                                                                           | Accepted                         |
| [0016](0016-rem-in-container-queries.md)           | `rem` is allowed in size container queries, and only there                                                       | Accepted                         |
| [0017](0017-contract-essential-motion.md)          | Contracts declare essential motion                                                                               | Accepted                         |
| [0018](0018-no-dir-pseudo-class.md)                | Component CSS mirrors with logical properties, never `:dir()`                                                    | Accepted                         |
| [0019](0019-screen-reader-run-language.md)         | Screen-reader runs record their language                                                                         | Accepted                         |
| [0020](0020-attw-publish-check.md)                 | Published types are checked with attw                                                                            | Accepted                         |
| [0021](0021-tokens-peer-dependency.md)             | The tokens package is a peer dependency, and its majors are components majors                                    | Accepted                         |
| [0022](0022-source-hash-manual-runs.md)            | Manual a11y runs record a fingerprint of what they tested                                                        | Accepted                         |

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
