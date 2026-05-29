# am-consumer

Example consumer that depends on `@washogren/am-dependency`. Demonstrates dist-tag tracking via the GitHub Actions shim in `.github/workflows/track-dist-tags.yml`.

## Branch-to-tag mapping

| Consumer branch | Tracks dist-tag |
|-----------------|-----------------|
| dev             | dev             |
| staging         | staging         |
| master          | prod            |

The shim runs every 15 minutes (and on manual trigger). Each `(branch, tag)` pair runs as an independent matrix job that resolves the tag to a concrete version, updates `package.json`, and opens a PR against the matching branch.

## Setup

1. Create a private repo `am-consumer` on your personal GitHub account.
2. Replace `washogren` everywhere with your GitHub username:
   - `package.json` (name, dependency)
   - `src/index.js` (require)
   - `.github/workflows/track-dist-tags.yml` (package name, scope)
3. Set the initial dependency version in `package.json` to a version that actually exists in your registry. The first publish from `am-dependency` will be `1.0.0-prod.1` (or similar) — update the `dependencies` entry to match.
4. Add a repo secret `GH_PACKAGES_READ` set to a PAT with `read:packages` scope.
5. Push the three branches:
   ```bash
   git remote add origin git@github.com:<your-username>/am-consumer.git
   git push origin master
   git push origin staging
   git push origin dev
   ```

## Verify

After the first scheduled run (or after triggering the workflow manually via the Actions tab):

1. Push a change to `am-dependency` on `dev`. Wait for its publish workflow to finish.
2. Trigger the `am-consumer` `Track am-dependency dist-tags` workflow manually.
3. A PR should open against `am-consumer`'s `dev` branch bumping the dependency to the new version.
4. Merge the PR. Run `npm install && npm start` locally to confirm the new dependency version is in use:
   ```
   am-consumer CLI
   ---------------
   consumer version:    1.0.0
   dependency version:  1.0.0-dev.2
   greeting:            Hello, consumer! (from am-dependency v1.0.0-dev.2)
   add(2, 3):           5
   ```

## Local install for testing

```bash
echo "//npm.pkg.github.com/:_authToken=$GITHUB_TOKEN" >> ~/.npmrc
echo "@<your-username>:registry=https://npm.pkg.github.com" >> ~/.npmrc
npm install
npm start
```
