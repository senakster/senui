# @senakster/senui

senui's React components: native elements, plain CSS on design tokens, and an accessibility
contract for each component.

> **Pre-release.** Not yet published. The first component, Button, is in progress.

## Install

```sh
pnpm add @senakster/senui @senakster/senui-tokens
```

`react` and `react-dom` 18.3 or 19 are peer dependencies.

## Load the CSS

Components ship as JavaScript plus plain stylesheets. Nothing is injected at runtime, so load the
CSS yourself, once, tokens first:

```css
@import '@senakster/senui-tokens/tokens.css';
@import '@senakster/senui/styles.css'; /* every component */
```

Or only the components you use:

```css
@import '@senakster/senui-tokens/tokens.css';
@import '@senakster/senui/styles/Button.css';
```

Load `tokens.css` before any per-component file. It declares the layer order
(`senui.tokens, senui.base, senui.components`); a component file loaded first would create its layer
too early and lose to the others.

If your app uses `@layer` itself, put `senui` first in your own order so your layers win:

```css
@layer senui, app;
```

## Use

```tsx
import { Button } from '@senakster/senui';

<Button onClick={save}>Save</Button>
<Button variant="danger" size="sm" onClick={remove}>Delete</Button>
<Button icon={<CloseIcon />} aria-label="Close" onClick={close} />
```

Components render one native element each, forward their `ref` to it, and pass through its native
attributes and `className`.

## Change how it looks

From lightest to heaviest touch:

1. **Tokens**: override a semantic token for the whole app or a subtree. Give both themes:

   ```css
   :root,
   [data-theme] {
     --senui-color-bg-accent: light-dark(oklch(55% 0.2 150), oklch(70% 0.17 150));
   }
   ```

   Keep `[data-theme]` in the selector: every themed subtree declares its own tokens, so an override
   on `:root` alone doesn't reach inside one.

2. **Component tokens**: change one component without touching the rest:

   ```css
   .checkout {
     --senui-button-bg: var(--senui-color-bg-danger);
   }
   ```

3. **A class**: senui's rules are layered and use `:where()`, so any class of yours beats them.

There are no `color`, `sx` or `css` props; these three routes cover the same ground without a
styling runtime.

**Keep the focus ring.** A global reset such as `:focus { outline: none }` or `button { all: unset }`
is unlayered, so it beats senui's focus outline and leaves keyboard users with no visible focus.
Scope your resets so they don't reach senui components.

## Theming

Colours follow the operating system's light or dark setting. Set `data-theme="light"` or
`data-theme="dark"` on any element to fix the theme for that subtree. To opt out of dark mode
entirely:

```css
:root {
  color-scheme: light;
}
```

The [`@senakster/senui-tokens` README](../tokens/README.md) covers every token and override.

## Accessibility

Each component has an accessibility contract, kept next to its source in the repository
(`src/components/<Name>/<Name>.a11y.ts`), stating its element and role,
keyboard behaviour, focus handling, what it announces, how it adapts (target size, forced colours,
reduced motion, right-to-left text), the WCAG 2.2 criteria it meets or helps you meet, how it was
tested, and what your app is still responsible for. Read a component's contract before relying on it.

Types enforce what they can: an icon-only `Button` without `aria-label` or `aria-labelledby` doesn't
compile. In development, components also warn about what types can't catch, such as an empty
`aria-label` or a controlled value with no change handler. The warnings are removed from production
builds when your bundler replaces `process.env.NODE_ENV`, as it does for React itself.

## TypeScript

Prop types are exported with each component (`ButtonProps`). When wrapping a component whose props
are a union, use `DistributiveOmit` instead of `Omit`, which would drop type-level requirements
such as the icon-only label:

```tsx
import { Button, type ButtonProps, type DistributiveOmit } from '@senakster/senui';

type DangerButtonProps = DistributiveOmit<ButtonProps, 'variant'>;
const DangerButton = (props: DangerButtonProps) => <Button {...props} variant="danger" />;
```

## Versioning

Semver. Public API includes props and their types, exports, CSS class names (`.senui-button`),
component tokens, `data-*` attribute values, layer names and package subpaths. Removing or renaming
any of them is a major version, preceded by a minor that warns in development and says what to use
instead.
