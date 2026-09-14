# am-consumer

Example consumer of `@washogren/am-dependency`. It is the harness that proves
`washogren/auto-update-dependencies` routes every SemVer bump type correctly,
end to end, against a real registry and real pull requests.

## The five tiers

`.github/workflows/end-to-end.yml` runs five tiers with **byte-identical** action
configuration. The outcome falls out of each branch's pinned version alone, which
is what makes this a test of the classifier and the two SemVer gates rather than
of five hand-written configs.

| Branch         | Pinned at                | Resolves to       | Classifies | Expected outcome                    |
| -------------- | ------------------------ | ----------------- | ---------- | ----------------------------------- |
| `e2e/patch`    | `M.1.0`                  | `M.1.1`           | patch      | PR opens and auto-merges itself     |
| `e2e/minor`    | `M.0.0`                  | `M.1.1`           | minor      | PR opens and stays open             |
| `e2e/update`   | `M.0.0`                  | `M.1.0` → `M.1.1` | minor ×2   | **one** PR, created then updated    |
| `e2e/major`    | last green run's `M.1.1` | `M.1.1`           | major      | no PR at all                        |
| `e2e/nochange` | `M.1.1`                  | `M.1.1`           | —          | `changed=false`, nothing happens    |

The shared config is:

```yaml
auto-merge: true
auto-merge-when-semver: patch # patch merges, minor does not
create-pr-when-semver: patch, minor # major opens nothing
```

Each gate is straddled by a **pair** of tiers — one it admits, one it rejects. A
single sample cannot distinguish a working gate from one stuck open, which is why
the tiers come in pairs rather than one per feature.

## Workflows

| File                                | What it does                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| `.github/workflows/end-to-end.yml`  | The five-tier harness. Dispatched by the action's own e2e at a given action ref. |
| `.github/workflows/test-pr.yml`     | Runs `npm test` on every PR and posts a sticky results comment. Its job is named `test` — load-bearing, the ruleset requires that exact name. |

There is a single `master` branch; the five `e2e/*` branches are recreated every
run.

## How a run works

1. **Phase 0** closes any leftover auto-update PRs and deletes their branches,
   then asserts the clear worked. This runs **unconditionally** at the *start* of
   a run — a cancelled run never reaches a cleanup step at the end, so tidying up
   afterwards is exactly the thing that fails when it matters.
2. Every version is derived from **one** dist-tag read, because a run publishes
   exactly `M.0.0` / `M.1.0` / `M.1.1` and nothing else.
3. Each tier branch is **deleted and recreated** from `master`, then seeded with
   its pin. Recreating the branch *is* the reset, so nothing from a prior run
   survives into the next one.
4. The tiers run in parallel; the update tier runs the action twice with its
   dist-tag advancing between passes.
5. The run succeeds only if every tier does.

## Why seeding deletes rather than force-pushes

The `protect-e2e` ruleset requires the `test` check on `refs/heads/e2e/*` so that
auto-merge has something to wait on — with nothing pending, GitHub rejects
`gh pr merge --auto` outright because the PR is already mergeable.

That same rule blocks a direct **update** to those branches, but its
`do_not_enforce_on_create` parameter exempts a **create**. Verified against this
repo: a create is allowed, an update is rejected with `push declined due to
repository rule violations`.

Deleting first therefore lets the harness seed with **no bypass actor** on the
ruleset — which matters, because a bypass broad enough to permit the push might
also let a merge skip the very check it exists to wait for.

## What the tests assert

`src/index.test.js` goes beyond "did it install":

- The version the dependency reports **about itself at runtime** must equal the
  pin in `package.json`. That catches a bump that rewrote text but resolved a
  different tarball — it tests dependency resolution, not string substitution.
- A public dependency (`ms`) sits beside the scoped one as a guard. If the action
  ever binds the private registry as a global default again, resolving it 404s
  and the tests fail before they run.

## Registry access

Bind **only the scope**, never a global default — a global default makes GitHub
Packages authoritative for every package, so public dependencies 404. This repo
therefore does not pass `registry-url` to `setup-node`; it writes a scoped
`.npmrc` instead:

```bash
printf '@washogren:registry=https://npm.pkg.github.com\n' > .npmrc
printf '//npm.pkg.github.com/:_authToken=%s\n' "$TOKEN" >> .npmrc
```

Note these keys cannot go through `export`. `npm_config_@washogren:registry` is
not a valid shell identifier — `@`, `:` and `/` are rejected — so bash fails at
parse time. The action gets away with the same key names because it passes them
through Node's process env, which has no such restriction.

## Required secrets

- **`E2E_TOKEN`** — PAT used by the harness to read the registry, push tier
  branches, and open/merge PRs.
- **`GH_PACKAGES_READ`** — PAT with `read:packages`, used by `test-pr.yml`.

The default `GITHUB_TOKEN` does **not** trigger downstream workflow runs on PRs
it creates (GitHub's loop prevention), so a real PAT is required or the
auto-update PRs never fire `test-pr.yml` — and then auto-merge has no check to
wait on.

## Local install for testing

```bash
printf '@washogren:registry=https://npm.pkg.github.com\n' > .npmrc
printf '//npm.pkg.github.com/:_authToken=%s\n' "$GITHUB_TOKEN" >> .npmrc
npm install && npm start
```

## History — what not to put back

This repo once inlined ~190 lines of bash and jq to do the bump-and-render
itself. That logic now lives in `washogren/auto-update-dependencies`. **Improve
the action, not this repo.**

It also once tracked three dist-tags (`dev`/`staging`/`prod`) from three branches,
with `master` publishing the tag named `prod`. That modelled a deployment pipeline
nothing actually tested, and cost a name mismatch plus a matrix encoding it. It
was removed deliberately.
