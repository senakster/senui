# 0006 — No polymorphic components (`as` / `asChild`)

- **Status:** Accepted
- **Date:** 2026-10-16
- **Deciders:** senakster (solo call, no review required)
- **Affects modules:** L02, L03, L04, L05, L06, L07

## Context

L02 leaves polymorphism as an open question: should any component accept `as="a"` or a Radix-style
`asChild` to render a different element?

- **For it:** it is the common way to get a link that looks like a button, or to put a component's
  styling onto a router's link element.
- **Against it:** a polymorphic prop type is a union over every element that might be rendered.
  The compiler loses the link between the element and its props, so `href` on a button,
  `disabled` on a link, or a missing accessible name all type-check. That is exactly the misuse
  principle 1 exists to prevent. The element also stops being a fact the a11y contract can state:
  a Button contract that says "native `<button>`" is false the moment `as="div"` is passed.

None of the planned components (Button, FormField, TextInput, Checkbox/Switch, Dialog,
EmptyState) needs to render as anything else.

## Decision

- No component accepts `as`, `asChild`, or any prop that changes the rendered element.
- Each component renders one known native element (or a fixed structure of them), and its
  `*.a11y.ts` contract names that element.
- A need for "X styled like Y" is met by a separate component with its own element and contract
  (for example, a future `LinkButton` rendering `<a>`), not by making Y polymorphic.

**Rejected:**

- **`as` prop** (Emotion/MUI style). Its prop types are either unsafe (`any`-ish unions) or so
  heavy that error messages become unreadable.
- **`asChild` / slot** (Radix style). It is flexible and composes with routers, but it merges
  props and refs onto an element the component doesn't control. The a11y guarantees then depend
  on the child the consumer passed.

## Consequences

- Consumers who want a router link with button styling need a dedicated component, or they apply
  the documented component tokens to their own element.
- Every component's element is fixed, so its contract, its stories and its tests are about one
  thing.
- **Revisit when:** a link-styled button is requested and a separate `LinkButton` would duplicate
  most of Button, or a router integration needs a component to render the router's own element.
