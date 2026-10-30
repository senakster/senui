---
'@senakster/senui': minor
---

Add `FormField` and `TextInput`. `FormField` renders a label, an optional description and an error message, and wires them to the control it renders through a function child: `<FormField label="Email" error={error}>{(field) => <TextInput field={field} type="email" />}</FormField>`. The control gets the label's name, `aria-describedby` (description, then error while there is one), `aria-invalid` and `required`. Native constraint errors show in the field after a submit attempt, and the first invalid field takes focus; `announce="polite"` makes the error a live region for on-change validation.

Form controls always render `aria-invalid`: `"true"` while an error shows, `"false"` otherwise, never absent. Without it, browsers announce a control's native invalidity, such as a bad default value, before the user has done anything. Style an invalid control from `[aria-invalid="true"]`.

`TextInput` is a native single-line `<input>` (`text`, `email`, `password`, `search`, `tel`, `url`) in three sizes. Outside a FormField it requires `aria-label` or `aria-labelledby`.

Add `focusFirstInvalid(form)`, which focuses the first invalid control after your own validation sets errors.

Styles: `@senakster/senui/styles.css`, or `@senakster/senui/styles/FormField.css` and `@senakster/senui/styles/TextInput.css`.
