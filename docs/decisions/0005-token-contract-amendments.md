# 0005 — Token contract amendments: themed subtrees, motion factor, explicit surfaces, state names, pipeline-size trigger

- **Status:** Accepted
- **Date:** 2026-10-16
- **Deciders:** senakster (solo call, no review required); raised by the L01 review
  (`modern-web-curator`, `wcag-auditor`)
- **Affects modules:** L01, L03, L04, L11

## Context

ADR-0004 set up the token pipeline. Reviewing the first real token set found four places where
that contract lets a consumer or a token author break accessibility without any error:

- **Themed subtrees inherit the wrong colour.** `light-dark()` is resolved on the element where a
  property is used, and inherited properties pass down the _resolved_ value. Take a page that sets
  `body { color: var(--senui-color-fg-default) }` and contains `<aside data-theme="dark">`. The
  aside inherits the light text colour, and it has no dark background of its own. So "`[data-theme]`
  sets only `color-scheme`" promises a working subtree that it does not deliver.
- **Reduced motion can be overridden by accident.** The reduced-motion values live in
  `@layer senui.tokens`. An unlayered `:root { --senui-motion-distance-sm: 12px }` written by a
  consumer beats them, so users who asked for less motion get it back.
- **`contrast: []` opts out silently.** Any colour token could declare no pairs, and the build would
  never check it. The "use `[]` for a surface" rule was a convention, not a check.
- **There was no naming rule for interaction states.** `color.bg.accent` is a leaf. Nesting
  `color.bg.accent.hover` under it later would rename `--senui-color-bg-accent`, which is a major
  version.

Separately, ADR-0004's revisit trigger "the pipeline code grows past about 300 lines" fired once
these changes landed: the code was 308 non-blank, non-comment lines. The trigger exists to answer
one question. Is Style Dictionary still doing the heavy lifting, or have we built our own pipeline
on top of it? Line count turned out to be a poor proxy for that. Measured by purpose:

| Part                                                         | Lines | Style Dictionary's job?       |
| ------------------------------------------------------------ | ----: | ----------------------------- |
| Validation (pairs, `surface`, dark values, base-rule tokens) |    75 | No: our own safety rules      |
| Output templates (CSS layers, base rule, typed map)          |    70 | Partly: our CSS layout        |
| Transforms (oklch, units, shadow `var()`)                    |    49 | Yes: work around its defaults |
| Contrast check                                               |    48 | No: it has no contrast check  |
| Mode passes (dark, reduced motion)                           |    40 | Yes: it has no built-in modes |
| Setup and CLI                                                |    26 | Neither                       |

About 200 of the lines would be needed by a hand-written build too, so their growth says nothing
about the choice of Style Dictionary. Only the roughly 90 lines of transforms and mode passes are
where we work around it.

## Decision

This amends ADR-0004. Everything not listed here stands.

- **Themed subtrees are self-contained.** The token build emits one rule into `@layer senui.base`:

  ```css
  :where([data-theme]) {
    background-color: var(--senui-color-bg-default);
    color: var(--senui-color-fg-default);
    accent-color: var(--senui-color-fg-accent);
  }
  ```

  It has zero specificity and sits in a layer, so a consumer overrides it as easily as any other
  senui rule. The build fails if any of those three tokens is missing.

- **Motion has a reduce factor.** `--senui-motion-reduce` is a token: `1` normally and `0` under
  `prefers-reduced-motion: reduce`. Components multiply every movement by it, for example
  `translate: 0 calc(var(--senui-motion-distance-md) * var(--senui-motion-reduce))`, and
  `1 - (1 - var(--senui-motion-scale-enter)) * var(--senui-motion-reduce)` for scale. Distance and
  scale tokens still collapse under reduced motion too, but the factor is what makes a consumer
  override of a distance harmless. Durations are not multiplied, so opacity fades remain (L01).
