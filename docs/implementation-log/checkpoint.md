# Implementation checkpoint

Single source of truth for **where the implementation is right now**. Overwritten by the
`implement-module` skill at the end of every run. For history, see `log.md`; for status, see
`docs/PROGRESS.md`.

| Field         | Value                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| Target app    | repo root (pnpm workspace: `packages/tokens`, `packages/react`, `apps/docs`)                          |
| Active module | L09 — Docs & machine-readable manifest (in progress)                                                  |
| Sub-step      | PRs 1–2 merged (#13, #14); PR 3 built and verified, uncommitted on `feature/docs-L09-3`; Emil reviews |
| Last verified | 2026-10-28: `pnpm check`; `pnpm test` tokens 32, react 952; gate 1480 passed, 0 failed                |
| Updated       | 2026-10-28                                                                                            |

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
2. **Merged (#14):** the manifest type, the generator in tsdown's `build:before`, every output
   file in `exports`, props by axis, decision 5 in full, the props JSDoc cleanup, six new tests,
   the `pnpm/action-setup` v6 bump.
3. **Built, uncommitted (`feature/docs-L09-3`):** docs pages from one wording module, the docs
   theme (light and dark, framed stories in WebKit), `staticDirs`, the gate on every docs page
   (99 tests), published-text rules on story JSDoc, the budget wording. Detail: scope-decisions
   § L09, "PR 3".
4. **The GitHub Pages deploy:**
   - Pages source set to GitHub Actions, with Emil's OK;
   - unreleased builds stamped as unreleased.

## In-flight notes

- **Budget (Emil, 2026-10-28):** "Gate (all engines)" is disabled on GitHub. Firefox, WebKit and
  React 18.3 are checked locally until further notice; don't trigger costly CI runs.
- For PR 4: enabling Pages (`gh api -X POST repos/senakster/senui/pages -f build_type=workflow`)
  needs Emil's OK; the deploy adds CI minutes on each push to `main`.
- Exceptions: Dialog Fullscreen and LongContent, `color-contrast:incomplete`, expire 2027-04-27.
- Open for TextInput (deferred): the Home/End contract row isn't true on macOS.
- npm publishing comes after L10. Gaps: no npm login on this machine, no LICENSE in the packages,
  no `bugs` (`homepage` and `repository` arrived in PR 2).
- Untested readers: JAWS, VoiceOver and TalkBack.

## Next action

1. Emil reviews PR 3: the docs pages (`pnpm build`, then `pnpm --filter docs storybook`) and the
   story-description rewrites (`git diff` on `*.stories.tsx`).
2. With Emil's OK, commit PR 3 and open it.
3. Then PR 4, the GitHub Pages deploy.
