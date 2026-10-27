# 0016 — `rem` is allowed in size container queries, and only there

- **Status:** Accepted
- **Date:** 2026-10-26
- **Deciders:** senakster (solo call, no review required)
- **Affects modules:** L02, L07, L11
- **Amends:** [ADR-0015](0015-rem-in-media-queries.md) (`rem` in size media queries), extending it
  from `@media` to `@container`

## Context

L07 decision 9 gives EmptyState no `size` prop: a named container query switches its layout
between compact (a table cell, a small card) and stacked (a page). That needs a breakpoint in an
`@container` condition, and, as with media queries, a breakpoint can't be a token: `var()` doesn't
work in a container condition.

ADR-0015 allowed `rem` in size media features only, using three built-in Stylelint rules. A probe
on 2026-10-26 showed none of them looks inside an `@container` condition: `(inline-size >= 30rem)`,
`(inline-size >= 480px)`, `(inline-size >= 40ch)` and `(width >= 30em)` all passed, while the same
file rejected `px` in `@media` and in a declaration. So ADR-0009's allow-list never covered
container queries. No component used one before L07, so nothing slipped through, but the first one
would have been unchecked. Stylelint has no built-in rule that checks units in an `@container`
condition.

## Decision

- **`rem` is allowed in size container features**: `width`, `height`, `inline-size`, `block-size`
  and their `min-`/`max-` forms, in either syntax (`(min-width: 30rem)`, `(inline-size >= 30rem)`).
  Same reason as ADR-0015: the breakpoint follows the user's font-size setting.
- **No other unit is allowed in an `@container` condition**, and `rem` is not allowed with any other
  feature (`aspect-ratio`, `orientation`, or a `style()` query).
- **`scripts/check-component-css.mjs` enforces it**, because no built-in Stylelint rule can. It runs
  in `pnpm check` next to Stylelint. ADR-0007's "built-in rules only" is about Stylelint; this check
  joins the structural checks the script already does on the same files.
- **Every container query names a `senui-` container that its own stylesheet declares**
  (`container:` or `container-name:`). The check enforces all three parts (Emil, 2026-10-27):
  - A name, because an unnamed query matches the nearest container of any kind: a consumer's
    layout, or another senui component the query happens to sit inside. L07 decision 9 names
    EmptyState's container for the same reason, seen from the consumer's side.
  - The `senui-` prefix, because container names are global, like class names; the prefix does for
    them what it does for `.senui-*` classes and `--senui-*` tokens.
  - A declaration in the same stylesheet, because a misspelled name never matches and fails
    silently. Probed on 2026-10-27: a typo and an undeclared name are rejected; names declared with
    `container:` or in a `container-name` list pass.

  The cost: a senui component can never query a container the consumer names. Nothing asks for that,
  and it would tie a library component to an app's layout.

Rejected:

- **`ch` for the breakpoint.** It is already allowed and would need no ADR, but in a container
  condition it resolves against the container's own font, so a consumer's font override moves the
  breakpoint. That differs from media queries for no gain, and the guard gap would still need
  closing.
- **A Stylelint plugin.** ADR-0007 keeps Stylelint to built-in rules, and a plugin is a dependency
  (principle 2) for one check.

## Consequences

- Container breakpoints are raw values in component CSS, like media breakpoints (ADR-0015). Every
  one says why in a comment; reviewers hold that.
- The check reads CSS as text with a regular expression, the weakness ADR-0007 chose Stylelint to
  avoid. It is limited to `@container` preludes, which are short and regular, and it is probed both
  ways when added.
- **Revisit when:** Stylelint gains a built-in rule that checks units in `@container` conditions
  (then the check moves there), `@custom-media` or an equivalent for container queries ships in
  Chromium, Firefox and WebKit (ADR-0015's trigger), or a container query needs a unit other than
  `rem`.
