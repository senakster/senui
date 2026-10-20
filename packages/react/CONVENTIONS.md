# senui component conventions

The rules every component's public surface follows. A component module (L03 on) decides only what
is specific to that component; everything here is already decided. Each rule names the check that
enforces it. If a rule has no automated check, it says which reviewer holds it, and that is a gap
to close, not a licence.

Written for whoever writes a component, human or agent. The library principles are in the root
[`CLAUDE.md`](../../CLAUDE.md); the decisions behind these rules are in
[`docs/decisions/`](../../docs/decisions/).

## File layout

```
src/components/Button/
  Button.tsx          the component, exported as `Button`
  Button.css          its styles, inside @layer senui.components
  Button.a11y.ts      its accessibility contract, exported as `a11y`
  Button.test.tsx          behaviour and axe tests, in jsdom
  Button.browser.test.tsx  what needs a real browser: layout, computed styles, real focus
  Button.test-d.tsx        type tests
  Button.stories.tsx       one story per designed state (principle 5)
```

A story with controls renders from its `args` (spread them into the component), or its controls
silently do nothing. A fixed grid or a whole form sets `parameters: { controls: { disable: true } }`
instead. Each component's `*.test.tsx` checks this for every story with controls, through
[`withControls()`](src/internal/testing/stories.ts).

Axe runs through [`expectNoAxeViolations()`](src/internal/testing/axe.ts). To check every story,
load them with `composeStories` from `@storybook/react-vite` and run it on each rendered story.
`*.browser.test.tsx` runs in Chromium (Vitest browser mode), so a bounding box or `:focus-visible`
is real there; in jsdom every box measures 0.

Export it from `src/index.ts` as `export { Button } from './components/Button/Button.js'`, and
import its CSS from `src/styles/index.css` as `@import '../components/Button/Button.css';`. The
entry exports nothing else except the public types in `src/types.ts`.

**Enforced by:** [`scripts/check-a11y-contracts.mjs`](../../scripts/check-a11y-contracts.mjs) (entry
exports) and [`scripts/check-component-css.mjs`](../../scripts/check-component-css.mjs) (CSS entry).

## 1. Variants are closed unions

`variant?: 'primary' | 'secondary' | 'danger'`, never `string`, and no free `color` prop. A misuse
fails at compile time.

```tsx
<Button variant="ghostly">Save</Button> // compile error
```

**Enforced by:** the component's `*.test-d.tsx`, with an `@ts-expect-error` on an invalid variant.
Reference: [`src/internal/conventions.test-d.tsx`](src/internal/conventions.test-d.tsx).

## 2. Escape hatches: `className` and native attributes, nothing else

Props are built on [`NativeProps<'button'>`](src/internal/dom/native-props.ts): the element's native
attributes without `color` (it reads as a re-skinning prop), `children` (each component declares its
own) and `role` (the element and role are fixed by the contract, ADR-0006). `style` passes through but
is not documented. There is no `sx`, `css` or similar prop. To change how a component looks,
consumers override its component tokens (rule 6).

**The component owns its root.** It renders `{...rest}` first and then the attributes it controls, so
a consumer can't override them by accident:

```tsx
<button
  {...rest}
  ref={ref}
  className={className ? `senui-button ${className}` : 'senui-button'}
  data-variant={variant}
  data-size={size}
  data-state={loading ? 'loading' : undefined}
/>
```

- `className` is merged, never replaced: `senui-button` is always present.
- `data-variant`, `data-size` and state attributes always render, with the resolved default
  (`data-variant="primary"` when no variant is passed). Consumers write selectors against them, so
  they are public API.
- A consumer's `data-variant="ghostly"` is overwritten, never honoured.

**Enforced by:** `NativeProps` and the reference type test (no `color` or `role`); one root-ownership
test per component in its `*.test.tsx`; `component-api-reviewer`.

## 3. Accessibility requirements live in the type

Where a component can't be accessible without a prop, the type requires it. Where two props are
alternatives, they are a discriminated union. An icon-only control has no visible text, so it takes
its icon as the `icon` prop, has no children, and requires exactly one of `aria-label` or
`aria-labelledby`. Without `icon`, the visible label (children) is required, typed
`Exclude<ReactNode, null | undefined | boolean>` so a label that may be missing doesn't compile:

