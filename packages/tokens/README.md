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

### Tiers

- **Primitives** go under a top-level `primitive` group: `primitive.color.blue.600`. They are
  never emitted. A token that aliases one compiles to its resolved value, so consumers can't
  depend on primitive names.
- **Semantic tokens** are every other top-level group (`color`, `space`, `radius`, `font`,
  `motion`, `elevation`, `size`). The path becomes the custom property: `color.fg.danger` →
  `--senui-color-fg-danger`.
- **Component tokens** (`--senui-button-bg`) are not defined here. Each component defines its own
  with semantic defaults.

### Values

Use the DTCG object forms:

```json
{ "$type": "color", "$value": { "colorSpace": "oklch", "components": [0.55, 0.2, 260] } }
{ "$type": "dimension", "$value": { "value": 12, "unit": "px" } }
{ "$type": "duration", "$value": { "value": 120, "unit": "ms" } }
```

Colours are authored in oklch and emitted as `oklch()`. Any colour space DTCG allows also works,
and it is kept as authored. A shadow's `color` must be a reference to a colour token, not an
inline colour object.

### `$extensions.senui`

| Key             | On                  | Meaning                                                                                  |
| --------------- | ------------------- | ---------------------------------------------------------------------------------------- |
| `dark`          | every public colour | Required. The dark-theme value or alias; the build emits `light-dark(<$value>, <dark>)`. |
| `contrast`      | every public colour | Required. `[{ "against": "{color.bg.default}", "min": 4.5 }, …]`, or `[]` for a surface. |
| `reducedMotion` | any token           | The value under `prefers-reduced-motion: reduce`.                                        |

`dark` is only allowed on colour tokens, because `light-dark()` only takes colours.

Each `contrast` pair is checked in both themes, after compositing translucent colours and
gamut-mapping to sRGB. Use 4.5 for text and 3 for non-text (borders, focus rings, icons). A pair
below its minimum fails the build and names the token, the background, the theme and the ratio.

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
        "$extensions": { "senui": { "dark": "{primitive.color.ink}", "contrast": [] } }
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
`data-theme="light"` or `data-theme="dark"` on any element fixes the theme for that subtree.
