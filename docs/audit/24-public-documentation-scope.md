# Documentation Audit: Public vs Internal Documentation Scope

**Document ID:** 24  
**Created:** 2026-06-19  
**Purpose:** Classify all documentation files as PUBLIC (open-source release) or INTERNAL (not for public release).

---

## Summary

| Category | Public | Internal | Total |
|----------|--------|----------|-------|
| Getting Started | 7 | 0 | 7 |
| User Guide | 13 | 0 | 13 |
| Admin Guide | 10 | 0 | 10 |
| Email Configuration | 12 | 0 | 12 |
| AI Configuration | 5 | 0 | 5 |
| API Documentation | 7 | 0 | 7 |
| Deployment | 7 | 0 | 7 |
| Data & Backup | 4 | 1 | 5 |
| Developer | 10 | 0 | 10 |
| Security | 4 | 0 | 4 |
| Architecture | varies | varies | varies |
| Community | 1 | 0 | 1 |
| Troubleshooting | 6 | 0 | 6 |
| Audit (this section) | 1 | 13 | 14 |
| Releases | varies | varies | varies |
| **TOTAL** | **~87** | **~14** | **~101** |

---

## PUBLIC Documentation (Included in Open-Source Release)

These documents are safe for public release. They contain no secrets, internal paths, or proprietary references.

### Root-Level Files
| File | Status | Notes |
|------|--------|-------|
| `README.md` | PUBLIC | Chinese README |
| `README.en.md` | PUBLIC | English README |
| `CHANGELOG.md` | PUBLIC | Version history |
| `CODE_OF_CONDUCT.md` | PUBLIC | Community standards |
| `CONTRIBUTING.md` | PUBLIC | Contribution guide |
| `LICENSE` | PUBLIC | MIT License |
| `ROADMAP.md` | PUBLIC | Feature roadmap |
| `SECURITY.md` | PUBLIC | Security policy |
| `VERSION` | PUBLIC | Current version string |

### docs/getting-started/
All 7 files are PUBLIC. They cover installation, configuration, and first-run steps using generic examples.

### docs/user-guide/
All 13 files are PUBLIC. Feature documentation with no sensitive data.

### docs/admin-guide/
All 10 files are PUBLIC. Admin procedures using generic role/permission examples.

### docs/email/
All 12 files are PUBLIC. Email setup guides reference provider documentation only.

### docs/ai/
All 5 files are PUBLIC. AI configuration using generic API key placeholders.

### docs/api/
All 7 files are PUBLIC. API documentation with virtual/example data only.

### docs/deployment/
All 7 files are PUBLIC. Deployment guides with generic server examples.

### docs/developer/
All 10 files are PUBLIC. Architecture and code structure documentation.

### docs/security/
All 4 files are PUBLIC. Security practices and checklists.

### docs/community/
All 1 files are PUBLIC. Maintainer guide.

### docs/troubleshooting/
All 6 files are PUBLIC. Common issues and solutions.

### docs/api/openapi-partial.yaml
PUBLIC. OpenAPI spec with virtual data only.

### docs/en/README.md
PUBLIC. English documentation index.

### docs/assets/screenshots/
PUBLIC. Screenshot directory with naming convention guide.

---

## INTERNAL Documentation (NOT Included in Public Release)

These documents contain internal audit data, local paths, or operational details not suitable for public distribution.

### docs/audit/ (Internal)

| File | Status | Reason |
|------|--------|--------|
| `01-feature-inventory.md` | INTERNAL | Internal feature audit with completeness ratings |
| `06-disk-usage-summary.md` | INTERNAL | Developer disk usage data |
| `09-safe-cleanup-candidates.md` | INTERNAL | Cleanup recommendations |
| `11-git-size-audit.md` | INTERNAL | Repository size analysis |
| `12-dependency-size-audit.md` | INTERNAL | Package size analysis |
| `13-project-health-summary.md` | INTERNAL | Internal health metrics |
| `14-cleanup-execution-report.md` | INTERNAL | Execution log of cleanup operations |
| `15-missing-components-audit.md` | INTERNAL | Gap analysis |
| `16-database-storage-location.md` | INTERNAL | May contain local path references |
| `17-docker-data-persistence.md` | INTERNAL | Local Docker config details |
| `18-file-storage-location.md` | INTERNAL | Local file path references |
| `19-storage-risk-and-recommendation.md` | INTERNAL | Internal risk assessment |
| `20-backup-and-recovery-audit.md` | INTERNAL | Internal backup procedures |
| `21-data-persistence-summary.md` | INTERNAL | Internal data flow documentation |
| `24-public-documentation-scope.md` | PUBLIC | This document |

### docs/releases/ (Internal)
Release notes and versioning documentation may contain internal deployment details. Review case-by-case before public inclusion.

### docs/data/ (Mixed)

| File | Status | Reason |
|------|--------|--------|
| `01-data-storage.md` | PUBLIC | Generic storage overview |
| `02-postgresql.md` | PUBLIC | PostgreSQL setup guide |
| `04-backup.md` | PUBLIC | Backup procedures |
| `05-restore.md` | PUBLIC | Restore procedures |
| `06-migration.md` | PUBLIC | Migration guide |

---

## Pre-Release Checklist

Before publishing the repository publicly, verify:

- [ ] No `.env` files committed
- [ ] No API keys or secrets in any documentation
- [ ] No local file paths (`D:\...`, `C:\Users\...`) in any PUBLIC doc
- [ ] No internal tool references (competitor names, internal URLs)
- [ ] All screenshot filenames follow naming convention (see `docs/assets/screenshots/`)
- [ ] Default test credentials clearly marked as non-production
- [ ] `docs/audit/` directory excluded or clearly marked as internal
- [ ] `docs/releases/` reviewed for internal references
- [ ] `.gitignore` excludes `.env`, `.env.local`, `node_modules/`, `.next/`

---

## Guidelines for Future Documentation

1. **New public docs** should be placed in the appropriate section under `docs/` and cross-linked from both `docs/README.md` and `docs/en/README.md`.
2. **Internal audit docs** should use the `docs/audit/` prefix and be excluded from public release.
3. **All examples** in public docs must use virtual data (e.g., `admin@example.com`, `Acme Corporation`).
4. **Screenshots** must follow the naming convention in `docs/assets/screenshots/README.md`.
5. **Before merging** any documentation PR, run the `docs-check` CI workflow to scan for sensitive data.
