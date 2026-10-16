# 0007 — Stylelint guards component CSS against raw values

- **Status:** Accepted (amended by [0009](0009-stylelint-unit-allow-list.md): a unit allow-list
  replaces the blocklist below, and selector specificity is checked)
- **Date:** 2026-10-16
- **Deciders:** senakster (solo call, no review required)
- **Affects modules:** L02, L03, L04, L05, L06, L07, L11

## Context

Principle 4 says component CSS uses tokens only: no raw colour, space, radius, type, motion or
elevation values, and no primitive tokens. L01 left a note for L02 to enforce it. Principle 2
requires an ADR for any new dependency, naming the native alternative it beat.

The alternative without a dependency is a check script that greps component CSS for hex colours,
colour functions and length units. It is small, but it reads CSS as text. It can't tell a value
from a selector or a comment, it misses forms nobody thought to grep for, and every new rule is
another regular expression to get right.

## Decision

Component CSS (`packages/react/src/**/*.css`) is linted by **Stylelint**, pinned exactly, as part
of `pnpm lint` and so of `pnpm check`. The config uses only Stylelint's built-in rules:

- `color-no-hex` and `color-named: never`: no literal colours.
- `function-disallowed-list`: no colour functions (`rgb()`, `hsl()`, `oklch()`, `color()`,
  `color-mix()` and the rest) and no `cubic-bezier()`. Colours and easings come from tokens.
- `unit-disallowed-list`: no `px`, `rem`, `em`, `ms` or `s`. Lengths and durations come from
  tokens. `%`, `fr` and unitless `0` stay allowed, because they are layout, not design values.
- `declaration-property-value-disallowed-list`: no reference to a primitive
  (`--senui-primitive-*`) or a numbered colour step (`--senui-color-<name>-<n>`), in any property.
- `declaration-property-value-allowed-list`: `font-family`, `font-weight` and `box-shadow` must use
  a `var(--senui-*)` token (or a CSS-wide keyword).

The docs app's own CSS and the generated `tokens.css` are not component CSS and aren't linted by
these rules.

**Rejected:**

- **A grep check script** (the native alternative). No dependency, but it reads CSS as text: it
  can't distinguish values from selectors or comments, and it needs a hand-written regular
  expression for every rule Stylelint already ships.
- **A Stylelint plugin** such as a strict-value plugin. It is more precise per property, but it's a
  second dependency for something the built-in rules cover.
- **Deferring to L08.** Components from L03 on would ship unchecked until then.

## Consequences

- Stylelint is a dev dependency with about 35 transitive packages. It never reaches consumers.
- A component that really needs a raw value (a 1px hairline, say) has to add a token or disable
  the rule on that line, with a comment saying why. Disables are visible in review.
- The unit list is deliberately blunt. If it blocks a legitimate layout value, such as `ch` for
  readable line length, that unit is not on the list and stays allowed.
- **Revisit when:** the built-in rules can't express a rule we need (that would mean a plugin or
  our own rule), or Stylelint releases a new major that changes rule names.
