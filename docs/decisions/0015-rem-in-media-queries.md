# 0015 — `rem` is allowed in size media queries

- **Status:** Accepted
- **Date:** 2026-10-20
- **Deciders:** senakster (solo call, no review required)
- **Affects modules:** L06, L07, L11
- **Amends:** [ADR-0009](0009-stylelint-unit-allow-list.md) (its unit allow-list), whose revisit
  trigger this is: "the allow-list blocks a value with no sensible token"
- **Not to be confused with:** the planner's library ADR-0015 (dialog scroll lock), which senui
  adopted as [ADR-0014](0014-dialog-scroll-lock.md)

## Context

L06 decision 16 makes a dialog's header and footer sticky, and lets them scroll with the content
on a short viewport. A phone in landscape, or 400 % zoom (320 × 256 CSS px), would otherwise leave
about 100 px for the content between them. That needs a height breakpoint.

A breakpoint can't be a token. `var()` doesn't work inside a media query, and `@custom-media`,
which would give a breakpoint a name, hasn't shipped in any engine. ADR-0009's allow-list (`%`, `fr`,
`ch`, `deg`, `turn`) has no length unit, so Stylelint rejects any breakpoint at all. L06's first draft
worked around it with a `stylelint-disable-next-line`. That is one exception now, and a habit
later: every future breakpoint (L07, a popover, L11's motion) would add another disable that nobody
reviews again.

## Decision

- **`rem` is allowed in size media features only**: `width`, `height`, `min-width`, `max-width`,
  `min-height` and `max-height`. That covers both the classic `(max-height: 30rem)` and the range
  syntax `(height <= 30rem)`. Stylelint 17's `unit-allowed-list` can't scope a unit to media
  queries, so three built-in rules do it together (ADR-0007's "built-in rules only" holds):
  - `unit-allowed-list` admits `rem`;
  - `declaration-property-unit-disallowed-list` rejects it in every declaration, custom properties
    and `calc()` included;
  - `media-feature-name-unit-allowed-list` takes it only for the size features. A catch-all entry
    gives every other feature none, because the rule only checks the features it lists.

  Probed on 2026-10-20: `padding: 1rem`, `--x: 1rem`, `calc(100% - 1rem)` and
  `(min-resolution: 2rem)` are rejected; `(height <= 30rem)` and `(max-width: 40rem)` pass.

- `rem`, not `px` or `em`: in a media query, `rem` follows the user's browser font-size setting, so
  a breakpoint moves with the text size, which is what reflow (1.4.10) is about.
- No `stylelint-disable` comments in component CSS. The L06 one is removed.

Rejected:

- **A disable comment per breakpoint.** It works, but the exceptions accumulate, and each one is an
  unreviewed judgement.
- **Setting a `data-` attribute from script on short viewports.** That puts layout logic in
  JavaScript to get around a lint rule, and adds a resize listener to every dialog.

## Consequences

- Breakpoints are raw values in component CSS, the one place principle 4 doesn't reach. Consumers
  can't theme them. That is accepted, because no mechanism exists that would let them.
- Every breakpoint should say why in a comment. Reviewers hold that; no check enforces it.
- **Revisit when:** `@custom-media` ships in Chromium, Firefox and WebKit (then breakpoints become
  named custom media, possibly generated from tokens, and this exception goes), or a media query
  needs a unit other than `rem`.
