# Releasing

How I do releases for this project.

## Before releasing

Run the checks:

```bash
npm run test:run && npm run test:e2e
npm run lint
npm run format:check
npm run build
```

Update `CHANGELOG.md` with what changed.

## Doing the release

```bash
# Bump version in package.json
npm version X.Y.Z --no-git-tag-version

# Commit everything
git add -A
git commit -m "chore: release vX.Y.Z"

# Tag it
git tag -a vX.Y.Z -m "Release vX.Y.Z"

# Push
git push origin develop
git push origin vX.Y.Z
```

Then go to GitHub → Releases → Draft a new release, pick the tag, paste the CHANGELOG section.

## Service worker cache

The cache version is auto-generated at build time:
- CI builds: `commit-<sha>`
- Local builds: `build-<timestamp>`

Old caches get cleaned up automatically.

## If something breaks in production

```bash
# Hotfix branch from the last good tag
git checkout -b hotfix/X.Y.Z vX.Y.Z

# Fix it, test it
npm run test:all

# Merge back
git checkout develop
git merge hotfix/X.Y.Z
git tag -a vX.Y.Z -m "Hotfix vX.Y.Z"
git push origin develop vX.Y.Z
```

## Version scheme

Semver: MAJOR.MINOR.PATCH
- Major = breaking changes
- Minor = new features
- Patch = bug fixes

The service worker cache version is separate and managed automatically.
