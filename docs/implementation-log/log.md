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
