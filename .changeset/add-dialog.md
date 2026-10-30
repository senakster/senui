---
'@senakster/senui': minor
---

Add `Dialog` and `AlertDialog`, both a native `<dialog>` opened with `showModal()`: the page behind is inert and focus stays inside, with no portal or focus trap.

`Dialog` is named by `title`, or by `aria-label` / `aria-labelledby`. It has a close button (`closeLabel` is required unless you pass `hideCloseButton`), an optional short `description`, `footer` (with an optional `cancelLabel` for a Cancel that closes it, as in AlertDialog), `size` (`sm`, `md`, `lg`, `fullscreen`), `dismiss` (`'closerequest'`, or `'any'` to close on a backdrop click) and `initialFocus` (`'dialog'`, `'first'` or a ref).

`AlertDialog` requires `description`, `cancelLabel` and an `action`. Focus starts on Cancel, Esc cancels, and a backdrop click never closes it.

Both are controlled through `open` / `onOpenChange(open, details)`. Every close request (Esc, backdrop, close button, Cancel, a `<form method="dialog">` submit) is reported with a `reason`, and the dialog closes only when `open` turns false. A form close carries the submit button's `returnValue`.

Focus returns to the element that opened the dialog. Pass `finalFocus` for when that element is removed while the dialog is open.

While one of these dialogs is open, the page doesn't scroll (ADR-0014). Set `html { scrollbar-gutter: stable }` to avoid a shift on open; to turn the lock off, add `html { overflow: auto }`.

Styles: `@senakster/senui/styles.css`, or `styles/Dialog.css` (which brings Button's styles, for its close and footer buttons) / `styles/AlertDialog.css` (which brings Dialog's).
