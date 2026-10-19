# 0011 — Form controls: validity reaches `aria-invalid`, and controls bind through a sealed binding

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** senakster (decided in L04 on 2026-10-18; escalated to an ADR by the L04 review on
  2026-10-19; solo call, no further review required)
- **Affects modules:** L04, L05
- **Amends:** [ADR-0001](0001-plain-css-on-custom-properties.md) (its list of state signals)

## Context

ADR-0001 lists `:user-invalid` among the native state signals components style. L04's plan asked
for the same (decision 5: `:user-invalid` for native constraints, `[aria-invalid="true"]` for prop
errors). CONVENTIONS rule 6, written in L02, says the opposite: style the error state from
`[aria-invalid="true"]` only, because `:user-invalid` turns a field red without telling a screen
reader.

A probe on 2026-10-18 confirmed rule 6's reason. In Chromium, once a required field has been
touched, `:user-invalid` matches while the accessibility tree still reports `invalid: false`.
Styling the pseudo-class would make the visible state and the announced state disagree, which is
the failure rule 6 exists to prevent.

Separately, L04's plan wanted FormField to wire its control through React context (decision 6). It
also wanted a type test in which a standalone `<TextInput />` without a name fails to compile while
the same element inside a FormField compiles. TypeScript checks a JSX element's props the same way
wherever it appears, so a parent can't relax a child's name requirement. Context can't satisfy that
criterion.

L05 builds Checkbox and Switch on the same mechanism. Without a record, a later component could
follow ADR-0001 as written and reintroduce the divergence.

## Decision

- **Invalid is styled from `[aria-invalid="true"]` only.** Component CSS never styles
  `:user-invalid` or `:invalid`. This replaces `:user-invalid` in ADR-0001's list of state signals;
  the rest of ADR-0001 stands.
- **Native validity reaches `aria-invalid` through the `invalid` event.** The form control's wiring
  hook (`useFormFieldControl`) sets `aria-invalid` when the browser fires `invalid`, but only when
  the control already matches `:user-invalid`. During a submit the browser sets that flag before it
  fires `invalid`; during a `checkValidity()` call on an untouched form it doesn't. Verified in
  Chromium, Firefox and WebKit.
- **Inside a FormField, the browser's message moves into the field.** The control cancels the
  browser's bubble, FormField shows `validationMessage` in a non-live error node, and the first
  field that shows an error takes focus. The error stays until the value is valid, whether the user
  or code changed it; a form reset clears it.
- **Form controls bind to FormField through a sealed render-prop binding.** FormField's `children`
  is a function that receives a `FormFieldBinding`, which only FormField can create:
  `{(field) => <TextInput field={field} />}`. In each control's props, the binding is the third
  branch of the name union. It satisfies the name requirement and forbids the props the field owns
  (`aria-label`, `aria-labelledby`, `id`, `required`, `aria-invalid`). Every form control reads the
  wiring through `useFormFieldControl(field, props)`.

## Consequences

- Nothing looks or reads invalid before a submit attempt, even after a user types into a field and
  clears it. That is later than `:user-invalid`'s own timing, and it is deliberate: the visible and
  the announced state change together.
- The binding costs consumers a function child instead of plain children. In return, a missing
  name is a compile error in both standalone and FormField use. What the type can't see (a binding
  ignored or passed to two controls) is caught by a development warning.
- One known gap, recorded in FormField's contract: a `checkValidity()` call after a submit attempt
  behaves like a submit (it shows errors and moves focus), because both fire the same event. The
  workaround is `validity.valid` or `form.matches(':invalid')`, which fire nothing.
- L05: Checkbox and Switch take `field?: FormFieldBinding` and call `useFormFieldControl`.
- **Revisit when:** browsers expose `:user-invalid` to the accessibility tree (so styling it would
  no longer diverge), a browser fires `invalid` before setting user validity during a submit, or
  React gains a way to type a component's props by its parent, which would let plain children
  replace the render prop.