```tsx
<Button icon={<CloseIcon />} aria-label="Close" />           // ok
<Button icon={<CloseIcon />} />                              // compile error: no name
<Button icon={<CloseIcon />} aria-label="Close">Close</Button> // compile error: children
<Button>Save</Button>                                         // ok
<Button>{maybeLabel}</Button>                                 // compile error: may be undefined
```

The type can't see that children are text (`<Button><CloseIcon /></Button>` compiles), or that a
string is non-empty (`<Button>{''}</Button>` compiles). Every component that needs
a name composes [`useNameCheck`](src/internal/a11y/useNameCheck.ts) into its ref, which warns in
development about an empty `aria-label` and about an element with no name at all:

```tsx
const ref = useComposedRefs(forwardedRef, useNameCheck('Button'));
```

A form control is named by its FormField through a sealed binding, the third branch of its name
union (L04): `{(field) => <TextInput field={field} />}`. Only FormField can make a binding, and the
branch forbids `aria-label`, `aria-labelledby`, `id`, `required` and `aria-invalid`, which the field
owns. The control reads the wiring with `useFormFieldControl(field, props)`.

A consumer wrapping a component with union props uses `DistributiveOmit` (exported from the package),
not `Omit`, which collapses the union and drops the requirement.

**Enforced by:** `@ts-expect-error` cases in the component's `*.test-d.tsx` (a type test that stops
erroring fails `pnpm test`), including a `DistributiveOmit` wrapper case; `useNameCheck.test.tsx`;
the unit axe test. Reference: [`src/internal/conventions.test-d.tsx`](src/internal/conventions.test-d.tsx).

## 4. Refs use `forwardRef`, and every component has a `displayName`

React 18.3 is in the peer range, and on 18 a `ref` passed as an ordinary prop is silently dropped.
Every component forwards its ref to the element it renders, with `forwardRef`, and sets
`displayName` to its public name. Revisit when the peer range drops React 18.

**Enforced by:** a ref test in each component's `*.test.tsx`;
[`a11y-contracts.test.ts`](src/internal/a11y/a11y-contracts.test.ts) checks every component's
`displayName`.

## 5. Controlled and uncontrolled, through one hook

Stateful components accept both a controlled triplet (`value` / `defaultValue` / `onValueChange`,
or `checked` / `defaultChecked` / `onCheckedChange`) and use
[`useControllableState`](src/internal/state/useControllableState.ts) for it.

One exception: a **text-entry** control (TextInput) passes its native `value` / `defaultValue` /
`onChange` through and adds no `onValueChange`, because the element already holds the text and form
libraries expect the native event (L04, Emil 2026-10-19). Adding one later is a minor; removing it
would be a major.

Binary controls (Checkbox, Switch) follow the rule: `checked` / `defaultChecked` /
`onCheckedChange` through `useControllableState`, because a mixed state and select-all logic need a
value-first callback (L05 decisions 6 and 7). They still pass the native `onChange` through, so
form libraries that read the event keep working.

```tsx
const [checked, setChecked] = useControllableState({
  value: props.checked,
  defaultValue: props.defaultChecked ?? false,
  onChange: props.onCheckedChange,
  name: { component: 'Switch', prop: 'checked' },
});
```

- `undefined` means uncontrolled; "controlled and empty" is `null`.
- The setter is stable and takes an updater: `setValue((n) => n + 1)`.
- Development warnings, once each: switching between controlled and uncontrolled, and a controlled
  value with no change handler (a frozen control). Pass `readOnly: true` for a component that is
  intentionally read-only.
- Switching from controlled to uncontrolled continues from the last controlled value.

**Enforced by:** [`useControllableState.test.ts`](src/internal/state/useControllableState.test.ts).

## 6. The CSS contract

- The root element has the class `senui-<component>` (`senui-button`), and that class is public API.
- All component CSS sits inside `@layer senui.components { … }`, with base selectors wrapped in
  `:where()`, so a consumer's single class overrides it. At most one class, attribute or
  pseudo-class sits outside `:where()`: `:where(.senui-button)[data-variant='danger']`.
- Variants and sizes are data attributes: `[data-variant="danger"]`, `[data-size="sm"]`.
- States use the same signal assistive technology gets, so the visual state and the announced state
  can't diverge:
  - error: `[aria-invalid="true"]` only, never `:user-invalid` or `:invalid` (they turn a field red
    without telling a screen reader);
  - disabled: `:disabled, [aria-disabled="true"]` (a loading Button is `aria-disabled`, not
    `disabled`);
  - pressed, expanded, selected: their `aria-*` attribute.
  - Use `data-state` only when no native or ARIA signal exists.
