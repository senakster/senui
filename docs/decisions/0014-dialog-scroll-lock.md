# 0014 — Dialog scroll lock: containment, plus a scoped root lock on by default

- **Status:** Accepted
- **Date:** 2026-10-20
- **Deciders:** senakster (adopts the planner's library ADR-0015, which Emil accepted on 2026-10-19;
  solo call, no review required)
- **Affects modules:** L06
- **Source:** planner repo, `docs/decisions/0015-library-dialog-scroll-lock.md`, which L06's plan
  cites as "ADR-0015"

## Context

L06's Dialog and AlertDialog use a native `<dialog>` opened with `showModal()`. That makes the page
inert and keeps focus inside the dialog, but the page behind it can still scroll. Wheel and touch
over `::backdrop` scroll the page, and so does scroll chaining out of the dialog when it reaches
its own end.

Two fixes were weighed when L06 was planned:

- **`overscroll-behavior: contain`** on the dialog and its backdrop. This is plain CSS that shifts
  nothing and touches only what senui owns. But Safari doesn't contain overscroll on a
  non-scrollable element, and there is no way to detect that. In Safari the page drifts under the
  backdrop, and a screen-magnifier or zoom user loses their place. On 2026-10-20 webstatus.dev still
  listed Chrome 144 and Firefox 150 only.
- **`overflow: hidden` on the root** while a dialog is modal. This works in every engine and keeps
  the scroll position. But a library rule on `html` reaches into every consumer. Unscoped, it would
  also lock the consumer's own dialogs. And `scrollbar-gutter: stable` alongside it reserves a gutter
  on short pages.

Principle 6 says a known Safari defect can't ship by default. Principle 3 says a library shouldn't
quietly take over the consumer's root. This decision has to satisfy both.

## Decision

- **Always contain overscroll** on senui's dialogs:
  `:where(.senui-dialog):modal { overscroll-behavior: contain }` and
  `:where(.senui-dialog)::backdrop { overflow: hidden; overscroll-behavior: contain }`.
- **Lock the root by default**, but only while one of _senui's_ dialogs is modal:
  `:where(html:has(.senui-dialog:modal)) { overflow: hidden }`, inside `@layer senui.components`.
  AlertDialog carries the same `.senui-dialog` class, so it is covered.
  - The rule matches only the library class, so a consumer's own `<dialog>` is never affected.
  - It has zero specificity and is layered, so one unlayered consumer rule overrides it.
- **senui never sets `scrollbar-gutter`.** The docs recommend that consumers set
  `html { scrollbar-gutter: stable }` permanently, which avoids the shift on classic-scrollbar
  platforms.
- The rule, how to override it and the gutter advice go in `Dialog.a11y.ts` and
  `AlertDialog.a11y.ts` (consumer responsibilities) and on the Dialog docs page. The selector is
  public API under semver.

Rejected:

- **Containment plus an opt-in root-lock stylesheet.** Safari users drift unless every consumer
  knows to import an extra file. The safe behaviour should be the default.
- **An unscoped `html:has(dialog:modal)` plus `scrollbar-gutter`.** It reaches into dialogs senui
  doesn't own, and the gutter shifts short pages.

## Consequences

- Every engine is locked by default. `overflow: hidden` on the root doesn't reset `scrollTop`, so
  the position is kept. Reflow (1.4.10) is unaffected because the dialog scrolls itself (L06
  decision 16).
- On classic-scrollbar platforms, a consumer who skips the gutter advice sees the page shift by a
  scrollbar's width on open. This is accepted: it is documented, and the fix is one line.
- If an app scrolls an inner container rather than the root, the root rule does nothing and only
  the containment applies. This is listed as a known limitation in the contracts.
- A browser test asserts that a wheel over the backdrop leaves `document.scrollingElement.scrollTop`
  unchanged, in Chromium, Firefox and WebKit. Cross-engine runs are local until L08 (scope-decisions
  § L06).
- Removing or changing the root rule changes behaviour for consumers. It ships in a minor with a
  changelog note, never in a patch.
- **Revisit when:** Safari ships `overscroll-behavior` containment on non-scrollable elements (then
  drop the root rule in a minor and keep only the containment), or consumers repeatedly override
  the root rule (then reconsider making it opt-in).
