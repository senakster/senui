# 0008 — The a11y contract gains an `adaptation` section

- **Status:** Accepted
- **Date:** 2026-10-16
- **Deciders:** senakster (solo call, no review required)
- **Affects modules:** L02, L03, L04, L05, L06, L07, L08, L09

## Context

L02 fixed the sections of a component's accessibility contract: semantics, keyboard, focus,
announcements, required props, consumer responsibilities, WCAG criteria, test runs and known
issues. The contract feeds the docs, `components.json` and `llms.txt`, so whatever it can't express
is missing from what engineers and agents read.

The L02 review found that a contract could be complete and still say nothing about how the component
adapts to the user. Nothing recorded:

- target size (WCAG 2.5.8);
- pointer cancellation (2.5.2);
- how states stay visible in forced-colours mode;
- reduced motion (the ADR-0005 motion factor);
- right-to-left mirroring;
- whether text wraps or truncates (1.4.10, 1.4.12).

Some of these have a WCAG criterion that a `wcag` entry could carry. Forced colours and RTL have
none, so they would have nowhere to go.

## Decision

Add a required `adaptation` section to `A11yContract`, with closed values only:

| Field           | Values                                              |
| --------------- | --------------------------------------------------- |
| `targetSize`    | `'min-24'`, `'spacing-exception'`, `'not-a-target'` |
| `activatesOn`   | `'click'`, `'pointerup'`, `'not-activatable'`       |
| `forcedColors`  | `'border'`, `'system-colour'`, `'no-states'`        |
| `reducedMotion` | `'motion-factor'`, `'no-motion'`                    |
| `rtl`           | `'mirrors'`, `'direction-neutral'`                  |
| `textOverflow`  | `'wraps'`, `'truncates'`                            |

Closed values let the docs render them consistently, and let L08's checks test against them, for
example measuring the target box of every `'min-24'` component.

**Rejected:**

- **Making the matching `wcag` entries mandatory instead.** No new section, but forced colours and RTL
  have no criterion to attach to, and the facts would be scattered across prose in `how`.
- **Free-text notes.** Can't be rendered consistently or checked.
- **Deferring to L03.** Every contract written before the change would need rewriting, and the shape
  is cheapest to change before the first one exists.

## Consequences

- Every contract states six more facts, each a choice from a short list.
- A new value (say `'container-query'` for reflow) is an edit to the type and a minor change to the
  published `components.json` schema.
- L08 can derive checks from the values: target size, forced-colours screenshots, the
  reduced-motion run.
- **Revisit when:** a component's behaviour doesn't fit any value of a field, or WCAG 3 changes the
  criteria these map to.
