# senui

A small React component library built on plain CSS and design tokens. Components are few and
finished: every state is designed, accessibility is checked in CI, and each component ships a
machine-readable accessibility contract.

> **Status: stable, 1.0.** Both packages are on npm. From 1.0.0 on, nothing is
> renamed or removed without a major version and a deprecation release before it. See the
> [changelogs](#releases).

**Docs:** [senakster.github.io/senui](https://senakster.github.io/senui/), with every component's
props, states and accessibility contract.

## Packages

| Package                                       | What it is                                                        |
| --------------------------------------------- | ----------------------------------------------------------------- |
| [`@senakster/senui-tokens`](packages/tokens/) | Design tokens as CSS custom properties, plus a typed JS map       |
| [`@senakster/senui`](packages/react/)         | React components, styled by plain CSS stylesheets on those tokens |

The components in 1.0: AlertDialog, Button, Checkbox, CheckboxGroup, Dialog, EmptyState, FormField,
Switch and TextInput.

## Quick start

```sh
pnpm add @senakster/senui @senakster/senui-tokens
```

Load the CSS once, tokens first:

```css
@import '@senakster/senui-tokens/tokens.css';
@import '@senakster/senui/styles.css';
```

Then use the components:

```tsx
import { Button } from '@senakster/senui';

<Button onClick={save}>Save</Button>;
```

See the [`@senakster/senui` README](packages/react/README.md) for loading one component's CSS at a
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

## For AI agents and tools

`@senakster/senui` ships its docs as data: `@senakster/senui/components.json` (every component's
props, values and accessibility contract), `@senakster/senui/llms.txt` and
`@senakster/senui/llms-full.txt`.

## Releases

Each package has its own changelog: [`@senakster/senui`](packages/react/CHANGELOG.md) and
[`@senakster/senui-tokens`](packages/tokens/CHANGELOG.md), also on the docs site under
"Changelog". The two packages are versioned independently, but a major version of the tokens is
always a major version of the components too. How a release is made is in
[CONTRIBUTING.md](CONTRIBUTING.md), "Releasing".

## Requirements

- React 18.3 or 19.
- A browser with cascade layers, `:where()` and `light-dark()`: current versions of the major
  browsers.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, the checks every change passes, and how
components are built and reviewed.
