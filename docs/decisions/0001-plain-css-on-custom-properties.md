# 0001 — Plain CSS on custom properties, no utility framework

- **Status:** Accepted
- **Date:** 2026-10-15
- **Deciders:** senakster (solo call, no review required)
- **Affects modules:** L00, L01, L02, L03, L04

## Context

senui is a library, not an app. Its CSS ends up in applications it knows nothing about, built
with whatever toolchain they chose. Three forces pull against each other:

- **Consumers must be able to override it.** If a team has to win a specificity fight or
  `!important` its way past a button, the library has failed at its one job.
- **Consumers must not inherit our toolchain.** A library that needs Tailwind (or a PostCSS step,
  or a CSS-in-JS runtime) to render correctly forces that choice on every app that installs it.
- **Fast authoring.** Tailwind is the fastest way I know to style a component, and a design
  system is mostly styling.

The first two are requirements of a published library. The third is a convenience for me.

## Decision

Components are styled with **plain CSS on custom properties**, shipped as real stylesheets.

- All CSS lives in cascade layers, declared once in this order:
  `@layer senui.tokens, senui.base, senui.components;`. Any unlayered consumer rule beats every
  senui rule, whatever its specificity.
- Base selectors use `:where(.senui-<name>)`, which has zero specificity. Variants are
  data attributes (`[data-variant="danger"]`, `[data-size="sm"]`). States use native signals
  first (`:disabled`, `:focus-visible`, `:user-invalid`, `[aria-invalid="true"]`).
- Every value comes from a token (ADR-0002). Each component exposes its override points as
  component tokens (`--senui-button-bg`).
- The package ships one full stylesheet plus a stylesheet per component, and lists `**/*.css` in
  `sideEffects` so bundlers keep them.

**Rejected:**

- **Tailwind**, whether inline utilities or a preset consumers must install. It leaks the
  toolchain to consumers, and its utilities can't be overridden from outside without a matching
  utility.
- **CSS Modules.** Hashed class names give consumers nothing stable to target, and they need a
  bundler step.
- **Runtime CSS-in-JS** (styled-components, Emotion). It costs runtime, complicates server
  rendering, and couples styles to a React renderer.
- **Zero-runtime CSS-in-JS** (vanilla-extract, Panda). It's closer, but it still adds a build
  plugin and a second styling language for consumers to learn when they override things.

## Consequences

- Authoring is slower than with Tailwind. I'm writing selectors, states and responsive rules by
  hand, and I accept that.
- Class names and component tokens are public API under semver. Renaming `.senui-button` or
  `--senui-button-bg` is a major version.
- Consumers who use their own `@layer` order must place `senui` in it. I'll document this in the
  README.
- `@layer` and `:where()` are Baseline (2022). Browsers older than that are not supported.
- **Revisit when:** consumers can't load plain stylesheets in their environment (for example a
  React Native target), or the component count grows past the point where hand-written CSS stays
  consistent without a lint rule for raw values.
