# 0004 — Design-token pipeline: DTCG 2025.10 source, Style Dictionary 5, oklch, unpublished primitives

- **Status:** Accepted
- **Date:** 2026-10-16
- **Deciders:** senakster (solo call, no review required)
- **Affects modules:** L01, L02, L03, L04, L11

## Context

ADR-0002 set up the token pipeline: DTCG JSON in, Style Dictionary v4, `light-dark()` themes, and
three tiers. Its revisit trigger was "a new Style Dictionary major or a stable DTCG spec changes the
input format". Both happened before L01 started.

- **Style Dictionary 5** is the current major. It needs Node 22 or later, which the workspace already
  requires.
- **The DTCG spec reached a stable version (2025.10).** It changed what a `$value` looks like:
  a colour is `{ "colorSpace": "oklch", "components": [L, C, H], "alpha"?: n }` and a dimension or
  duration is `{ "value": 12, "unit": "px" }`. Style Dictionary 5 reads both.

Building on v4 and the pre-stable string format would have started the library on a superseded
major and a token format that would need migrating. Two questions ADR-0002 left open came up at the
same time:

- **Colour space.** L01's open question asked whether to author colours in oklch or hex.
- **Whether primitives ship.** ADR-0002 called primitives internal but still emitted them as custom
  properties. Anything shipped in `tokens.css` can be used by a consumer, so "internal" was a promise
  the output did not keep.

## Decision

This ADR restates the whole pipeline and supersedes ADR-0002. Anything it doesn't change is carried
over unchanged.

- **Source format: DTCG 2025.10** in `packages/tokens/src/*.tokens.json`, using object values for
  colours, dimensions and durations, and `{alias}` references.
- **Build: Style Dictionary 5**, pinned exactly.
- **Colours are authored in oklch** and emitted as `oklch()`. Style Dictionary's stock `color/css`
  transform converts every colour to hex or rgb, so a custom transform serializes each colour in the
  space it was authored in.
- **Tiers:**
  - _Primitives_ live under a top-level `primitive` group in the source (`{primitive.color.blue.600}`).
    They are **not emitted**: not in `tokens.css`, not in the typed map. Semantic tokens that alias
    them compile to the resolved value.
  - _Semantic_ tokens (`--senui-color-fg-danger`, `--senui-space-3`) are the public API.
  - _Component_ tokens (`--senui-button-bg`) default to semantic ones and are the documented override
    points. They are defined with their component (L03+), not here.
- **Themes and modes are authored on the token**, in `$extensions.senui`:
  - `dark` is the dark-theme value. Every public colour token must have one, and only colour tokens
    may have one. The build emits `light-dark(<value>, <dark>)`.
  - `reducedMotion` is the value under `prefers-reduced-motion: reduce`, emitted once in a media
    block.
  - `contrast` lists the backgrounds a colour must be readable on, with a minimum ratio. A build-time
    check tests every pair in both themes and fails the build on a miss.
  - Each mode is built as a separate Style Dictionary pass that swaps in the mode's value, so every
    value goes through the same reference resolution and transforms.
- **Output:** `dist/tokens.css` and a typed JS map (`dist/index.js` + `.d.ts`, built by tsdown per
  ADR-0003). All CSS is inside `@layer senui.tokens`, after one layer-order statement. Theming is
  unchanged from ADR-0002: `color-scheme: light dark` on `:where(:root)`, and `[data-theme]` sets only
  `color-scheme`.

**Rejected:**

- **Staying on Style Dictionary v4 with legacy string values.** It works today, but it starts a new
  library on an old major and a pre-stable format, with a migration already owed.
- **sRGB hex for colours.** It's familiar, but ramps are uneven in perceived lightness and every step
  has to be tuned by eye. The contrast check makes oklch safe to tune.
- **Shipping primitives as custom properties** (ADR-0002's approach). Consumers could re-theme a
  whole ramp, but every primitive name would become de facto public API under semver.
- **A second token file per theme.** Light and dark values for one token would live in different
  files and drift. `$extensions` keeps both on the token.

## Consequences

- Consumers can't override a primitive. They override semantic or component tokens, which is the
  contract we actually want to keep stable.
- `oklch()` has been Baseline since 2023, and `light-dark()` since May 2024. Older browsers get no
  colours from these tokens.
- The `$extensions.senui` keys (`dark`, `reducedMotion`, `contrast`) are a source-format contract
  that the token author writes against. `packages/tokens/README.md` documents it.
- WCAG 2 contrast is defined in sRGB, so the check gamut-maps any out-of-sRGB oklch colour before
  measuring it.
- The mode passes and the `light-dark()` pairing are pipeline code I own. ADR-0002's revisit trigger
  for that code carries over.
- At adoption the pipeline code (`sd.config.mjs` + `contrast.mjs`) was about 220 non-blank,
  non-comment lines, and about a third of that is the CSS and TS output templates.
- **Revisit when:** a third theme is needed (`light-dark()` covers two), the pipeline code grows
  past about 300 lines, Style Dictionary releases a new major, or consumers ask to re-theme at the
  primitive level.
