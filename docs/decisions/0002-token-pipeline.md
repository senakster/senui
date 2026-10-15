# 0002 — Design-token pipeline: DTCG source, Style Dictionary build, `light-dark()` themes

- **Status:** Accepted
- **Date:** 2026-10-15
- **Deciders:** senakster (solo call, no review required)
- **Affects modules:** L01, L02, L03, L04, L11

## Context

ADR-0001 makes custom properties the styling contract, so the token package is where every
visual value is defined. It has to serve three readers at once:

- **Component CSS** reads `var(--senui-*)`.
- **Consumers** override a few tokens to re-theme without forking.
- **Docs and code** need values at runtime: the Tokens page and contrast checks.

It also has to produce a light and a dark theme without doubling every declaration or adding a
runtime theme provider. Without a build step, every value would be duplicated by hand across CSS,
TS and docs. With too heavy a build step, a small library would carry tooling it doesn't need.

## Decision

- **Source format: W3C Design Tokens (DTCG) JSON** in `packages/tokens/src/*.tokens.json`, using
  `$value`, `$type` and `{alias}` references.
- **Build: Style Dictionary v4** with DTCG input, plus one custom format that pairs light and dark
  values into a single `light-dark(<light>, <dark>)` declaration. The outputs are
  `dist/tokens.css`, inside `@layer senui.tokens`, and a typed JS/TS map.
- **Three tiers:**
  - _Primitives_ (`--senui-color-blue-600`) are internal and never referenced from components.
  - _Semantic_ tokens (`--senui-color-fg-danger`, `--senui-space-3`) are the public API.
  - _Component_ tokens (`--senui-button-bg`) default to semantic ones and are the documented
    override points.
- **Theming:** `color-scheme: light dark` on `:where(:root)` means the default follows the OS.
  `[data-theme="light" | "dark"]` changes only `color-scheme`, so a subtree can be themed on its
  own.
- **Categories:** colour, space, radius, typography, motion, elevation, size. Motion tokens carry
  the reduced-motion behaviour (L11), and `size` carries the 24px minimum target (WCAG 2.5.8).

**Rejected:**

- **A hand-rolled build script.** It's cheaper on day one, but I would re-implement alias
  resolution, type transforms and light/dark pairing myself, and then own those bugs.
- **Tokens written directly as CSS custom properties.** No typed runtime map, no build-time
  contrast check, and the docs page would have to parse CSS.
- **Dark mode as a second token set under `[data-theme="dark"]` or `prefers-color-scheme`.** That
  doubles every colour declaration and lets the two themes drift. `light-dark()` keeps both values
  of a token on one line.
- **A runtime theme provider (React context).** It forces React onto token consumers and causes a
  flash of the wrong theme on server-rendered pages.

## Consequences

- Style Dictionary is a dev dependency with config to learn. The custom format is the one piece
  of pipeline code I own.
- Semantic token names are public from the first release. Renaming one is a major version, with
  a deprecation step first (L02).
- `light-dark()` has been Baseline since May 2024. Older browsers get no colours from these tokens,
  which I'm accepting for a library released in 2026.
- `light-dark()` only supports two themes. A high-contrast or brand theme would need a different
  mechanism.
- **Revisit when:** a third theme is needed, the custom format grows past about 100 lines, or a
  new Style Dictionary major or a stable DTCG spec changes the input format.
