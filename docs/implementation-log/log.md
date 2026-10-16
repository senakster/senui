# Implementation log

Append-only session log, **chronological (newest at the bottom)**. One entry per `implement-module`
run or stopping point. This is the narrative of _how_ the implementation progressed; the
current state lives in `checkpoint.md` and authoritative status in `docs/PROGRESS.md`.

Entry format: date — module · Did · Verified · Scope decisions · Plan adjustments · Overrides
(accepted / rejected / escalated findings) · Next.

---

## 2026-10-15 — setup

- **Did:** Bootstrapped with `/modular-web:new-project --profile library`. Vendored 6 plans (PLAN, L00–L04) to gitignored `.catalogue/`; wrote `.catalogue-sync.json`, `docs/PROGRESS.md`, implementation log, `docs/decisions/` index, `.catalogue-decisions.json`, `OVERRIDES.md`, `CLAUDE.md`.
- **Verified:** `catalogue-status` all current; `.catalogue/` and `.catalogue-decisions/` ignored; decision index builds.
- **Scope decisions:** none
- **Plan adjustments:** none
- **Overrides:** none
- **Next:** start L00 via `/modular-web:implement-module`.

## 2026-10-15 — L00 Workspace, harness & CI

- **Did:** Scaffolded the pnpm workspace (pnpm 12.3.4), `tsconfig.base.json`, a flat ESLint config (typescript-eslint strictTypeChecked, jsx-a11y strict, react-hooks, storybook, prettier), Prettier, both packages with tsdown builds, the Vitest/jsdom/Testing Library harness, the Storybook 10 shell, Changesets, `ci.yml` and `.claude/workflows/review-component.js`. Wrote ADR-0003 (tsdown). Brought the ADR index and CLAUDE.md's locked-decisions table up to date, and removed duplicate 0001/0002 index rows.
- **Verified:** `pnpm check` green, including after a clean `pnpm install --frozen-lockfile` (fresh-clone simulation). `pnpm test`, `pnpm build` and `pnpm --filter docs build-storybook` green. Probes: publint fails the build on a broken `exports` path; a throwaway JSX test passes under Vitest and `tsc`, then was deleted. `pnpm format` left `catalogue-status` all current. The `.catalogue/` and `.catalogue-decisions/` directories are ignored. The decision index has 0 unparsed records and returns ADR-0003 with its revisit trigger.
- **Scope decisions:** tsdown over tsup (ADR-0003). "CI green on a PR" deferred until there is a remote. TypeScript pinned to 6.0 and ESLint to 9 because of peer ceilings. React 19.3.1 excluded from pnpm's release-age gate as an apparent security release.
- **Plan adjustments:** L00's open question on the build tool is resolved by ADR-0003. The vendored plan still lists it as open.
- **Overrides:** none (no reviewer run; L00 is agent work for Emil to review).
- **Next:** Emil reviews the L00 scaffold and makes the first commit. Then `/modular-web:implement-module` starts L01 (design tokens).

## 2026-10-16 — L01 Design tokens (pipeline)

- **Did:** Found L00 committed (`21bdba2`) with a GitHub remote and a green first CI run. Read the run's log to confirm the steps did real work, then closed L00's deferred CI row. Found that ADR-0002's revisit trigger had fired (Style Dictionary 5, DTCG 2025.10 stable) and wrote ADR-0004, which supersedes it. Built `packages/tokens/sd.config.mjs`: three Style Dictionary passes (base, dark, reduced motion), oklch-preserving colour and unit transforms, `light-dark()` pairing, primitives filtered out, the CSS and TS output, and a CLI. Built `contrast.mjs` (WCAG 2.1 in sRGB, composited and gamut-mapped). Added the hand-written `Token` type and the `./tokens.css` export; tsdown copies the CSS. Added 12 pipeline tests, a Tokens docs page (`apps/docs/src/tokens/`), and `packages/tokens/README.md` documenting the source contract.
- **Verified:** `pnpm check`, `pnpm test` (tokens 12/12) and build-storybook are green, and the Tokens page is in the Storybook index. A smoke test of the real CLI with a temporary on-disk fixture confirmed: two builds are byte-identical; `light-dark(` count 2 = 2 colour tokens; no `primitive` anywhere in `dist`; no primitive refs in `packages/react/src`; and a contrast miss exits 1 naming the token, the background, the theme and the ratio. The fixture was removed. `npm pack --dry-run` lists only `README.md`, `dist/*` and `package.json`.
- **Scope decisions:** oklch; primitives not emitted; Emil writes the token values. ADR-0004 replaces Style Dictionary v4 with v5. See scope-decisions.md § L01.
- **Plan adjustments:** the primitive guard grep is adapted to the new naming. ADR-0004's code-size trigger was corrected before commit: it was drafted at about 150 lines, and the code at adoption is about 245 (including the shadow fix below), so it is now about 300.
- **Later the same day:** at Emil's request, added `packages/tokens/examples/example.tokens.json`: a complete example token set, not built or shipped, and kept valid by `test/example.test.mjs`. It exposed a pipeline bug: the stock shadow shorthand inlined the light colour, so elevation ignored dark mode. It is replaced by `senui/shadow/css`, which emits `var(--senui-color-…)` for a shadow colour that references a public token, and is covered by a regression test. Tokens tests: 14/14.
- **Overrides:** none.
- **Next:** Emil writes `packages/tokens/src/*.tokens.json` (brief in checkpoint.md). Then rerun `/modular-web:implement-module` to verify the contrast and reduced-motion criteria against the real tokens, run `modern-web-curator` on names and values and `wcag-auditor` on the contrast pairs, and mark L01 done.
