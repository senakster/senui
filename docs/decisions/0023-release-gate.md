# 0023 — The full gate runs for every release, never per push

- **Status:** Accepted
- **Date:** 2026-10-29
- **Deciders:** senakster (Emil's calls while planning L10, 2026-10-28; no review required)
- **Affects modules:** L08, L10

## Context

L08 split the a11y gate in two: pull requests run it in Chromium (`ci.yml`), and `gate-full.yml`
ran Chromium, Firefox and WebKit, plus the React 18.3 job, on every push to `main`. On 2026-10-28
that workflow was disabled on GitHub for budget, so the three engines and React 18.3 have been
checked locally since, by hand, with nothing tying them to what is published.

L10 publishes to npm. A release is the one point where every engine has to have passed, over
exactly the build that ships, and a disabled toggle is no way to hold a budget: it can be switched
back on, and it stops a release gate as well as a per-push one.

## Decision

- **`gate-full.yml` loses `push`, keeps `workflow_dispatch` and gains `workflow_call`.** The budget
  hold now comes from its triggers, so the workflow is re-enabled on GitHub. Its concurrency is
  keyed on the calling workflow and never cancels, so a manual run can't cancel a release.
- **Called by `release.yml` with `release: true`, it is the release gate,** in the pinned Playwright
  container:
  - `pnpm check` (with the API diff and the publish checks) and `pnpm test`;
  - the stale-run check as an error (`check-a11y-contracts.mjs --release`, ADR-0022);
  - the gate in all three engines, over a Storybook built with `SENUI_RELEASE=1`, so the gated pages
    are the published ones;
  - the React 18.3 job, with its browser project in all three engines.
- **Only after all of them pass** does it pack the tarballs, once, as the release build, and upload
  them. `release.yml`'s `publish` job publishes exactly those, and only if the gate succeeded.
- **A push with nothing to release runs `detect` only.** The gate runs for a version on `main` that
  npm lacks or whose tag is missing, never for `0.0.0`.
- **The probe is cheap:** `release.yml` dispatched with `probe: fail` on a throwaway branch replaces
  the gate with one failing job, and shows that nothing after it runs. The three-engine run is never
  spent on a probe.

## Consequences

- Every release costs one three-engine run and one React 18.3 run. A first publish costs two (the
  release commit, then the dispatch that tags and deploys after the manual publish).
- Between releases, Firefox, WebKit and React 18.3 are still unchecked in CI; a regression there is
  found at the next release, or by a manual dispatch of `gate-full.yml`.
- **Revisit when:** the budget allows a per-push or scheduled run again, a regression ships that a
  per-push run would have caught, or a release's gate takes so long that releasing gets avoided.