- A state shown only by a background change also changes a border or outline, or has a
  `@media (forced-colors: active)` rule using system colours. Forced-colours mode replaces
  backgrounds, and the state would vanish.
- Every value comes from a token (principle 4). Each component exposes its override points as
  component tokens that default to semantic ones:

  ```css
  @layer senui.components {
    :where(.senui-button) {
      --senui-button-bg: var(--senui-color-bg-accent);
      background: var(--senui-button-bg);
      padding-inline: var(--senui-space-4);
    }
  }
  ```

- Every state a component styles (hover, active, pressed, checked) reads a component token, never
  a semantic token directly, so a consumer's override holds in that state too
  (`--senui-checkbox-checked-bg-hover`, defaulting to `--senui-color-bg-accent-hover`).
- Internal calculation variables use a `--_senui-<component>-*` name. They aren't tokens or public
  surface, and setting one from outside does nothing. A token the component exposes for size is
  clamped so it can't take a control below the 24 px target (`max(var(--senui-size-target-min), …)`).
- Focus is drawn as an outline with an offset, never a `box-shadow` (ADR-0005):

  ```css
  outline: var(--senui-focus-ring-width) solid var(--senui-color-focus-ring);
  outline-offset: var(--senui-focus-ring-offset);
  ```

  A consumer's unlayered reset (`:focus { outline: none }`) beats this. The ring stays overridable
  (principle 3), so every focusable component lists `RESPONSIBILITIES.keepFocusRing` in its contract,
  and L08's Playwright gate loads a typical reset and checks the ring survives it.

- Movement is multiplied by `--senui-motion-reduce` (ADR-0005).

**Enforced by:**

- Stylelint (ADR-0007, ADR-0009): raw colours, units outside an allow-list, easings, font, line-height,
  letter-spacing, z-index and shadow values, primitive references, ids, and selectors more specific
  than `0,1,0`.
- [`scripts/check-component-css.mjs`](../../scripts/check-component-css.mjs): every stylesheet under
  `src/` (other than `layers.css` and the entry) is entirely inside `@layer senui.components`.
- ESLint: primitive references in TS/TSX strings.
- State selectors, forced colours and the motion factor are held by `component-api-reviewer` and
  `wcag-auditor`.

## 7. Every component has an accessibility contract

`<Name>.a11y.ts` exports the component's contract, bound to its props:

```ts
export const a11y = defineA11yContract<ButtonProps>()({ component: 'Button', … });
```

The type is [`A11yContract`](src/internal/a11y/a11y-contract.ts): semantics (element, role, name source,
states, relationships, hidden parts), keyboard, focus, announcements, required props, consumer
responsibilities, adaptation (ADR-0008), WCAG claims, test runs and known issues. It feeds the
Storybook a11y block and, from L09, `components.json` and `llms.txt`, so every claim is published as
fact.

