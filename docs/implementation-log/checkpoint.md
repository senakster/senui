# Implementation checkpoint

Single source of truth for **where the implementation is right now**. Overwritten by the
`implement-module` skill at the end of every run. For history, see `log.md`; for status, see
`docs/PROGRESS.md`.

| Field         | Value                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------- |
| Target app    | repo root (pnpm workspace: `packages/tokens`, `packages/react`, `apps/docs`)                  |
| Active module | L09 — Docs & machine-readable manifest (in progress)                                          |
| Sub-step      | PR 1 merged (#13); PR 2 built and verified, uncommitted on `feature/docs-L09-2`; Emil reviews |
| Last verified | 2026-10-28: `pnpm check`; `pnpm test` tokens 32, react 952; gate 1378 passed                  |
| Updated       | 2026-10-28                                                                                    |

## Brief

L09 generates the docs from typed sources:

- a docs page per component in the published Storybook;
- `components.json`, `llms.txt`, `llms-full.txt` and `docs/<component>.md`, in the npm package
  and on the site.

Plan: `.catalogue/library_catalogue/L09-docs-and-manifest.md` (synced 2026-10-28). Scope, and
every deviation: scope-decisions § L09. Claude builds and writes everything, including the
`.docs.ts` guidance, and Emil reviews.

**Four PRs (Emil):**

1. **Merged (#13):** the nightly removal, ADR-0019 (`language`), the contract cleanup,
   `ComponentDocs` and nine `.docs.ts` files, the published-text rules, the README as the usage
   source, CONVENTIONS rules 7 and 12.
2. **Built, uncommitted (`feature/docs-L09-2`):** the manifest type, the generator in tsdown's
   `build:before`, every output file in `exports`, props by axis, decision 5 in full (the gate as a
   run, traced evidence, `UNTRACED` empty), the props JSDoc cleanup, six new tests, the
   `pnpm/action-setup` v6 bump. Detail: scope-decisions § L09, "PR 2".
3. **Storybook docs pages:**
   - the template and blocks, and the docs theme;
   - the gate on docs pages, run as pages;
   - published-text rules on story JSDoc.
4. **The GitHub Pages deploy:**
   - Pages source set to GitHub Actions, with Emil's OK;
   - unreleased builds stamped as unreleased.

## In-flight notes

- For PR 3: story ids in the manifest must match the built `index.json` (a check, decision 8).
- For PR 3: the docs theme in dark mode, including story iframes in WebKit; the gate seeing
  `#storybook-docs` after `docsRendered`.
- Exceptions: Dialog Fullscreen and LongContent, `color-contrast:incomplete`, expire 2027-04-27.
- Open for TextInput (deferred): the Home/End contract row isn't true on macOS.
- npm publishing comes after L10. Gaps: no npm login on this machine, no LICENSE in the packages,
  no `bugs` (`homepage` and `repository` arrived in PR 2).
- Untested readers: JAWS, VoiceOver and TalkBack.

## Next action

1. Emil reviews PR 2: the props JSDoc rewrites in the nine components' `.tsx` files, the new and
   retitled tests, and the gate's criterion mapping in `apps/docs/gate/checks.ts` (`git diff`).
2. With Emil's OK, commit PR 2 and open it.
3. Then PR 3, the Storybook docs pages, starting with its day-one probes.
