# internal/

Code the components share, which is never exported from the package. Each folder holds one
concern. A new file goes in the folder whose concern it serves. If none fits, add a folder; don't
put the file at the top level.

| Folder     | Concern                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------- |
| `a11y/`    | The accessibility contract type, its runtime check and test, the WCAG table, and `useNameCheck`   |
| `dev/`     | Development-only diagnostics: `warnOnce`, `deprecate`                                             |
| `dialog/`  | `ModalDialog` and `useModalDialog`, shared by Dialog and AlertDialog (L06)                        |
| `dom/`     | DOM and prop plumbing: `mergeIds`, `useComposedRefs`, `NativeProps`, `firstFocusable`             |
| `field/`   | Form-control wiring shared by FormField and the controls (ADR-0011, ADR-0012): ids, errors, reset |
| `state/`   | `useControllableState`                                                                            |
| `testing/` | Test helpers: axe, story controls, layout checks. Imported only by tests                          |

`conventions.test-d.tsx` stays at the top level: it is the reference type test that
`CONVENTIONS.md` cites, and it covers several folders.

Each test sits next to the file it tests. Import across folders with relative paths
(`../dom/ids.js`). Nothing in here imports from `src/index.ts`.
