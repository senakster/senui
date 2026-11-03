---
'@senakster/senui': minor
---

Requires `@senakster/senui-tokens` 1.1.0 or newer: Button's spinner reads the new `--senui-motion-duration-rotation` token, with the same period as before, and has no fallback, so with tokens 1.0 it doesn't turn. The peer range moves to `^1.1.0`.

Reduced motion gains a third contract value, `instant`: the element changes position at once, without animating, because its end position carries meaning. In `components.json`, `adaptation.reducedMotion` can now be `motion-factor`, `instant` or `no-motion`, and Switch's value changes from `motion-factor` to `instant`. Under reduced motion, or with `--senui-motion-reduce` set to `0`, Switch's thumb still jumps to its side, and its colour now keeps its fade.

The generated docs describe each value as what happens: Dialog's movement is removed, Switch's position changes at once, and Button's spinner keeps turning, four times slower. The separate "Essential motion" line is folded into the "Reduced motion" line. Button, Switch, Dialog and AlertDialog gain a WCAG 2.3.3 row (`enables`), and Button gains a 2.2.2 row and a responsibility: end or time out every loading state.

Dialog and AlertDialog wait for their exit transitions however long they are. Their safety net, for an exit that never finishes, was a fixed second, so an exit lengthened past it, on the dialog or only on its backdrop, was cut short; it now lasts as long as the exit itself, plus a short margin. A dialog with no exit transition still closes at once.

The docs site gains a Motion page: what reduced motion does to each component, and how to give your own motion and an in-app setting the same behaviour through `--senui-motion-reduce`.
