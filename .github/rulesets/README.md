# Rulesets

Branch rules for `main`, kept here as the JSON GitHub's REST API takes. **Applied** since
2026-10-26, when the repository went public (ruleset `main`, id `25892694`, enforcement `active`).
The live ruleset matches this file; [CONTRIBUTING.md](../../CONTRIBUTING.md), "Branches and pull
requests", is the same rules in prose.

This file is the source. Change the ruleset by editing it and applying it (below), never in
Settings alone, or the two drift apart.

## What [`main.json`](main.json) enforces

| Rule                       | Setting                                                                   |
| -------------------------- | ------------------------------------------------------------------------- |
| Pull request required      | 0 approvals: GitHub doesn't let a sole maintainer approve their own PR    |
| Conversations resolved     | Every review thread resolved before merging                               |
| Merge method               | Squash only: one commit per PR on `main`                                  |
| Required check             | `verify` (the CI job in `.github/workflows/ci.yml`), branch up to date    |
| Linear history             | No merge commits                                                          |
| No force-push, no deletion | `main` can't be rewritten or deleted                                      |
| Bypass                     | Nobody, admins included. Disable the ruleset in Settings for an emergency |

`integration_id: 15368` is the GitHub Actions app, so only a check reported by Actions satisfies
`verify`. If the CI job is renamed, rename the check here too, or every PR stays blocked.

## Applying it

```sh
gh api -X PUT repos/senakster/senui/rulesets/25892694 --input .github/rulesets/main.json
```

To check that the live ruleset still matches this file, compare `rules`, `conditions`,
`bypass_actors` and `enforcement` from `gh api repos/senakster/senui/rulesets/25892694` with the
JSON here. `required_reviewers` and `require_extra_approval_for_unattributed_changes` are in the
file because GitHub returns them with these values whether or not they were sent; listing them keeps
the comparison exact.

On a fresh repository, create it instead:
`gh api -X POST repos/senakster/senui/rulesets --input .github/rulesets/main.json`.

## Repository settings

Squash-only is also a repository setting, and pairs with deleting merged branches. **Not applied
yet:** the repository still allows merge and rebase merges (the ruleset blocks them on `main`
anyway) and keeps merged branches. L10's release PR applies it with the other repository settings:

```sh
gh api -X PATCH repos/senakster/senui \
  -F allow_squash_merge=true -F allow_merge_commit=false -F allow_rebase_merge=false \
  -F delete_branch_on_merge=true \
  -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=PR_BODY
```