- The element is a real tag, the role a real ARIA role, required props real props of the component,
  keys a closed list (Playwright's names, so L08 can press each one).
- `keyboard` may be empty only when `focus.tabStop` is `'none'`. `announcements`, `wcag` and
  `testedWith` are never empty.
- A WCAG claim names a 2.2 criterion (its level comes from the table), says whether the component
  `meets` it alone or `enables` the app to meet it, and lists the test methods behind it.
- `testedWith` needs an automated run and a screen-reader run, plus a keyboard run for a focusable
  component. A screen-reader run names the assistive technology, browser, OS, versions and the
  package version tested. Product names in this data are compatibility facts and are written out
  (scope decision, L02).
- A focusable component addresses 2.1.1, 2.4.7, 2.4.11, 2.5.8, 1.4.11 and 4.1.2, and lists
  `RESPONSIBILITIES.keepFocusRing`; one named by its content also lists
  `RESPONSIBILITIES.labelInName` (WCAG 2.5.3).

**Enforced by:** the type and [`a11y-contract.test-d.ts`](src/internal/a11y/a11y-contract.test-d.ts);
[`a11y-contracts.test.ts`](src/internal/a11y/a11y-contracts.test.ts), which loads every contract and
checks the name, dates, evidence, baseline and responsibilities; and
[`scripts/check-a11y-contracts.mjs`](../../scripts/check-a11y-contracts.mjs) in `pnpm check`, which
fails a component without a contract and warns when a component's source changed after its last
manual run.

## 8. Deprecation before removal

Nothing public is removed or renamed in a minor (see [Public surface](#public-surface)). In the minor
before its removal:

- **A prop:** call [`deprecate()`](src/internal/dev/deprecate.ts) when the old prop is passed. It warns
  once, in development only.

  ```ts
  if (props.kind !== undefined) deprecate('Button', 'kind', 'Use `variant` instead.');
  ```

- **A component export:** keep the old name as a wrapper that calls `deprecate()` and renders the
  new component.
- **A component token:** the new token reads the old one as a fallback, so overrides of either work:
  `--senui-button-background: var(--senui-button-bg, var(--senui-color-bg-accent));`
- **A `data-*` value or class name:** render both, old and new, for one minor.

Pair each with a changeset that says the same thing.

**Enforced by:** [`deprecate.test.ts`](src/internal/dev/deprecate.test.ts), and changesets reviewed per
release (L10).

## 9. One element per component

No component accepts `as`, `asChild` or anything else that changes the rendered element
(ADR-0006). "A link styled as a button" is its own component, with its own element and contract.

**Enforced by:** `component-api-reviewer`; `role` is not a prop (rule 2); a contract names exactly one
element.

## 10. Server rendering and ids

Nothing touches `window` or `document` during render; that belongs in effects and event handlers.
Ids come from `useId`, never from counters or `Math.random()`.

- A consumer's `id` wins over the generated one.
- A consumer's `aria-describedby` / `aria-labelledby` is merged with the ids the component generates,
  never replaced and never replacing them: [`mergeIds()`](src/internal/dom/ids.ts).

**Enforced by:** [`ids.test.ts`](src/internal/dom/ids.test.ts) and `component-api-reviewer` for now. A
server-render test per component is part of L08's gate.

## 11. Prop names and defaults

- Change callbacks for state a component owns are `on<Prop>Change(value)`: the new value first, no
  event. A text-entry control keeps its native `onChange(event)` instead (rule 5's exception).
- Booleans have no `is` prefix (`disabled`, `loading`) and default to `false`.
- Sizes are `size?: 'sm' | 'md' | 'lg'`, defaulting to `'md'`. Each size meets the 24×24 target
  minimum (WCAG 2.5.8).
- Disabled: native `disabled` removes the control from the tab order. A control that must stay
  focusable while unavailable (a loading Button) uses `aria-disabled="true"` instead, and its handlers
  return early and call `preventDefault()`, so an `aria-disabled` submit button can't submit its form.

**Enforced by:** `component-api-reviewer`, and each component's behaviour tests for the disabled guard.

## Public surface

Everything below is public API under semver. Removing or renaming any of it is a major version,
preceded by a deprecation release (rule 8). Narrowing a prop's type (removing a union member, making
an optional prop required) is also a major.

| Surface                 | Example                                          | Where it is defined     |
| ----------------------- | ------------------------------------------------ | ----------------------- |
| Component exports       | `Button`                                         | `src/index.ts`          |
| Prop types              | `ButtonProps`, its union members                 | the component's `.tsx`  |
| Public utility types    | `DistributiveOmit`                               | `src/types.ts`          |
| Class names             | `.senui-button`                                  | the component's `.css`  |
| Component tokens        | `--senui-button-bg`                              | the component's `.css`  |
| Data-attribute values   | `[data-variant="danger"]`, `[data-size="sm"]`    | the component's `.tsx`  |
| Cascade layer names     | `senui.tokens`, `senui.base`, `senui.components` | `src/styles/layers.css` |
| Package export subpaths | `.`, `./styles.css`, `./styles/<Name>.css`       | `package.json`          |
| Semantic tokens         | `--senui-color-fg-danger`                        | `@senakster/tokens`     |

Adding to any of these is a minor.

**Not public:** part classes with a double underscore (`.senui-button__label`, `__icon`,
`__spinner`) are internal and can change in any release. Each component's CSS opens with a comment
listing its public classes, data-attribute values and component tokens.

## Loading the CSS

Consumers load the tokens, then the components, either all at once or per component:

```css
@import '@senakster/tokens/tokens.css';
@import '@senakster/react/styles.css'; /* every component */
/* or */
@import '@senakster/react/styles/Button.css'; /* one component */
```

`tokens.css` and `styles.css` both declare the layer order, so those two load in either order. A
per-component file only joins `senui.components`, so load it after `tokens.css`; loaded first, it
would create that layer ahead of the others and lose to them. A consumer who uses `@layer` themselves
puts `senui` first in their own order.
