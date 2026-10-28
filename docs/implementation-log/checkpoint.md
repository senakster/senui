# Implementation checkpoint

Single source of truth for **where the implementation is right now**. Overwritten by the
`implement-module` skill at the end of every run. For history, see `log.md`; for status, see
`docs/PROGRESS.md`.

| Field         | Value                                                                           |
| ------------- | ------------------------------------------------------------------------------- |
| Target app    | repo root (pnpm workspace: `packages/tokens`, `packages/react`, `apps/docs`)    |
| Active module | L09 — Docs & machine-readable manifest (in progress)                            |
| Sub-step      | PR 1 of 4 built and verified, uncommitted on `feature/docs-L09-1`; Emil reviews |
| Last verified | 2026-10-28: `pnpm check`; `pnpm test` tokens 32, react 919                      |
| Updated       | 2026-10-28                                                                      |

## Brief

L09 generates the docs from typed sources:

- a docs page per component in the published Storybook;
- `components.json`, `llms.txt`, `llms-full.txt` and `docs/<component>.md`, in the npm package
  and on the site.

Plan: `.catalogue/library_catalogue/L09-docs-and-manifest.md` (synced 2026-10-28). Scope, and
every deviation: scope-decisions § L09. Claude builds and writes everything, including the
`.docs.ts` guidance, and Emil reviews.

**Four PRs (Emil):**

1. **Built, uncommitted:**
   - the nightly removal;
   - ADR-0019 (`language`);
   - the contract cleanup;
   - `ComponentDocs` and nine `.docs.ts` files;
   - the published-text rules;
   - the README as the usage source;
   - CONVENTIONS rules 7 and 12.
2. **The generator:**
   - the manifest and its mirror types;
   - props by axis and branch, and forbidden props;
   - `components.json`, `llms.txt`, `llms-full.txt`, `docs/*.md`, and the README as
     `dist/USAGE.md`;
   - the files in `exports`, generated in tsdown's `build:before`;
   - determinism;
   - the data checks, including published-text rules on props JSDoc, which needs cleaning up;
   - the union-alias rule in CONVENTIONS rule 3.
3. **Storybook docs pages:**
   - the template and blocks, and the docs theme;
   - the gate on docs pages, run as pages;
   - published-text rules on story JSDoc.
4. **The GitHub Pages deploy:**
   - Pages source set to GitHub Actions, with Emil's OK;
   - unreleased builds stamped as unreleased.

## In-flight notes

- Day-one probes for PR 2: tsdown's publint against `build:before`; Vite's module runner loading the
  data files; props by axis.
- For PR 3: the docs theme in dark mode, including story iframes in WebKit; the gate seeing
  `#storybook-docs` after `docsRendered`.
- Exceptions: Dialog Fullscreen and LongContent, `color-contrast:incomplete`, expire 2027-04-27.
- Open for TextInput (deferred): the Home/End contract row isn't true on macOS.
- npm publishing comes after L10. Gaps: no npm login on this machine, no LICENSE in the packages,
  no `repository`/`homepage`/`bugs`.
- Untested readers: JAWS, VoiceOver and TalkBack.

## Next action

1. Emil reviews PR 1's content: the nine `.docs.ts` files and the contract rewrites (the agent's
   old→new list is in the session, and `git diff` shows it).
2. With Emil's OK, commit PR 1 and open it.
3. Then PR 2, the generator, starting with its three day-one probes.
