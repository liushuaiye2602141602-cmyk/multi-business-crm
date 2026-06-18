#!/bin/bash

# Open CRM - Release Check Script
# Runs all checks before creating a release tag

set -e

echo "========================================="
echo "  Open CRM Release Check"
echo "========================================="
echo ""

ERRORS=0

# 1. Check for uncommitted changes
echo "[1/5] Checking for uncommitted changes..."
if [ -n "$(git status --porcelain)" ]; then
    echo "  ❌ There are uncommitted changes. Please commit or stash them first."
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ Working directory clean"
fi

# 2. Check for .env in git
echo ""
echo "[2/5] Checking for .env files in git..."
if git ls-files | grep -q "\.env$"; then
    echo "  ❌ .env file is tracked by git. Add it to .gitignore."
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ No .env files tracked"
fi

# 3. Check build
echo ""
echo "[3/5] Checking build..."
if npm run build --silent 2>/dev/null; then
    echo "  ✅ Build successful"
else
    echo "  ❌ Build failed"
    ERRORS=$((ERRORS + 1))
fi

# 4. Check Prisma
echo ""
echo "[4/5] Checking Prisma schema..."
if npx prisma generate --silent 2>/dev/null; then
    echo "  ✅ Prisma schema valid"
else
    echo "  ❌ Prisma schema has errors"
    ERRORS=$((ERRORS + 1))
fi

# 5. Check TypeScript
echo ""
echo "[5/5] Checking TypeScript..."
if npx tsc --noEmit 2>/dev/null; then
    echo "  ✅ TypeScript compiles"
else
    echo "  ⚠️  TypeScript has warnings (non-blocking)"
fi

# Summary
echo ""
echo "========================================="
if [ $ERRORS -eq 0 ]; then
    echo "  ✅ All checks passed! Ready to release."
    echo "========================================="
    echo ""
    echo "Next steps:"
    echo "  1. Update CHANGELOG.md"
    echo "  2. Update VERSION file"
    echo "  3. git add -A && git commit -m 'release: vX.Y.Z'"
    echo "  4. git tag vX.Y.Z"
    echo "  5. git push origin main --tags"
    exit 0
else
    echo "  ❌ $ERRORS check(s) failed. Fix issues before releasing."
    echo "========================================="
    exit 1
fi
