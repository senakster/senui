# Changesets

Every change to a published package (`@senakster/senui-tokens`, `@senakster/senui`) ships with a
changeset. Run `pnpm changeset`, pick the bump, and describe the change for consumers. Removing or
renaming a prop, export, class or public token is a major bump, and it must be preceded by a
deprecation release (library principle 7).
