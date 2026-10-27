# 0017 — Contracts declare essential motion

- **Status:** Accepted
- **Date:** 2026-10-27
- **Deciders:** senakster (Emil's call while planning L08; no review required)
- **Affects modules:** L02, L03, L08, L09, L11
- **Amends:** [ADR-0008](0008-a11y-contract-adaptation.md) (the contract's `adaptation` section), whose
  revisit trigger this is: "a component's behaviour doesn't fit any value of a field"

## Context

ADR-0008 gave `adaptation.reducedMotion` two values: `'motion-factor'` (movement is scaled by
`--senui-motion-reduce`, so under reduced motion it stops) and `'no-motion'`. Button's loading spinner
fits neither. Under reduced motion it keeps turning, four times slower, on purpose: a spinner that
stops looks like a frozen page, and it is an in-place rotation that moves nothing else (L03).

L08's gate turns `reducedMotion` into a check: with reduced motion emulated, no animation may move
anything. As written, that check fails Button. The plan's reviewers offered two ways to allow it: an
entry in the gate's exceptions file, or a field in the contract. Exceptions expire by design (L08
decision 12), and this is a permanent design choice that consumers should be able to read.

## Decision

- **A new optional field, `adaptation.essentialMotion`**, with closed values, starting with one:
  `'progress-rotation'`, an in-place rotation that shows work is in progress. It names the one
  animation a component keeps under reduced motion.
- It is allowed only with `reducedMotion: 'motion-factor'` (the type enforces it): a `'no-motion'`
  component has nothing to keep.
- The L08 gate's motion check allows exactly that: under reduced motion, a recorded animation may
  rotate an element in place when the contract declares `'progress-rotation'`; anything else that
  moves fails.
- Button's contract declares it. It is published with the contract (`components.json`, L09).

Rejected:

- **An exception entry for Button's loading stories.** It would expire and need renewing for a
  decision that doesn't change, and it would sit in a test file, not in the contract consumers read.
- **Stopping the spinner under reduced motion.** It was decided in L03: a stopped spinner reads as a
  hang.

## Consequences

- A new value (a pulsing indicator, say) is a type edit and a minor change to the `components.json`
  schema, as ADR-0008 says for every field.
- The gate's motion check must tell an in-place rotation from movement. It measures each animation at
  its start and end, and accepts `rotate` or a rotation-only `transform` when the element's box
  centre doesn't move.
- **Revisit when:** a component needs a kind of essential motion that isn't an in-place rotation, or
  L11 (motion) changes how reduced motion is applied.
