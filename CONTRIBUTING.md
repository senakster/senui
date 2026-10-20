# Contributing to senui

How the repository is laid out, how to run it, and what every change has to pass. The rules for a
component's public API are in [`packages/react/CONVENTIONS.md`](packages/react/CONVENTIONS.md); the
decisions behind them are in [`docs/decisions/`](docs/decisions/).

## Setup

You need Node 24 (see `.node-version`) and pnpm 12.3.4 (pinned in `package.json`; `corepack enable`
provides it).

```sh
pnpm install
pnpm --filter @senakster/react exec playwright install chromium   # once per machine, for browser tests
pnpm build                                                        # lint and the docs app read built output
```

Then:

```sh
pnpm check                         # the gate: must pass before anything is done
pnpm test                          # unit, type, contract and browser tests
pnpm --filter docs storybook       # http://localhost:6006
```

## Scripts

| Command                 | What it does                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| `pnpm check`            | Build + typecheck, ESLint, Stylelint, `check:components`, Prettier check, in that order          |
| `pnpm test`             | Vitest in both packages: unit tests (jsdom), type tests, a11y-contract checks, browser tests     |
| `pnpm build`            | Tokens (Style Dictionary, then tsdown) and components (tsdown); publint fails a broken `exports` |
| `pnpm lint`             | ESLint on everything, Stylelint on component CSS                                                 |
| `pnpm check:components` | Every component has a valid a11y contract; CSS is layered; built CSS imports resolve             |
| `pnpm format`           | Prettier, write                                                                                  |
| `pnpm changeset`        | Describe a change for the changelog and version bump                                             |
| `pnpm sync:wcag`        | Regenerate the WCAG 2.2 table from W3C's published data (by hand, rarely)                        |

## Layout

```
packages/tokens/        DTCG token source → tokens.css + typed map (see its README)
packages/react/
  src/components/<Name>/  one folder per component (CONVENTIONS.md, "File layout")
  src/internal/           shared hooks, the a11y contract type, test helpers; never exported
  src/styles/             the CSS entry and layer order
  src/types.ts            public utility types
apps/docs/              Storybook; component stories live next to their components
scripts/                the check scripts behind `pnpm check:components`, and sync-wcag
docs/decisions/         architecture decision records (ADRs)
docs/implementation-log/  progress, per-module scope decisions, session log
OVERRIDES.md            every reviewer suggestion that was rejected or changed, and why
```

Generated, don't edit by hand: `packages/*/dist/`, `packages/tokens/src/generated/` (gitignored),
and `packages/react/src/internal/a11y/wcag.ts` (`pnpm sync:wcag`).

## How work is organised

The library is built module by module (L00 workspace, L01 tokens, L02 conventions, L03 Button, …),
in order. Status is in [`docs/PROGRESS.md`](docs/PROGRESS.md); what was ruled in or out, and why,
is in [`docs/implementation-log/scope-decisions.md`](docs/implementation-log/scope-decisions.md).

Components are written by a person and reviewed by agents (API, accessibility, modern-web
reviewers), so every line of public API has an owner who can defend it. Tooling, CI and check
scripts may be written by agents and reviewed by a person. A reviewer finding that is rejected or
materially changed gets a row in [`OVERRIDES.md`](OVERRIDES.md), with the reason.

## Adding or changing a component

1. Read [`CONVENTIONS.md`](packages/react/CONVENTIONS.md). It covers props, types, CSS, refs,
   state, ids, deprecation and what counts as public API, and names the check behind each rule.
2. Write the files listed there: component, CSS, a11y contract, unit tests, browser tests, type
   tests, stories.
3. Export the component from `src/index.ts`, and import its CSS from `src/styles/index.css`.
4. Test it by hand with a keyboard and a screen reader, and record the runs in the contract's
   `testedWith` (assistive technology, browser, OS, versions). The contract test fails without
   them, and `pnpm check` warns when the component changes after its last manual run.
5. Add a changeset: `pnpm changeset`.

Component CSS uses tokens only. Stylelint rejects raw colours, units outside `%`, `fr`, `ch`, `deg`
and `turn`, raw font and z-index values, and selectors more specific than `0,1,0` outside
`:where()`. If a value has no token, add one to `@senakster/tokens` rather than disabling the rule.

## Decisions

A choice that shapes public API, styling, accessibility or the release process is an ADR in
[`docs/decisions/`](docs/decisions/) (template in its README). Each names what it rejected, what it
costs, and the condition that would reopen it. Accepted ADRs are locked; changing one takes a new ADR
that supersedes it. A new dependency needs an ADR naming the native alternative it beat.

## Things that will surprise you

- **TypeScript is pinned to 6.0 and ESLint to 9** on purpose: they are the ceilings of
  typescript-eslint and eslint-plugin-jsx-a11y. Check those peer ranges before bumping either.
- **pnpm enforces a minimum release age.** A version published in the last few days won't install.
  Pin an older one, or add a commented exception to `minimumReleaseAgeExclude` in
  `pnpm-workspace.yaml`.
- **On a fresh clone, `pnpm lint` fails until you've built once**: the docs app type-checks against
  the built token package. `pnpm check` builds first.
- **Browser tests need Chromium** (setup step above). A `*.browser.test.tsx` file runs in a real
  browser; anything that measures layout or `:focus-visible` belongs there, because jsdom measures
  every box as 0.
- **Vitest's persistent module cache is off** in `packages/react`, so the contract test sees a new
  component on the very next run.
- **No client, employer or third-party brand names** in code, docs, stories, fixtures or commit
  messages. The one exception is `testedWith` data in a11y contracts, which names the assistive
  technology and browser actually tested.

## Branches and pull requests

`main` only changes through a pull request:

1. Branch from `main` (`feature/<module>-<topic>`, `fix/<topic>`, `docs/<topic>`).
2. Push and open a PR. Its title becomes the commit message on `main`, so write it as one.
3. Wait for the `verify` check to pass, with the branch up to date with `main`, and resolve every
   review conversation.
4. **Squash and merge.** Nobody pushes to `main` directly or force-pushes it, admins included.

These rules are written down in [`.github/rulesets/main.json`](.github/rulesets/main.json). GitHub
doesn't enforce them yet: rulesets need a public repository or GitHub Pro, and this one is private.
Until it is enforced, follow it by hand.

## CI

Every pull request and every push to `main` runs `pnpm check`, installs Chromium, runs `pnpm test`,
and builds Storybook ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)). The job is called
`verify`, and the ruleset requires that name.
