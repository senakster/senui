# @senakster/senui

## 1.0.0

### Major Changes

- 7952797: The first stable release. From 1.0.0 on, a component, prop, value, class, token or export is renamed or removed only in a major version, after a minor that deprecates it: a deprecated prop warns once in development and says what to use instead, and the docs mark it. New tokens, components and props come in minor versions.

  `@senakster/senui-tokens` is a peer dependency of `@senakster/senui`, so an app has exactly one copy of the tokens: install both packages, and load `@senakster/senui-tokens/tokens.css` before any component styles. A major version of the tokens is always a major version of the components too.

  `tokens.css` declares the cascade layers `senui.tokens`, `senui.base` and `senui.components`, so your own unlayered styles override every token and component without raising specificity. Colours follow the page's colour scheme through `light-dark()`, and motion follows `prefers-reduced-motion`. Override a token on `:root, [data-theme]`; a subtree with `data-theme="light"` or `data-theme="dark"` gets its own background and text colour.

  Load every component's styles with `@senakster/senui/styles.css`, or only the ones you use with `@senakster/senui/styles/<Name>.css`. A component's stylesheet loads the styles of the components it renders, so `styles/Dialog.css` brings Button's. Every module is its own file in the package, so a bundler keeps only the components you import.

  Each component's accessibility is documented as a contract in `components.json` and on its docs page, including what your app must still do. Some manual screen-reader and keyboard runs predate later changes to their component; the docs mark those runs as not re-tested.

### Minor Changes

- 70727dd: Add `Button`: a native `<button>` (`type="button"` by default) with `primary`, `secondary`, `ghost` and `danger` variants in three sizes. `loading` keeps focus and width and ignores activation; icon-only buttons take an `icon` and require `aria-label` or `aria-labelledby`. Styles: `@senakster/senui/styles.css` or `@senakster/senui/styles/Button.css`.
- eff0983: Add `Checkbox`, `CheckboxGroup` and `Switch`, all native `<input type="checkbox">` underneath.

  `Checkbox` takes its own `label` (or `aria-label` / `aria-labelledby`), `description` and `error`, `checked` / `defaultChecked` / `onCheckedChange`, and a separate `indeterminate` prop that sets the native mixed state.

  `CheckboxGroup` is a `<fieldset>` with a required `legend`, one `value` array (`value` / `defaultValue` / `onValueChange`), one error, and `required="<message>"`, which blocks submit until an option is checked.

  `Switch` is an on/off setting with `role="switch"`; it takes no `indeterminate`, `required` or `error`.

  Styles: `@senakster/senui/styles.css`, or the per-component `Checkbox.css`, `CheckboxGroup.css` and `Switch.css`.

- a51b509: Add `Dialog` and `AlertDialog`, both a native `<dialog>` opened with `showModal()`: the page behind is inert and focus stays inside, with no portal or focus trap.

  `Dialog` is named by `title`, or by `aria-label` / `aria-labelledby`. It has a close button (`closeLabel` is required unless you pass `hideCloseButton`), an optional short `description`, `footer` (with an optional `cancelLabel` for a Cancel that closes it, as in AlertDialog), `size` (`sm`, `md`, `lg`, `fullscreen`), `dismiss` (`'closerequest'`, or `'any'` to close on a backdrop click) and `initialFocus` (`'dialog'`, `'first'` or a ref).

  `AlertDialog` requires `description`, `cancelLabel` and an `action`. Focus starts on Cancel, Esc cancels, and a backdrop click never closes it.

  Both are controlled through `open` / `onOpenChange(open, details)`. Every close request (Esc, backdrop, close button, Cancel, a `<form method="dialog">` submit) is reported with a `reason`, and the dialog closes only when `open` turns false. A form close carries the submit button's `returnValue`.

  Focus returns to the element that opened the dialog. Pass `finalFocus` for when that element is removed while the dialog is open.

  While one of these dialogs is open, the page doesn't scroll (ADR-0014). Set `html { scrollbar-gutter: stable }` to avoid a shift on open; to turn the lock off, add `html { overflow: auto }`.

  Styles: `@senakster/senui/styles.css`, or `styles/Dialog.css` (which brings Button's styles, for its close and footer buttons) / `styles/AlertDialog.css` (which brings Dialog's).

- 5f8ae1d: Add `EmptyState`: says there is nothing here, why, and what you can do next. It renders a heading, a description, a decorative illustration and your actions in a plain `<div>`, with no role, no landmark and no live region.

  `title` and `headingLevel` (2 to 6) are required. There is no default level: pick the one that fits your page outline. `description`, `illustration` (decorative: hidden from assistive technology and inert) and `actions` (one element or a fragment of your own Buttons or links, never text) are optional. The root takes no `role`, `tabIndex`, `aria-label`, `aria-labelledby` or `aria-describedby`: the heading is what a screen-reader user finds, and `headingRef` is how you move focus to it.

  It adapts to the width of its container: compact (the illustration beside the text) below 30rem, stacked and centred above. It fills its parent's inline size, so give a shrink-to-fit parent (an auto-layout table cell, a `fit-content` box) a width, and put inline margin on a wrapper rather than on EmptyState.

  It never moves focus or announces anything. Announce the change from a `role="status"` region that is already in the page. When the control that emptied the view disappears, move focus to the first action or to the heading, which `headingRef` gives you (it has `tabindex="-1"`).

  Styles: `@senakster/senui/styles.css`, or `styles/EmptyState.css`. Fourteen `--senui-empty-state-*` tokens are the override points.

- 18f5133: Add `FormField` and `TextInput`. `FormField` renders a label, an optional description and an error message, and wires them to the control it renders through a function child: `<FormField label="Email" error={error}>{(field) => <TextInput field={field} type="email" />}</FormField>`. The control gets the label's name, `aria-describedby` (description, then error while there is one), `aria-invalid` and `required`. Native constraint errors show in the field after a submit attempt, and the first invalid field takes focus; `announce="polite"` makes the error a live region for on-change validation.

  Form controls always render `aria-invalid`: `"true"` while an error shows, `"false"` otherwise, never absent. Without it, browsers announce a control's native invalidity, such as a bad default value, before the user has done anything. Style an invalid control from `[aria-invalid="true"]`.

  `TextInput` is a native single-line `<input>` (`text`, `email`, `password`, `search`, `tel`, `url`) in three sizes. Outside a FormField it requires `aria-label` or `aria-labelledby`.

  Add `focusFirstInvalid(form)`, which focuses the first invalid control after your own validation sets errors.

  Styles: `@senakster/senui/styles.css`, or `@senakster/senui/styles/FormField.css` and `@senakster/senui/styles/TextInput.css`.

### Patch Changes

- Updated dependencies [9459bf1]
- Updated dependencies [9459bf1]
- Updated dependencies [9459bf1]
- Updated dependencies [7952797]
  - @senakster/senui-tokens@1.0.0
