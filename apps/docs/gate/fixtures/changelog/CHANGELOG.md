# @senakster/senui

## 2.0.0

### Major Changes

- 1a2b3c4: Remove `kind`, deprecated in 1.1.0. Use `variant`.

  The `data-kind` attribute is gone too; select `[data-variant]` instead.

### Patch Changes

- Updated dependencies [5d6e7f8]
  - @senakster/senui-tokens@2.0.0

## 1.1.0

### Minor Changes

- 9a8b7c6: Add `variant` to `Button`, and deprecate `kind`.

  Passing `kind` warns once in development and still works until 2.0.0.

  Styles: `@senakster/senui/styles/Button.css` reads `--senui-button-bg` as the fallback of `--senui-button-background`.

- Add `EmptyState`, with no commit recorded.

### Patch Changes

- Updated dependencies [abcdef1, 1234567]
  - @senakster/senui-tokens@1.1.0
  - @senakster/senui-tokens-extra-long-package-name-for-wrapping@1.1.0

## 1.0.0

### Major Changes

- fedcba9: The first stable release.
