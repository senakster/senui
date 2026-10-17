# 0010 — Tokens are declared on every themed subtree

- **Status:** Accepted
- **Date:** 2026-10-17
- **Deciders:** senakster (solo call, no review required)
- **Affects modules:** L01, L03, L04, L05, L06, L07, L08, L11
- **Amends:** [ADR-0004](0004-token-pipeline-sd5-dtcg-2025.md) (output format),
  [ADR-0005](0005-token-contract-amendments.md) (themed subtrees)

## Context

ADR-0004 emits each colour token once, on `:root`, as `light-dark(<light>, <dark>)`. A
`data-theme="dark"` element sets `color-scheme: dark`; natively, the inherited `light-dark()` then
resolves in the subtree's scheme (ADR-0005).

The Storybook Tokens page showed this breaking in a production build. Vite 8's default build target
("baseline widely available") doesn't include `light-dark()` yet, so its CSS minifier, Lightning CSS,
rewrites every call into a fallback built on `--lightningcss-light` / `--lightningcss-dark`
variables. Those variables resolve on the element that declares the token, which was `:root`, and
the subtree inherits the result. A dark subtree inside a light page rendered light. Dev mode,
which doesn't minify, looked correct.

Probed with a default Vite app importing only `tokens.css`: 0 of 28 `light-dark()` calls survived the
build, and a `data-theme="dark"` subtree computed the light background. Any consumer on default
Vite settings would have shipped this.

## Decision

Declare every token on `:where(:root, [data-theme])` instead of `:where(:root)`, including the
reduced-motion overrides. Values are unchanged and `light-dark()` stays. `color-scheme: light dark`
stays on `:root` alone, so a subtree's own `light` or `dark` isn't reset.

Each themed subtree now computes its tokens itself, so the result is the same whether the browser
evaluates `light-dark()` natively or a build tool has rewritten it. Verified in Chromium, in source
and in a default Vite build: dark subtree, light subtree nested inside it, the operating system's
dark mode, and reduced motion inside a subtree.

**Rejected:**

- **Per-theme blocks instead of `light-dark()`** (light on `:root`, dark in a
  `prefers-color-scheme` query and on `[data-theme="dark"]`). Immune to any transpiler, but about
  three times the colour declarations, and every consumer override needs a light and a dark rule.
- **Keep the output, and document a build setting** (raise Vite's CSS target, or exclude
  `light-dark()` from Lightning CSS). The default breaks silently and only in production; most
  consumers would never read the note.

## Consequences

- **Overrides target `:root, [data-theme]`.** A consumer's `:root { --senui-… }` no longer reaches
  inside a themed subtree, because the subtree's own declaration beats the inherited value. The
  tokens README, the react README and the Tokens docs page say so.
- A regression test in `packages/tokens` pins the selector and the separate `color-scheme` rule.
- `tokens.css` is the same size: one selector list changed.
- **Revisit when:** Vite's default target (and Lightning CSS's) includes `light-dark()`, at which
  point declaring on `:root` alone would work again. Even then, keeping this costs nothing.
