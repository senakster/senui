---
'@senakster/react': minor
---

Add `Checkbox`, `CheckboxGroup` and `Switch`, all native `<input type="checkbox">` underneath.

- `Checkbox` takes its own `label` (or `aria-label` / `aria-labelledby`), `description` and `error`, `checked` / `defaultChecked` / `onCheckedChange`, and a separate `indeterminate` prop that sets the native mixed state.
- `CheckboxGroup` is a `<fieldset>` with a required `legend`, one `value` array (`value` / `defaultValue` / `onValueChange`), one error, and `required="<message>"`, which blocks submit until an option is checked.
- `Switch` is an on/off setting with `role="switch"`; it takes no `indeterminate`, `required` or `error`.

Styles: `@senakster/react/styles.css`, or the per-component `Checkbox.css`, `CheckboxGroup.css` and `Switch.css`.

FormField now shares its wiring with these controls internally; its API is unchanged.

Form controls now always render `aria-invalid`: `"true"` while an error shows, `"false"` otherwise (previously absent when valid). Without it, browsers announce a control's native invalidity, such as a bad default value, before the user has done anything. TextInput is affected too; selectors on `[aria-invalid="true"]` are unchanged.
