# Rulesets

Branch rules for `main`, kept here as the JSON GitHub's REST API takes. **Not applied yet:** GitHub
offers rulesets only on public repositories or with GitHub Pro, and this repository is private on a
free account (decided 2026-10-17). Until then the rules are followed by convention (see
[CONTRIBUTING.md](../../CONTRIBUTING.md), "Branches and pull requests").

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

Once the repository is public or on GitHub Pro:

```sh
gh api -X POST repos/senakster/senui/rulesets --input .github/rulesets/main.json
```

To change it later, find its id with `gh api repos/senakster/senui/rulesets`, then
`gh api -X PUT repos/senakster/senui/rulesets/<id> --input .github/rulesets/main.json`.

Squash-only is also a repository setting, which works on any plan, and pairs with deleting merged
branches:

```sh
gh api -X PATCH repos/senakster/senui \
  -F allow_squash_merge=true -F allow_merge_commit=false -F allow_rebase_merge=false \
  -F delete_branch_on_merge=true \
  -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=PR_BODY
```
