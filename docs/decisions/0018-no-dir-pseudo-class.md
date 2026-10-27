# 0018 — Component CSS mirrors with logical properties, never `:dir()`

- **Status:** Accepted
- **Date:** 2026-10-27
- **Deciders:** senakster (Emil, 2026-10-27; no review required)
- **Affects modules:** L05, L08, and every component module after it

## Context

Switch moved its checked thumb with `translate` and mirrored it for right-to-left text with a
`:where(.senui-switch__control:checked:dir(rtl))::before` rule (L05). The source CSS is correct, and
every per-component test passed: they run the source.

L08's gate runs the **built** Storybook, as a consumer's bundler produces it, and its runtime RTL
check flips `<html dir>` and compares boxes and pseudo-element offsets. In a default Vite production
build the thumb didn't move: Vite's CSS transform lowers `:dir(rtl)` for older browser targets into a
`:lang(ar, ckb, dv, fa, he, …)` list. A page marked `dir="rtl"` without one of those language codes,
or with right-to-left content in a left-to-right language page, never matches, so the thumb sat on
the left-to-right side. This is the same family of defect as ADR-0010 (`light-dark()` rewritten by
the bundler), and it is invisible to any test of source CSS.

## Decision

- **Component CSS never uses `:dir()`.** A component mirrors with logical properties, which follow the
  inherited direction natively and leave a bundler nothing to rewrite.
- **Switch** moves its thumb with `margin-inline-start` (transitioned like the `translate` was;
  `--senui-motion-reduce` still scales only the duration, L05). On is at the inline end in either
  direction.
- **Enforced by Stylelint's built-in `selector-pseudo-class-disallowed-list: ['dir']`** (ADR-0007's
  built-in-rules-only holds), probed at every nesting depth.
- The L08 gate's runtime RTL check keeps guarding the result in built output, in every engine.

Rejected:

- **Keeping `:dir()` and telling consumers to set their bundler's CSS targets** so it isn't lowered.
  Every default build would stay broken, and the failure is silent.
- **An attribute selector (`[dir='rtl'] &`).** It doesn't follow the nearest direction: a
  left-to-right island inside a right-to-left page would still match.

## Consequences

- A component that needs direction-dependent motion uses an inset or a margin, not a transform. A
  layout property transitions on a small element only; anything larger needs a new decision.
- **Revisit when:** bundlers' default targets all support `:dir()` natively (so nothing lowers it), or
  a component needs a direction-dependent value no logical property can express.
