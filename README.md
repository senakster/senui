# senui

A small React component library built on plain CSS and design tokens. Components are few and
finished: every state is designed, accessibility is checked in CI, and each component ships a
machine-readable accessibility contract.

> **Status: pre-release.** Nothing is published to npm yet. The token package and the component
> conventions are in place; the first component (Button) is in progress. APIs may change until 1.0.

## Packages

| Package                                 | What it is                                                        |
| --------------------------------------- | ----------------------------------------------------------------- |
| [`@senakster/tokens`](packages/tokens/) | Design tokens as CSS custom properties, plus a typed JS map       |
| [`@senakster/react`](packages/react/)   | React components, styled by plain CSS stylesheets on those tokens |

## Quick start

```sh
pnpm add @senakster/react @senakster/tokens
```

Load the CSS once, tokens first:

```css
@import '@senakster/tokens/tokens.css';
@import '@senakster/react/styles.css';
```

Then use the components:

```tsx
import { Button } from '@senakster/react';

<Button onClick={save}>Save</Button>;
```

See the [`@senakster/react` README](packages/react/README.md) for loading one component's CSS at a
time, theming and overriding styles.

## What you can rely on

- **No styling runtime.** Styles are ordinary CSS files in cascade layers
  (`@layer senui.tokens, senui.base, senui.components`). There is no CSS-in-JS, Tailwind or CSS
  Modules, and no stylesheet is injected from JavaScript.
- **Your CSS wins.** Every senui rule sits in a layer, with base selectors in `:where()`, so one
  class of yours overrides it. Each component also exposes component tokens
  (`--senui-button-bg`) for targeted changes.
- **Light and dark from one stylesheet.** Colours use `light-dark()`, follow the operating system by
  default, and can be fixed per subtree with `data-theme="light"` or `data-theme="dark"`.
- **Hard to misuse.** Variants are closed unions, and an accessible name is required by the types:
  an icon-only button without a label doesn't compile.
- **Accessibility is tested, not promised.** Every component is checked with axe in its unit tests,
  and its accessibility contract records how it was tested by hand (keyboard and screen reader, with
  versions) and what your app still has to do.
- **Semver means it.** Removing or renaming a prop, export, CSS class or public token is a major
  version, preceded by a release that warns in development and says what to use instead.

## Requirements

- React 18.3 or 19.
- A browser with cascade layers, `:where()` and `light-dark()`: current versions of the major
  browsers.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, the checks every change passes, and how
components are built and reviewed.
