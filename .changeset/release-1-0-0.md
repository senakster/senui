---
'@senakster/senui-tokens': major
'@senakster/senui': major
---

The first stable release. From 1.0.0 on, a component, prop, value, class, token or export is renamed or removed only in a major version, after a minor that deprecates it: a deprecated prop warns once in development and says what to use instead, and the docs mark it. New tokens, components and props come in minor versions.

`@senakster/senui-tokens` is a peer dependency of `@senakster/senui`, so an app has exactly one copy of the tokens: install both packages, and load `@senakster/senui-tokens/tokens.css` before any component styles. A major version of the tokens is always a major version of the components too.

`tokens.css` declares the cascade layers `senui.tokens`, `senui.base` and `senui.components`, so your own unlayered styles override every token and component without raising specificity. Colours follow the page's colour scheme through `light-dark()`, and motion follows `prefers-reduced-motion`. Override a token on `:root, [data-theme]`; a subtree with `data-theme="light"` or `data-theme="dark"` gets its own background and text colour.

Load every component's styles with `@senakster/senui/styles.css`, or only the ones you use with `@senakster/senui/styles/<Name>.css`. A component's stylesheet loads the styles of the components it renders, so `styles/Dialog.css` brings Button's. Every module is its own file in the package, so a bundler keeps only the components you import.

Each component's accessibility is documented as a contract in `components.json` and on its docs page, including what your app must still do. Some manual screen-reader and keyboard runs predate later changes to their component; the docs mark those runs as not re-tested.
