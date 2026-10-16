# 0009 — Stylelint: a unit allow-list, and selector specificity as a check

- **Status:** Accepted
- **Date:** 2026-10-16
- **Deciders:** senakster (solo call, no review required)
- **Affects modules:** L02, L03, L04, L05, L06, L07, L11
- **Amends:** [ADR-0007](0007-stylelint-token-guard.md)

## Context

ADR-0007 guarded component CSS with Stylelint's built-in rules. One of them blocked a list of units:
`px`, `rem`, `em`, `ms` and `s`. The L02 review ran probe stylesheets through the config, and these
all passed:

- `11pt`, `1vmin` and `2lh`;
- `font-size: small`, `line-height: 1.37`, `z-index: 9999`;
- an easing keyword inside the `transition` shorthand;
- a selector with no `:where()`, such as `.senui-button[data-variant='danger']`.

A blocklist misses every unit nobody thought to list (`pt`, `pc`, `in`, `cm`, `mm`, `Q`, `vmin`,
`lh`, `ex`, `cap`, …) and every unit CSS adds in future. ADR-0001's `:where()` rule was only held by
reviewers.

## Decision

Still using built-in rules only (ADR-0007 stands on that):

- **`unit-allowed-list`** replaces `unit-disallowed-list`. Allowed: `%`, `fr`, `ch`, `deg` and `turn`.
  These are layout units, not design values. Lengths and durations come from tokens. A new CSS unit
  is rejected until someone adds it here.
- **`selector-max-specificity: 0,1,0`** and **`selector-max-id: 0`**. Base selectors sit in `:where()`;
  at most one class, attribute or pseudo-class may sit outside it.
- `font-size`, `line-height`, `letter-spacing` and `z-index` join the properties that must be a
  token. `box-shadow` may be a comma-separated list of tokens.
- Easing keywords are rejected inside `transition` and `animation`. `steps()` and `linear()` join the
  disallowed functions.

**Rejected:**

- **Extending the blocklist.** No ADR needed, but it fails open: the next unit gets through.
- **A specificity plugin, or a value plugin.** Built-in rules cover both; ADR-0007 rejected a second
  dependency for this.

## Consequences

- A legitimate new layout unit (`cqi` for container queries, say) needs a one-line config change
  and a note here, rather than slipping through.
- `:where(.senui-button):hover:not(:disabled)` is `0,2,0` and fails. Write it as
  `:where(.senui-button:hover:not(:disabled))`, which keeps the rule overridable.
- `z-index` needs a token before any component can layer, which is the point: stacking order is a
  design decision.
- **Revisit when:** the allow-list blocks a value with no sensible token, or a Stylelint major
  renames these rules.
