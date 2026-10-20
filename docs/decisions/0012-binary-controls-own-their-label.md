# 0012 — Binary controls own their label; text-entry controls bind to FormField

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** senakster (solo call, no review required)
- **Affects modules:** L04, L05
- **Amends:** [ADR-0011](0011-form-control-validity-and-binding.md) (its L05 consequence)

## Context

ADR-0011 locked FormField's sealed render-prop binding and noted, as a consequence, that L05's
Checkbox and Switch would take a `FormFieldBinding` the same way. The L05 plan, written afterwards
in the planner with reviewer consults, decided the opposite (decision 4): Checkbox and Switch take
their own `label`, `description` and `error`.

The plan's reason holds up. A single checkbox's label _is_ its field label, and it sits after the
box. FormField puts its label above the control, so a checkbox inside a FormField would have two
labels, or a FormField with no label. ADR-0011's actual concern was that one place owns the wiring,
and that the name requirement is enforced at the type level. A required `label` (or
`aria-label` / `aria-labelledby`) on the control itself meets the second. A shared hook meets the
first.

## Decision

- **Checkbox and Switch own their label.** Each takes `label` XOR `aria-label` /
  `aria-labelledby` (type-level), plus `description`, and Checkbox also takes `error`. The native
  `<label>` sits after the control. They don't take a `FormFieldBinding`.
- **CheckboxGroup owns its legend, description and error**, on a `<fieldset>`.
- **One place owns the wiring.** `internal/useFieldWiring` computes the ids, `aria-describedby`
  and the error state; `internal/useFormFieldControl` syncs native validity to `aria-invalid`
  (ADR-0011). FormField, Checkbox, CheckboxGroup and Switch all use them.
- **FormField's sealed binding stays, for text-entry controls** (TextInput now; a later Textarea or
  Select). L04 decision 6 ("no `label` prop on the control") is scoped to them.
- Everything else in ADR-0011 stands: invalid is styled from `[aria-invalid="true"]` only.

## Consequences

- Two ways to label a form control: a FormField around a text-entry control, or a binary control's
  own `label`. The split follows where the label sits (above versus after), which the docs can say
  in one line.
- FormField's public API is unchanged; only its internals moved to the shared hooks.
- Radio and RadioGroup, when planned, follow the binary pattern (own label, fieldset group).
- **Revisit when:** a binary control needs to sit inside a FormField layout (a label above the
  control, with a checkbox as one of several fields), or a text-entry control needs its label after
  the control.
