# 0022 — Manual a11y runs record a fingerprint of what they tested

- **Status:** Accepted
- **Date:** 2026-10-29
- **Deciders:** senakster (Emil's call while planning L10, 2026-10-28; no review required)
- **Affects modules:** L02, L08, L09, L10

## Context

A manual run (screen reader, keyboard, forced colours, …) certifies a component as it was when the
run happened. Before L10, `check-a11y-contracts.mjs` warned when the component's `.tsx` or `.css`
had been committed after the newest such run, by date. That was wrong in both directions:

- **It flagged edits that change nothing:** L09's JSDoc and contract-text edits made every
  component "changed since", and a moved file counts as a commit too.
- **It missed changes that matter:** shared code in `internal/` (`useFieldWiring`,
  `useNameCheck`), the stylesheets a component imports, and token values all changed behaviour
  without touching the component's own files.
- **It depended on git history:** squash merges rewrite dates, and a shallow checkout (CI) has
  none, so the check was skipped exactly where it mattered.

L10 makes a stale run an error at release, so the signal has to be right.

## Decision

- **Every manual run records `sourceHash`**, a required field of the L02 contract type for every
  method except `automated` (an automated run re-runs on every build and never goes stale). It
  amends L02's `TestRun`.
- **The fingerprint** (`packages/react/scripts/source-hash.mjs`) covers what changes behaviour:
  - the component's module and every `src` module it imports as a value, transpiled by the pinned
    TypeScript without types or comments, and without file paths, so a JSDoc, type-only or
    file-move edit doesn't count;
  - for a component its usage guidance places inside another (TextInput in FormField, Checkbox in
    CheckboxGroup), that parent's code and styles, since the parent wires it at runtime; and for
    the parent, those children's, since its runs heard them inside it;
  - its stylesheets, with their imports, without comments;
  - the resolved light, dark and reduced-motion values of every token those stylesheets read;
  - from the contract, what a run checks against: the quoted speech in `announces` (double quotes
    mark verbatim speech, CONVENTIONS rule 7), or the whole `announces` when it quotes nothing, each
    announcement's owner, mechanism and politeness, and each key binding's keys. The prose around
    quotes isn't behaviour.

  Stories aren't included.

- **Stamping:** `pnpm a11y:stamp <Name>` writes today's fingerprint into each unstamped manual run,
  after the run, never by hand. It refuses a run dated before today, whose stamp would vouch for
  later edits; `--date` does that deliberately. A TypeScript upgrade that changes transpile output
  changes every hash, and re-stamping is then a deliberate, reviewed commit.
- **Stale** means today's fingerprint differs from the run's. It is a warning on pull requests, and
  an error at release (`check-a11y-contracts.mjs --release`) unless a `stale-run` exception in
  `apps/docs/gate/exceptions.json` names the component, pinned to today's fingerprint, with a
  reason and an expiry at most six months out. Any further edit voids it.
- **Published:** `sourceChangedSince` in `components.json` compares fingerprints. A stale run is
  marked on its Test runs row, on each "Observed with …" line and each piece of evidence that cites
  it ("not re-tested since"), and Known issues adds "manual runs predate later changes".
- **Backfill, once (L10):** each existing run was stamped with the fingerprint at the commit that
  first recorded it. Its code, styles and tokens come from that commit; its contract and usage data
  come from today's tree, because L09 rewrote quote notation without changing what was heard, and
  `.docs.ts` didn't exist yet.

## Consequences

- No git history is needed after the backfill: a shallow checkout and a full one give the same
  answer.
- The fingerprint can't see a behaviour change that lives outside `src`, the stylesheets and the
  token values (a React upgrade, a browser change). A run's `packageVersion` and dates still
  record when it happened.
- The backfill found eight of nine components stale, for real changes (ADR-0013's explicit
  `aria-invalid`, the name check's label detection, field wiring); EmptyState is current. 1.0.0
  ships them with stale-run exceptions (L10 decision 6), and their docs say so.
- **Revisit when:** a stale flag turns out to be noise (a part the fingerprint shouldn't cover), a
  run must cover something outside it (a composition not in `.docs.ts`), or manual runs move to
  tooling that records what it tested itself.
