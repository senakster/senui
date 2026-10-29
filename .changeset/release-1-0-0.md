---
'@senakster/senui-tokens': major
'@senakster/senui': major
---

The first stable release. From 1.0.0 on, versions follow semver: a component, prop, value, class, token or export is removed or renamed only in a major version, after a minor that deprecates it, warns in development and says what to use instead.

`@senakster/senui` takes `@senakster/senui-tokens` as a peer dependency, so an app has exactly one copy of the tokens: install both, and load `@senakster/senui-tokens/tokens.css` before the component styles. A major version of the tokens is a major version of the components too.

Every module is its own file in the package, so a bundler keeps only the components an app imports, and `@senakster/senui/styles/<Name>.css` loads the styles of every component it renders.
