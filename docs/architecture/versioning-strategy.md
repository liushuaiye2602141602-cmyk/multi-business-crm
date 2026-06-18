# Versioning Strategy

## Semantic Versioning

This project follows [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html):

```
vMAJOR.MINOR.PATCH
```

### Version Number Rules

| Change Type | Version Bump | Example |
|------------|-------------|---------|
| **MAJOR** — Breaking changes, architecture overhaul | Increment major | v1.0.0 → v2.0.0 |
| **MINOR** — New features, new modules (backward compatible) | Increment minor | v0.1.0 → v0.2.0 |
| **PATCH** — Bug fixes, security patches (backward compatible) | Increment patch | v0.1.0 → v0.1.1 |

### Pre-1.0 Development (v0.x.y)

During v0.x.y, the API is not considered stable. Minor versions may include breaking changes.

- `v0.1.0` — Open Source Initial Release
- `v0.2.0` — User authentication + role-based access
- `v0.3.0` — Enhanced reporting + dashboard improvements
- `v1.0.0` — Stable release, production-ready

## Release Rules

### Mandatory Rules

1. **No unversioned code in production** — Every release must have a Git tag
2. **All features must be documented** — CHANGELOG.md must be updated before release
3. **All releases must pass checks** — Run `scripts/release-check.sh` before tagging
4. **Hotfixes must be patched** — Hotfix branches merge to both main and develop

### Branch Strategy

```
main ────────────────────────────────────────── (stable releases)
  ↑
  │ (merge + tag)
develop ─────────────────────────────────────── (integration)
  ↑         ↑         ↑
  │         │         │
feature/   feature/   feature/               (individual features)
```

- `main` — Only receives merges from develop or hotfix. Always deployable.
- `develop` — Integration branch. All features merge here first.
- `feature/*` — Individual feature branches. Branch from develop, merge back to develop.
- `hotfix/*` — Emergency fixes. Branch from main, merge to both main and develop.

### Release Process

1. Feature freeze on develop
2. Run release check: `bash scripts/release-check.sh`
3. Update CHANGELOG.md
4. Update VERSION file
5. Create release branch: `git checkout -b release/v0.2.0`
6. Final testing
7. Merge to main: `git checkout main && git merge release/v0.2.0`
8. Tag: `git tag v0.2.0`
9. Merge back to develop: `git checkout develop && git merge release/v0.2.0`
10. Push: `git push origin main --tags`

### Hotfix Process

1. Create hotfix branch: `git checkout -b hotfix/v0.1.1 main`
2. Fix the issue
3. Update CHANGELOG.md and VERSION
4. Merge to main: `git checkout main && git merge hotfix/v0.1.1`
5. Tag: `git tag v0.1.1`
6. Merge to develop: `git checkout develop && git merge hotfix/v0.1.1`
7. Push: `git push origin main --tags`

## Version History

| Version | Date | Description |
|---------|------|-------------|
| v0.1.0 | 2026-06-18 | Open Source Initial Release |
