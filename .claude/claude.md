# Neo4j Finance Frontend - Project Workflows

**Internal tool for uploading banking data to Neo4j with TDD approach**

---

## 📋 Issue-Based Development Workflow

### Starting a New Issue

1. **Read the issue definition**
   ```bash
   cat issues/XXX.md
   ```
   - Understand objectives and dependencies
   - Review RED/GREEN/REFACTOR phases
   - Check acceptance criteria

2. **Ensure previous issue is complete**
   - ⚠️ **BLOCKER**: Cannot start Issue N until Issue N-1 is merged
   - Verify previous issue moved to `issues/completed/`

3. **Create feature branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b issue/XXX-short-description
   ```

4. **Follow TDD Cycle**
   - **RED**: Write failing tests first
   - **GREEN**: Write minimal code to pass tests
   - **REFACTOR**: Improve code while keeping tests green
   - Commit after each phase

5. **Pre-commit hook runs automatically**
   - Type-check (`tsc --noEmit`)
   - Lint (`npm run lint`)
   - Tests with 100% coverage (`npm run test:coverage`)
   - **Cannot commit if any check fails**

---

### Completing an Issue

1. **Push and create PR**
   ```bash
   git push -u origin issue/XXX-short-description
   gh pr create --title "Issue XXX: [Description]"
   ```

2. **Wait for CI checks**
   - Type-check ✓
   - Build ✓
   - (Tests already validated locally via pre-commit)

3. **Get PR approval and merge**
   ```bash
   gh pr merge --squash
   ```

4. **Mark issue as complete**
   ```bash
   git checkout main
   git pull origin main
   mv issues/XXX.md issues/completed/
   git add issues/
   git commit -m "chore: mark Issue XXX as complete"
   git push origin main
   ```

5. **Clean up local branch**
   ```bash
   git branch -d issue/XXX-short-description
   ```

6. **Proceed to next issue** (only after previous one merged!)

---

## 🧪 Testing Requirements

### Coverage Rules

**100% coverage enforced for:**
- All `lib/*` utilities (business logic)
- All API routes (`app/api/*`)
- All components with logic
- All custom hooks

**Excluded from coverage:**
- `app/**` - Next.js App Router pages (boilerplate for Issue 001)
- `lib/utils.ts` - shadcn/ui utility (boilerplate)
- `components/ui/**` - shadcn/ui components (third-party)
- `**/*.d.ts` - Type definitions
- `*.config.*` - Configuration files
- `node_modules/`, `.next/`, `coverage/`, `issues/`

**Note**: Starting with Issue 002, all new business logic requires 100% coverage.

### Running Tests

```bash
# Watch mode (during development)
npm test

# Coverage report
npm run test:coverage

# Visual UI
npm test:ui

# Type-check only
npm run type-check

# Lint only
npm run lint

# Full build
npm run build
```

---

## 📁 Project Structure

```
neo4j-finance-frontend/
├── issues/                       # Pending issues (002-027)
│   └── completed/                # Finished issues (001)
├── app/                          # Next.js App Router
│   ├── api/                      # API routes (Issues 013-017)
│   └── [routes]/                 # Pages (Issues 024-026)
├── components/
│   └── ui/                       # shadcn/ui components
├── lib/                          # Business logic (Issues 002-012)
├── __tests__/
│   ├── unit/                     # Unit tests
│   └── integration/              # Integration tests
├── .husky/
│   └── pre-commit                # Quality enforcement
├── .github/
│   ├── workflows/ci.yml          # Type-check + Build
│   └── PULL_REQUEST_TEMPLATE.md
└── PROJECT_PLAN.md               # Overall status
```

---

## 🔄 Git Workflow Summary

```
main (protected)
  ├── issue/001-project-setup     [MERGED ✓]
  ├── issue/002-neo4j-connection  [NEXT]
  ├── issue/003-csv-parser
  └── ...
```

**Rules:**
- Always branch from `main`
- One issue = One PR
- Squash merge for clean history
- Cannot start next issue until previous merged
- Move completed issues to `issues/completed/`

---

## 🎯 Current Status

**Completed Issues:**
- ✅ Issue 001: Project setup, testing infrastructure, GitHub integration

**Next Issue:**
- 📍 Issue 002: Neo4j connection manager (`lib/neo4j.ts`)

**Total Progress:** 1/27 issues complete (3.7%)

---

## ⚡ Quick Reference

### Before Every Commit
Pre-commit hook enforces:
- Type-check ✓
- Linting ✓
- 100% test coverage ✓

### Before Creating PR
- [ ] All tests passing: `npm test -- --run`
- [ ] Coverage at 100%: `npm run test:coverage`
- [ ] Build succeeds: `npm run build`
- [ ] Commits follow conventional format

### After PR Merged
- [ ] Pull latest main
- [ ] Move issue to `issues/completed/`
- [ ] Delete local branch
- [ ] Start next issue

---

## 🚫 Important Notes

### No E2E Tests
- Playwright infrastructure removed (Issue 001)
- 100% unit/integration coverage is sufficient
- E2E not needed for internal tool

### CI Strategy
- **Local**: Pre-commit hook runs type-check, lint, tests
- **GitHub**: CI runs type-check and build only
- Tests validated locally (not redundantly in CI)

### TDD is Mandatory
- Every feature must follow RED → GREEN → REFACTOR
- Write tests BEFORE implementation
- Pre-commit hook enforces 100% coverage

---

## 📚 Related Documentation

- `/PROJECT_PLAN.md` - Complete project overview
- `/issues/XXX.md` - Individual issue requirements
- `~/frontend-project-setup-template.md` - General frontend template
- `.github/PULL_REQUEST_TEMPLATE.md` - PR checklist

---

**Last Updated**: 2025-10-26
**Current Issue**: 002 - Neo4j Connection Manager
**Branch Protection**: Enabled (require PR approval)
