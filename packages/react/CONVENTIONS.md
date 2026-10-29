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
  Button.docs.ts      its usage guidance, exported as `docs` (rule 12)
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

**Every union in a props type is a named alias, intersected at the top level** (L09):

```ts
export type DialogProps = DialogNativeProps & { … } & DialogName & DialogCloseButton & DialogOpenState;
```

The docs generator reads each such alias as an _axis_ and its members as _branches_, so the
published props never show TypeScript's cross product of them. Write a one-line JSDoc above each
member (``/** Named by a visible `label`. */``): it is the branch's published summary. Every own
prop, and every prop typed `never`, has JSDoc too; for a `never` prop it says what to use instead.
An inline union (`… & ({ a: string } | { b: string })`) or an alias that nests one is rejected. One
nesting is allowed inside a branch: an intersection with a union of object types, published as
"also requires one of" (DialogCloseButton's way out).

**Enforced by:** `@ts-expect-error` cases in the component's `*.test-d.tsx` (a type test that stops
erroring fails `pnpm test`), including a `DistributiveOmit` wrapper case; `useNameCheck.test.tsx`;
the unit axe test. Reference: [`src/internal/conventions.test-d.tsx`](src/internal/conventions.test-d.tsx).
The axis rule and the JSDoc are checked by the docs generator
([`scripts/build-docs.mjs`](scripts/build-docs.mjs)), which fails `pnpm build`; prop JSDoc follows
rule 7's rules for published strings.

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
- The first render never sets state: the internal value starts from the controlled one. Under
  React 18.3, a render-phase update on mount, in a component that calls `useId`, can give its
  descendants different ids on the server and the client (found by L08's hydration test).

**Enforced by:** [`useControllableState.test.ts`](src/internal/state/useControllableState.test.ts),
and the hydration test under React 18.3 (rule 10).

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

  A consumer's unlayered reset that targets focus (`:focus { outline: none }`, `all: unset`) beats
  this, by design: the ring stays overridable (principle 3), so every focusable component lists
  `RESPONSIBILITIES.keepFocusRing` in its contract. L08's gate checks both halves: the ring survives
  common resets that don't target focus (a normalize-style and a preflight-style reset), and the two
  resets the responsibility names do remove it, so the warning stays true.

- Movement is multiplied by `--senui-motion-reduce` (ADR-0005).

**Enforced by:**

- Stylelint (ADR-0007, ADR-0009, ADR-0015): raw colours, units outside an allow-list, easings, font,
  line-height, letter-spacing, z-index and shadow values, primitive references, ids, and selectors
  more specific than `0,1,0`. The one raw length allowed is `rem` in a size media query (a
  breakpoint can't be a token); say why in a comment.
- [`scripts/check-component-css.mjs`](../../scripts/check-component-css.mjs): every stylesheet under
  `src/` (other than `layers.css` and the entry) is entirely inside `@layer senui.components`. The
  only thing allowed before that block is a plain `@import` of another component's stylesheet it
  builds on (AlertDialog imports Dialog's), never with `layer()`, which would nest the imported
  rules in a sub-layer that loses to every other component.
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
  component. A screen-reader run names the assistive technology, browser, OS, versions, the
  package version tested and the `language` of the reader's speech (BCP 47, ADR-0019). Product
  names in this data are compatibility facts and are written out (scope decision, L02).
- In `announces`, double quotes mark verbatim speech and nothing else; write a gloss unquoted
  (`"til" means on`). An announcement that quotes speech gives its `language`, one of the
  contract's screen-reader runs, so the published docs can mark the quote with it (ADR-0019).
- Every string is published as written (L09), so it cites only public ADRs (`ADR-0014`) and WCAG
  criteria, never module plans, reviews or people, and uses no Markdown but inline code. Record
  review history in the implementation log instead.
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

Every deprecation is also marked where the docs generator reads it, so `components.json`, the docs
pages, `docs/*.md` and `llms.txt` say "Deprecated. Use … instead." in words (never only a
strike-through or a colour), and the API diff knows a later major may remove it:

| Surface                    | Mark                                                                                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Prop                       | `@deprecated Use \`variant\` instead.` in its JSDoc                                                                                                                                        |
| Union branch               | `@deprecated …` in the branch's summary JSDoc                                                                                                                                              |
| Variant value              | `/** @deprecated Use \`ghost\` instead. */` before the literal in its union                                                                                                                |
| Component or type export   | `@deprecated …` on the export. A component alias needs no folder, but must call `deprecate()`                                                                                              |
| Token, data value or class | `deprecated <old>: use <new>` in the stylesheet's "Public surface" comment: `deprecated \`--senui-button-bg\`: use \`--senui-button-background\``, `[data-variant='subtle']`, `.senui-old` |

A deprecated token stays listed in `components.json` though it is no longer declared, so the
deprecation minor doesn't read as a removal.

Pair each with a minor changeset that says what replaces what.

**Enforced by:** [`deprecate.test.ts`](src/internal/dev/deprecate.test.ts); the docs generator, which
fails a `@deprecated` prop without its `deprecate('<Name>', '<prop>', …)` call, a deprecated token
the new one doesn't read as its fallback, and a deprecated data value or class that no longer
renders ([`deprecation.test.ts`](src/internal/docs/deprecation.test.ts)); and the API diff (see
[Public surface](#public-surface)), which fails a removal the baseline didn't mark deprecated.

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

An effect that must run before paint uses an isomorphic layout effect (`useEffect` on the server),
because React 18 warns about `useLayoutEffect` during server rendering.

**Enforced by:** [`ids.test.ts`](src/internal/dom/ids.test.ts), `component-api-reviewer`, and the
`ssr` Vitest project (L08 decision 9). It renders every story in Node with `renderToString` and fails
on a thrown error or a console warning;
[`hydrate.browser.test.tsx`](src/internal/ssr/hydrate.browser.test.tsx) then hydrates each story's
markup in the browser and fails on any mismatch. The `ssr` project writes the markup to
`.ssr-fixtures/`, stamped with the run's id, and runs in an earlier group, so run both together
(`vitest run`, or `--project ssr --project browser`): the hydration test refuses markup from another
run. `gate-full.yml` repeats the unit, `ssr` and browser projects under React 18.3, the lowest
version the peer range admits, and each project asserts the version it rendered with. That
workflow is disabled for budget reasons, so run it locally before a release: swap in React 18.3
as its `react-18` job does, and set `SENUI_EXPECT_REACT=18.3.1`. That covers runtime only: the type tests still use React 19's types.

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

## 12. Every component has usage guidance

`<Name>.docs.ts` says when to use the component and when not to, as data (L09 decision 3). It feeds
the docs page, `components.json` and `llms.txt`:

```ts
import type { ButtonProps } from './Button.js';
import type * as stories from './Button.stories.js';

export const docs = defineComponentDocs<ButtonProps, typeof stories>()({ component: 'Button', … });
```

- Import the props and the stories with `import type` only: the docs generator loads this file.
- `summary` is one sentence of at most 160 characters: what the component is for.
- `summary` and `description` make no accessibility claims ("accessible", "WCAG", "screen reader",
  "announces"). Claims live in the contract only, so they can't drift apart. Don't restate the
  contract's responsibilities either; the docs show them next to the guidance.
- Each `dontUseWhen` names what to use instead: another component, a native element with a note
  (navigation is an `<a href>`, not a Button), an ARIA pattern, or nothing, with the reason.
- `examples` are story names, and never a story that needs its play function: docs pages don't run
  one.
- `composition` records what changes inside another component (a Checkbox in a CheckboxGroup
  ignores `checked` and needs `value`).
- The text follows rule 7's rules for published strings.
- So does every story's JSDoc, the stories meta's JSDoc and any `docs.description` string: the
  docs page shows them under each story. The docs build fails on a private reference or Markdown
  beyond inline code in any of them.

**Enforced by:** the type and
[`component-docs.test-d.ts`](src/internal/docs/component-docs.test-d.ts) (stories, components and
props that exist; a component can't name itself);
[`component-docs.test.ts`](src/internal/docs/component-docs.test.ts) (summary, claims, published
text, examples); and `scripts/check-a11y-contracts.mjs` in `pnpm check`, which fails a component
without one.

## The a11y gate (L08)

Every story is also checked by the gate in `apps/docs/gate/`: Playwright over the **built**
Storybook, styled by the package's **built** stylesheet (a `<meta name="senui-css">` marker proves
it). Run it with `pnpm test:gate`; CI runs it on every pull request. It reads the story list from
Storybook's `index.json`, so a new story is checked without touching the gate.

What it checks, on every story, from the component's contract:

- axe in light and dark with rendered contrast (an incomplete contrast result fails too);
- `semantics`: the element, the role, and a required name in the accessibility tree;
- `targetSize`: every target (its box merged with its labels) at 1280 and 320 px;
- reflow at 320 px (the component never scrolls sideways or pushes the page past the viewport) and
  WCAG's text-spacing overrides (no clipped, spilling or overlapping text);
- `reducedMotion`: every animation from first paint, through the play function and a run of focus
  moves; only `essentialMotion` (ADR-0017) may move under reduced motion, and a `no-motion`
  component never moves (colour and opacity aren't motion);
- `rtl: 'mirrors'`: boxes and pseudo-element offsets mirror when `<html dir>` flips (and Stylelint
  rejects physical properties and `:dir()`, ADR-0018);
- a tab walk at two viewports: keyboard focus, never inside `aria-hidden` or `inert`, named, not
  covered (2.4.11), with a real ring (not transparent, not clipped, not painted over, 3:1) and
  controls whose boundary is 3:1 (1.4.11);
- the ring against a consumer's resets (see section 6, "The CSS contract");
- forced colours (Chromium): the ring and boundary checks again with forced colours on, and a
  screenshot, in light and dark, of every story tagged `forced-colors`. A component whose
  `forcedColors` is `border` or `system-colour` needs at least one such story.

Every docs page (each component's autodocs page and each MDX page) is checked as a page (L09
decision 9): axe with the page-level rules on, at 1280 and 320 px in light and dark; one `<main>`
and one `<h1>`, with headings that never skip a level, live stories included; no sideways scroll
at 320 px except inside a focusable, named region; a tab walk to the end of the page; nothing
focused, modal or inert after render; and a surface that follows the colour scheme. The page's
story canvases are left to the stories' own checks. A docs page renders a story's heading one
level below the story's name (`headingLevel` and `titleLevel` are overridden there), never runs a
play function, and shows a story that opens a modal dialog (`docs.story.inline: false`) in a frame
the reader asks for. The bookkeeping also checks that every story id in `components.json` is in
the built `index.json`, and that the build contains no Storybook manifest.

Screenshot baselines are Linux pixels: they are generated and compared only in the pinned
Playwright container CI uses, and the screenshot tests skip anywhere else. After a deliberate
visual change, run the "Update gate screenshots" workflow (or label the pull request
`update-snapshots`), review the images it uploads, and commit them to
`apps/docs/gate/__screenshots__/`. When Playwright is upgraded, the container image in the three
workflows changes with it, and the baselines are regenerated.

For story authors:

- A story is checked in its **end state**: after its play function, and after every finite
  animation finishes. A story meant for a manual keyboard or screen-reader run has no play
  function, or the run starts from the end state (L07).
- A story may render the component only after an interaction (a scenario story); each component's
  first story must render it.
- A story skips one check only with a `gate-skip-<check>` tag **and** a dated entry in
  `apps/docs/gate/exceptions.json`, naming the reason and an expiry. An axe exception names the
  rule ids it hides; `color-contrast:incomplete` hides only results axe couldn't compute. A tag
  without an entry, an entry without a tag, and an expired entry all fail.
- A failure names the story id, the check and the element. Open the story at
  `iframe.html?id=<id>` in the built Storybook (`pnpm --filter docs exec vite preview --outDir
storybook-static`) to see it as the gate did.

For test authors, keyboard traceability (decision 5, checked by `pnpm check:components`):

- Every key in a component's contract is pressed in its `<Name>.browser.test.tsx`, in a test whose
  title names the key before a colon: `test('Escape: closes the innermost dialog', …)`. Several
  keys are comma-separated, and the test presses each of them: `'Tab, Shift+Tab: …'`.
- A title that names a key the test doesn't press fails too. A key pressed only to reach a state
  (Enter on a trigger) is no evidence for its row; put it in a test that isn't key-titled.
- Presses are read from literal arguments: `userEvent.keyboard('{Escape}')`, `' '` for Space,
  `userEvent.tab()`, `userEvent.tab({ shift: true })` or `'{Shift>}{Tab}{/Shift}'`, and
  `userEvent.type(el, 'text')` for `printable character`. A key in a variable or a `test.each`
  title isn't seen, and skipped tests don't count.

## Public surface

Everything below is public API under semver. Removing or renaming any of it is a major version,
preceded by a deprecation release (rule 8). Narrowing a prop's type (removing a union member, making
an optional prop required) is also a major.

| Surface                 | Example                                          | Where it is defined       |
| ----------------------- | ------------------------------------------------ | ------------------------- |
| Component exports       | `Button`                                         | `src/index.ts`            |
| Prop types              | `ButtonProps`, its union members                 | the component's `.tsx`    |
| Public utility types    | `DistributiveOmit`                               | `src/types.ts`            |
| Class names             | `.senui-button`                                  | the component's `.css`    |
| Component tokens        | `--senui-button-bg`                              | the component's `.css`    |
| Data-attribute values   | `[data-variant="danger"]`, `[data-size="sm"]`    | the component's `.tsx`    |
| Cascade layer names     | `senui.tokens`, `senui.base`, `senui.components` | `src/styles/layers.css`   |
| Package export subpaths | `.`, `./styles.css`, `./styles/<Name>.css`       | `package.json`            |
| Semantic tokens         | `--senui-color-fg-danger`                        | `@senakster/senui-tokens` |
| Manifest and docs files | `./components.json`, `./llms.txt`, `./docs/*.md` | `scripts/build-docs.mjs`  |

Adding to any of these is a minor.

**The manifest** (`components.json`, typed by the exported `Manifest`; L09 decision 7). Semver
covers the set of components and branches, prop names and whether each is required, variant
values, data-attribute values, classes and component tokens: the same facts as the rows above,
and a manifest that stops listing one is a major. Informative, and free to change in any release:
printed types, descriptions, dates, story ids and URLs. Its enumerations are open (a reader treats
an unknown value as "not described"), so adding a value is a minor. `schemaVersion` changes only
with a breaking change to the manifest's shape, in a major, after a release that emits the old and
new field side by side. The files `llms.txt`, `llms-full.txt`, `docs/*.md` and `USAGE.md` are
published at stable paths; their prose is informative.

**Not public:** part classes with a double underscore (`.senui-button__label`, `__icon`,
`__spinner`) are internal and can change in any release. Each component's CSS opens with a comment
listing its public classes, data-attribute values and component tokens.

**Enforced by:** [`scripts/check-api-diff.mjs`](../../scripts/check-api-diff.mjs) (`pnpm check:api`,
in `pnpm check`), against each package's `latest` on npm, or the committed baseline in
`scripts/api-diff/baseline/` until it is published. It compares every fact above (descriptions,
summaries and printed types aren't facts, so rewording is no change), plus the `package.json`
facts (each subpath's target, `sideEffects`, peer ranges) and the layer order. It type-checks every
exported type both builds share: a value of the baseline's type must fit this build's (narrowing is
a major), and a type other than props that now holds new values (a new `DialogCloseReason`) is a
minor. Generic types are covered by their export fact only. It fails when:

- the pending changesets bump less than the largest difference (a removal or narrowing needs a
  major, an addition a minor);
- a removed fact wasn't marked deprecated in the baseline, unless
  [`api-exceptions.json`](../../scripts/api-diff/api-exceptions.json) has a dated entry for it;
- the tokens package takes a major and this one doesn't: its peer range on the tokens changes
  ([ADR-0021](../../docs/decisions/0021-tokens-peer-dependency.md)).

Its probes are [`diff.test.mjs`](../../scripts/api-diff/diff.test.mjs), in `pnpm test`.

## Loading the CSS

Consumers load the tokens, then the components, either all at once or per component:

```css
@import '@senakster/senui-tokens/tokens.css';
@import '@senakster/senui/styles.css'; /* every component */
/* or */
@import '@senakster/senui/styles/Button.css'; /* one component */
```

`tokens.css` and `styles.css` both declare the layer order, so those two load in either order. A
per-component file only joins `senui.components`, so load it after `tokens.css`; loaded first, it
would create that layer ahead of the others and lose to them. A consumer who uses `@layer` themselves
puts `senui` first in their own order.

A component that builds on another imports that one's stylesheet itself, so its per-component file
works alone: `styles/AlertDialog.css` brings `Dialog.css` with it.
