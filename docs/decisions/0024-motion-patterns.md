# 0024 — Three motion patterns, one reduce factor

- **Status:** Accepted
- **Date:** 2026-11-03
- **Deciders:** senakster (Emil settled scope, durations, the contract value and the guard while
  planning L11; no review required)
- **Affects modules:** L01, L02, L03, L05, L06, L08, L09, L11
- **Amends:** [ADR-0005](0005-token-contract-amendments.md) (the motion factor now also scales
  durations, in the Instant and Essential patterns) and [ADR-0008](0008-a11y-contract-adaptation.md)
  (`reducedMotion` gains `'instant'`). Supersedes the wording "it stops" in ADR-0008 and
  [ADR-0017](0017-contract-essential-motion.md), whose texts stay as history. Resolves ADR-0017's
  trigger "L11 changes how reduced motion is applied": the spinner's rule is unchanged; its period
  becomes a token.

## Context

Motion was built a component at a time. Dialog multiplies its distance and scale by
`--senui-motion-reduce`; Switch multiplies its thumb's duration, so the thumb still moves, at once;
Button's spinner multiplies a slowdown. Three uses of one factor, written down for only one. The
contract's `reducedMotion: 'motion-factor'` couldn't tell a removed movement from a jump, so Switch's
generated docs said its motion "stops" while its thumb changed sides. And nothing static caught a new
animation that forgot the factor: only a story that happened to exercise it.

## Decision

**Movement** is a change in any property of one list, defined once in
`packages/react/scripts/motion.mjs` and shared by the static check, the gate and the docs:
`transform`, `translate`, `scale`, `rotate`, the physical and logical insets, the physical and
logical margins, and `width`, `height`, `inline-size`, `block-size`. Colour and opacity are not
movement and keep their full duration under reduced motion (L01 decision 6).

Every pattern goes through the factor, so a consumer who sets `--senui-motion-reduce: 0` (an in-app
setting) gets every component's reduced behaviour, not only users whose system asks.

| Pattern   | When                                                  | CSS                                                                                                             | Under reduced motion                                  | Contract                                                      |
| --------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------- |
| Removed   | Motion that decorates a change: an entrance, an exit  | The moved value is multiplied by the factor                                                                     | No movement; colour and opacity keep their duration   | `reducedMotion: 'motion-factor'`                              |
| Instant   | The end position carries meaning (a switch's thumb)   | Only the movement's duration is multiplied, paired with `transition-property` by index, so colour keeps its own | It moves to its end position at once                  | `reducedMotion: 'instant'`                                    |
| Essential | Continuous motion that is the information (a spinner) | `@keyframes` animating `rotate` only, for `--senui-motion-duration-rotation × (4 − 3 × factor)`                 | It keeps turning, four times slower (3.84 s per turn) | `'motion-factor'` with `essentialMotion: 'progress-rotation'` |

- A component that moves nothing declares `'no-motion'`. A component declares the strictest pattern
  among its elements (`instant` over `motion-factor`).
- **No `@media (prefers-reduced-motion)` in component CSS.** The tokens and the factor carry reduced
  motion; a media block is a second mechanism a consumer's factor can't reach.
- **WCAG.** The patterns are how a component _enables_ 2.3.3 (Animation from Interactions, AAA) for
  the page, never a "meets" claim. The spinner relies on 2.3.3's essential exception and on 2.2.2
  (Pause, Stop, Hide): it shows only while an action is pending, and the consumer must end or time
  out the loading state. The slowdown, not a stop, is justified because it neither translates nor
  scales, covers a small area, and turns about once every 4 s under reduced motion.
- **Guards.**
  - Stylelint, with built-in rules:
    - a transition's duration is a duration token, alone or times the factor, and an animation's
      is the rotation token slowed by it; only `--senui-motion-duration-*` tokens, never a component
      or private property (one source of truth, principle 4);
    - `transition-property` names a property from the movement list or from a short list classified
      as not moving (colours, `opacity`, `box-shadow`, `filter`), so a new property is classified
      before it ships; no `all`, no `var()`, and no `var()` in `animation-name`;
    - no `transition` or `animation` shorthand, and no `prefers-reduced-motion` media feature.
  - `scripts/check-component-css.mjs` finds each movement's pattern with `postcss` and
    `postcss-value-parser`, and checks that the component's contract declares it. A resting value
    is `none`, `auto`, `0` or a unitless `1`; every moving part of a value carries the factor;
    private properties resolve, fallbacks included; a property's family (shorthands, longhands,
    physical and logical) is judged together; a rule that sets only durations can't undo an Instant
    slot; and a colour or opacity transition never carries the factor, which is what makes "colour
    and opacity keep their duration" true. **Limit:** it proves the factor is present where it
    must be, not that it zeroes the movement, and it is selector-blind (stricter than the cascade);
    the gate is the proof.
  - The gate's motion check knows every contract value and fails an unknown one. It samples every
    animation at ¼, ½ and ¾ as well as its ends, so a shake that returns to its start is seen. It
    allows the essential rotation only when samples at 0, ⅛, ¼ and ½ of its period show a
    z-axis `rotate`, a pure rotation matrix, a centred `transform-origin` and a fixed box centre,
    and its period under reduced motion is four times `--senui-motion-duration-rotation`.
- **New dev dependencies:** `postcss` and `postcss-value-parser`, already installed through
  Stylelint and pinned to those versions. The native alternative they beat is a regex over the
  stylesheet, which can't pair durations with properties by index or walk nested values.

## Consequences

- Switch declares `'instant'`, and its thumb's colour now keeps its duration under reduced motion.
  Button's spinner reads the new `motion.duration.rotation` token (960 ms, the old `slow × 3`).
- `'instant'` is a new value in the manifest's open enum: a minor change to the components package.
  The API diff can't see it (it has no `adaptation` fact), so the minor is a judgment call.
- The shorthand ban is stricter than the plan, which had the shorthands as already restricted: they
  weren't, and a shorthand would carry a duration past the longhand rule.
- An imported component stylesheet counts toward a component's pattern only when the component's
  root wears that component's root class (AlertDialog is a `senui-dialog`; Dialog only renders
  Buttons), which is how the gate attributes motion.
- The factor is an unregistered custom property: a consumer value that isn't a number between 0
  and 1 makes the spinner's duration invalid, and it stops. Registering it with `@property` is
  deferred (scope decisions, L11).
- **Revisit when:** a component needs a fourth reduced-motion behaviour, an element needs Removed
  and Instant together, consumers ask for a motion API of their own, a user reports a colour or
  opacity fade as a problem under reduced motion, a guard's limit lets a movement through that the
  gate also misses, or a consumer reports a broken spinner from a factor value.
