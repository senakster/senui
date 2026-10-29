---
'@senakster/senui': minor
'@senakster/senui-tokens': minor
---

Add `EmptyState`: says there is nothing here, why, and what you can do next. It renders a heading, a description, a decorative illustration and your actions in a plain `<div>`, with no role, no landmark and no live region.

`title` and `headingLevel` (2 to 6) are required. There is no default level: pick the one that fits your page outline. `description`, `illustration` (decorative: hidden from assistive technology and inert) and `actions` (one element or a fragment of your own Buttons or links, never text) are optional. The root takes no `role`, `tabIndex`, `aria-label`, `aria-labelledby` or `aria-describedby`: the heading is what a screen-reader user finds, and `headingRef` is how you move focus to it.

It adapts to the width of its container: compact (the illustration beside the text) below 30rem, stacked and centred above. It fills its parent's inline size, so give a shrink-to-fit parent (an auto-layout table cell, a `fit-content` box) a width, and put inline margin on a wrapper rather than on EmptyState.

It never moves focus or announces anything. Announce the change from a `role="status"` region that is already in the page. When the control that emptied the view disappears, move focus to the first action or to the heading, which `headingRef` gives you (it has `tabindex="-1"`).

Styles: `@senakster/senui/styles.css`, or `styles/EmptyState.css`. Fourteen `--senui-empty-state-*` tokens are the override points.

Add the `--senui-size-illustration-sm` and `-lg` tokens (an illustration beside text, and above it).
