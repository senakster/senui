# @senakster/tokens

Design tokens for senui: CSS custom properties in `@layer senui.tokens`, plus a typed JS map.

```css
@import '@senakster/tokens/tokens.css';
```

```ts
import { tokens } from '@senakster/tokens';
tokens['color.fg.default'].cssVar; // '--senui-color-fg-default'
```

Every token in `tokens.css` is public API. Renaming or removing one is a major version.

## Writing tokens

Tokens are written by hand in `src/*.tokens.json`, in the
[DTCG 2025.10](https://www.designtokens.org/tr/2025.10/format/) format, and built by
`pnpm build` (`node sd.config.mjs && tsdown`). The pipeline is described in ADR-0004.

[`examples/example.tokens.json`](examples/example.tokens.json) is a complete example covering
every category and every `$extensions.senui` key. It isn't built or shipped, but a test builds it,
so it always passes the pipeline's checks. Copy from it freely; the values are placeholders.

### Tiers

- **Primitives** go under a top-level `primitive` group: `primitive.color.blue.600`. They are
  never emitted. A token that aliases one compiles to its resolved value, so consumers can't
  depend on primitive names.
- **Semantic tokens** are every other top-level group (`color`, `space`, `radius`, `font`,
  `motion`, `elevation`, `size`). The path becomes the custom property: `color.fg.danger` →
  `--senui-color-fg-danger`.
- **Component tokens** (`--senui-button-bg`) are not defined here. Each component defines its own
  with semantic defaults.

**State variants are suffixed siblings, never children** (ADR-0005): `color.bg.accent`,
`color.bg.accent-hover`, `color.bg.accent-active`. A base token stays a leaf, so adding a state
never renames it.

### Values

Use the DTCG object forms:

```json
{ "$type": "color", "$value": { "colorSpace": "oklch", "components": [0.55, 0.2, 260] } }
{ "$type": "dimension", "$value": { "value": 12, "unit": "px" } }
{ "$type": "duration", "$value": { "value": 120, "unit": "ms" } }
```

Colours are authored in oklch and emitted as `oklch()`. Any colour space DTCG allows also works,
and it is kept as authored.

Make a shadow's `color` a reference to a public colour token (`"{color.shadow}"`). It is then
emitted as `var(--senui-color-shadow)`, so the shadow follows that token's dark value. A
primitive reference or an inline colour is resolved to a single value and stays the same in both
themes.

### `$extensions.senui`

| Key             | On                  | Meaning                                                                                      |
| --------------- | ------------------- | -------------------------------------------------------------------------------------------- |
| `dark`          | every public colour | Required. The dark-theme value or alias; the build emits `light-dark(<$value>, <dark>)`.     |
| `contrast`      | public colours      | `[{ "against": "{color.bg.default}", "min": 4.5 }, …]`: at least one pair, unless `surface`. |
| `surface`       | public colours      | `true` opts the colour out of contrast pairs. For backgrounds and WCAG-exempt colours only.  |
| `reducedMotion` | any token           | The value under `prefers-reduced-motion: reduce`.                                            |

`dark` is only allowed on colour tokens, because `light-dark()` only takes colours.

Every public colour needs either contrast pairs or `"surface": true` (ADR-0005). Use `surface` for
backgrounds and fills, and for colours WCAG exempts: disabled controls, decorative dividers and
shadows. Say which in the token's `$description`, because opting out has to be visible.

Each `contrast` pair is checked in both themes, after compositing translucent colours. An
out-of-sRGB colour is measured both gamut-mapped and clipped, and the lower ratio counts. Use 4.5
for text and 3 for non-text (borders, focus rings, icons). A pair below its minimum fails the build
and names the token, the background, the theme and the ratio, to three decimals. So does a
malformed pair, such as a missing or misspelled `min`.

### Rules the CSS adds

- **Themed subtrees are self-contained.** `tokens.css` sets `background-color`, `color` and
  `accent-color` on every `[data-theme]` element, in `@layer senui.base`. A token set must define
  `color.bg.default`, `color.fg.default` and `color.fg.accent`, or the build fails.
- **Motion is multiplied by `--senui-motion-reduce`**, which is `1` normally and `0` under reduced
  motion. Components write `calc(var(--senui-motion-distance-md) * var(--senui-motion-reduce))`, so
  a consumer who overrides a distance can't bring motion back.
- **Focus rings** are drawn as `outline: var(--senui-focus-ring-width) solid
var(--senui-color-focus-ring)` with `outline-offset: var(--senui-focus-ring-offset)`. That puts
  the ring on the page background, which is what its contrast pairs are checked against. Never use
  `box-shadow` for a ring: forced-colours mode removes it.
- **Elevated surfaces** (`bg.raised` plus an `elevation` shadow) also need a border, for the same
  reason.

Example:

```json
{
  "primitive": {
    "color": {
      "ink": {
        "$type": "color",
        "$value": { "colorSpace": "oklch", "components": [0.2, 0.02, 260] }
      },
      "paper": {
        "$type": "color",
        "$value": { "colorSpace": "oklch", "components": [0.98, 0.005, 260] }
      }
    }
  },
  "color": {
    "bg": {
      "default": {
        "$type": "color",
        "$value": "{primitive.color.paper}",
        "$extensions": { "senui": { "dark": "{primitive.color.ink}", "surface": true } }
      }
    },
    "fg": {
      "default": {
        "$type": "color",
        "$description": "Body text",
        "$value": "{primitive.color.ink}",
        "$extensions": {
          "senui": {
            "dark": "{primitive.color.paper}",
            "contrast": [{ "against": "{color.bg.default}", "min": 4.5 }]
          }
        }
      }
    }
  }
}
```

## Theming

`color-scheme: light dark` is set on `:where(:root)`, so the default follows the operating system.
`data-theme="light"` or `data-theme="dark"` on any element fixes the theme for that subtree, and
that element gets its own background and text colour.

A light-only app opts out of dark mode with one unlayered rule:

```css
:root {
  color-scheme: light;
}
```

To override a colour, give both themes. A single value replaces the dark value too, and it skips
the contrast check that the token passed:

```css
:root,
[data-theme] {
  --senui-color-fg-accent: light-dark(oklch(50% 0.15 150), oklch(75% 0.15 150));
}
```

Tokens are declared on `:root` and again on every `[data-theme]` element (ADR-0010). Build tools
that don't yet target `light-dark()`, including Vite's default production build, rewrite it into
variables that resolve where the token is declared; declaring it on each themed subtree keeps those
subtrees correct. The cost is that an override on `:root` alone stops at the first `data-theme`
element, so include `[data-theme]` in your selector.