- **Opting out of contrast is explicit.** A colour token must declare at least one contrast pair, or
  it must set `$extensions.senui.surface: true` and declare none. `surface` is for backgrounds and
  for colours WCAG exempts: disabled controls (1.4.3 and 1.4.11 exceptions), decorative dividers and
  shadows. Its `$description` says which.
- **State tokens use suffixes.** A state variant is a sibling of its base token with a hyphenated
  suffix: `color.bg.accent`, `color.bg.accent-hover`, `color.bg.accent-active`. Base tokens stay
  leaves and are never nested later.
- **The focus ring is drawn with `outline` and an offset.** A ring is never drawn with `box-shadow`,
  because forced-colours mode removes shadows. It is offset by `--senui-focus-ring-offset`, so the
  ring sits against the page background, not the control's fill. Its contrast pairs are therefore
  declared against page backgrounds (`bg.default`, `bg.subtle`, `bg.raised`), not against fills.
- **ADR-0004's line-count trigger is replaced.** "The pipeline code grows past about 300 lines" no
  longer applies. Revisit the choice of Style Dictionary when any of these holds:
  - the code that works around Style Dictionary (custom transforms and mode passes in
    `sd.config.mjs`) passes about 150 lines. It was about 90 when this was decided;
  - a third mode pass is needed beyond dark and reduced motion;
  - we reimplement something Style Dictionary already provides, such as reference resolution or
    type transforms.

  Validation, the contrast check and output templates don't count towards this, because a
  hand-written build would need them too.

**Rejected:**

- **Documenting the themed-subtree and motion hazards instead of fixing them.** Each is a silent
  accessibility failure that only shows up for some users, so a sentence in the docs is not a
  sufficient guard.
- **Restricting `contrast: []` by token path** (only `color.bg.*` may use it). It is simpler, but it
  ties a safety rule to names, and it can't express exempt colours such as `fg.disabled`.
- **DTCG `$root` nesting for states** (`color.bg.accent.$root`). It gives structured groups, but it
  depends on how the pipeline names `$root`. Suffixes are flat and read clearly in CSS.
- **A focus-ring pair against `bg.accent`.** The review proposed one. Calculated against these
  tokens: in dark mode the page is about 16% lightness and the accent fill about 72%. A ring needs
  at least 3:1 against the page, which means a relative luminance of at least about 0.11. It also
  needs 3:1 against the fill, which means at most about 0.09. No colour satisfies both, so an
  offset is the only sound design, and the offset makes the fill pair irrelevant.
- **Keeping the 300-line trigger and acting on it.** It fired on code that has nothing to do with
  Style Dictionary, so revisiting the choice of Style Dictionary on that basis would answer the
  wrong question.
- **Raising the line count again.** ADR-0004's threshold had already been moved once (from 150 to 300) to fit the code. A number that keeps moving to match reality isn't a trigger.

## Consequences

- `tokens.css` now writes to two layers: `senui.tokens` (values) and `senui.base` (the themed-subtree
  rule).
- Components (L03+) must multiply movement by `--senui-motion-reduce`. That is a review point for
  `wcag-auditor` and part of L11.
- Components must draw focus like this:

  ```css
  outline: var(--senui-focus-ring-width) solid var(--senui-color-focus-ring);
  outline-offset: var(--senui-focus-ring-offset);
  ```

- The pipeline grows by the base rule and the `surface` check. Neither counts towards the new
  Style Dictionary trigger.
- The new trigger is harder to measure than a plain line count. Someone has to look at which
  functions grew, not just how long the files are.
- **Revisit when:** a third theme makes `light-dark()` insufficient (ADR-0004's trigger), a
  component needs an inset focus ring, a focusable control sits on an accent-filled container (the
  offset gap would then show the ring's own colour), a consumer reports that the themed-subtree base rule fights
  their own layout styles, the Style Dictionary workaround code (transforms and mode passes) passes
  about 150 lines, a third mode pass is needed, or we reimplement something Style Dictionary
  provides.
