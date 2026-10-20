# 0013 — Form controls always render `aria-invalid`, `"true"` or `"false"`

- **Status:** Accepted
- **Date:** 2026-10-20
- **Deciders:** senakster (found in a Narrator run; solo call, no review required)
- **Affects modules:** L04, L05
- **Amends:** [ADR-0011](0011-form-control-validity-and-binding.md) (its "nothing reads invalid
  before a submit attempt" rests on this), and L04 decision 1 ("`aria-invalid` only when invalid")

## Context

L04 decided that `aria-invalid` is present only while a control is invalid, and absent otherwise,
never `"false"`; L04 and L05 had acceptance criteria to match. ADR-0011 promised that nothing looks
or reads invalid before a submit attempt.

On 2026-10-20 Emil heard Narrator announce the first box of a required CheckboxGroup as invalid on
page load, and the other boxes as fine. A probe of Chromium's accessibility tree explained it: with
no `aria-invalid` attribute, Chromium derives the invalid state from native validity. An untouched
control is reported invalid when it carries a custom validity message (the group's "choose at least
one"), when a required checkbox is unchecked, or when a text field already holds an invalid value
(a pattern mismatch, a bad email). Only an empty required text field is held back. The L04 probe
had happened to test exactly that one case.

The same probe showed that an explicit `aria-invalid="false"` overrides the derived state.

## Decision

- **Every senui form control renders `aria-invalid` explicitly:** `"true"` while it shows an error
  (an `error` prop, a group error, or a native error after a submit attempt), `"false"` otherwise.
  It is never absent. TextInput and Checkbox get it from the shared `useFormFieldControl`; Switch,
  which is never invalid, always renders `"false"`.
- This replaces L04 decision 1's "only when invalid", and the "absent when valid" acceptance
  criteria in L04 and L05.

## Consequences

- What assistive technology announces matches what the control shows: invalid only after the
  user's submit attempt, or when the app sets an error.
- `aria-invalid="false"` is the attribute's default value, so it is redundant in the DOM except
  where native validity would otherwise leak. Some audits flag redundant ARIA; axe does not.
- Locked by browser tests asserting `"false"` on each natively invalid, untouched case. They check
  the attribute, not the accessibility tree: Vitest's browser mode has no CDP access, so the tree
  itself was probed by hand (Chromium). Firefox and WebKit derivation is not probed.
- **Revisit when:** browsers stop exposing native validity as invalid before user interaction (as
  `:user-invalid` timing does), or a reader is found that announces `aria-invalid="false"` as
  anything other than valid.
