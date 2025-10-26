# Claude Code Review Guidelines

## Project Context

This is a **Neo4j Finance Frontend** - an internal tool for uploading banking data to Neo4j, built with strict **Test-Driven Development (TDD)** practices.

**Tech Stack:**
- Next.js 15.1.8 with TypeScript
- Neo4j database integration
- Vitest for testing
- shadcn/ui components
- Tailwind CSS v4

---

## Code Review Priorities

### 1. Test Coverage - CRITICAL ⚠️

**Requirement: 100% coverage for all business logic**

- ✅ Every PR must include tests BEFORE implementation (TDD)
- ✅ All `lib/*` utilities require 100% coverage
- ✅ All API routes (`app/api/*`) require 100% coverage
- ✅ All components with logic require 100% coverage
- ✅ All custom hooks require 100% coverage
- ❌ Flag ANY new code without corresponding tests

**Excluded from coverage:**
- `app/**` pages (Next.js boilerplate)
- `lib/utils.ts` (shadcn/ui utility)
- `components/ui/**` (third-party components)
- Config files, type definitions

### 2. TDD Compliance

**Every PR must follow RED → GREEN → REFACTOR:**
- Did the developer write failing tests first?
- Is the implementation minimal (GREEN phase)?
- Were refactorings done while keeping tests green?

**Red flags:**
- Implementation commits before test commits
- Missing test files for new features
- Tests that don't actually fail when code is removed

### 3. TypeScript Quality

- No `any` types (use proper typing)
- No `@ts-ignore` or `@ts-expect-error` without justification
- Proper type exports from modules
- No type errors (`tsc --noEmit` must pass)

### 4. Code Quality

**Check for:**
- Clear, descriptive naming (functions, variables, types)
- Proper error handling (especially Neo4j operations)
- Transaction safety (Neo4j writes must use transactions)
- Retry logic for database operations
- Proper resource cleanup (sessions, drivers)

**Avoid:**
- Magic numbers or strings (use constants)
- Deep nesting (max 3 levels)
- Large functions (> 50 lines suggests need for refactoring)
- Commented-out code

### 5. Neo4j Best Practices

- Use `session.executeWrite()` for write operations
- Use `session.executeRead()` for read operations
- Always close sessions properly (use `try/finally`)
- Implement retry logic for transient failures
- Use parameterized queries (prevent injection)
- Proper connection pooling management

### 6. Security

- No hardcoded credentials or API keys
- Environment variables for all secrets
- Proper input validation and sanitization
- No SQL/Cypher injection vulnerabilities

---

## Review Format

### Structure Your Review As:

**1. Summary**
- Brief overview of changes
- Overall assessment (Approve / Request Changes)

**2. Test Coverage Analysis**
- Coverage percentage
- Missing test cases (if any)
- Test quality assessment

**3. Code Quality Issues**
- List specific issues with file:line references
- Categorize by severity: 🔴 Critical | 🟡 Important | 🔵 Nice-to-have

**4. Positive Feedback**
- Highlight good practices
- Acknowledge well-written code

**5. Recommendations**
- Actionable suggestions for improvement
- Resources or examples if applicable

---

## Issue-Based Development

This project uses strict issue-based workflow:
- Each PR addresses exactly ONE issue from `issues/XXX.md`
- Issues must be completed sequentially
- Previous issue must be merged before starting next
- Completed issues move to `issues/completed/`

**Review Checklist:**
- Does PR reference the correct issue number?
- Does implementation match issue requirements?
- Are all acceptance criteria met?
- Is the issue description updated with completion status?

---

## Git Commit Standards

**Expected format:**
```
type(scope): description

- Detail 1
- Detail 2
```

**Valid types:** feat, fix, test, refactor, docs, chore, ci

**Review for:**
- Conventional commit format
- Commits grouped by TDD phase (test → feat → refactor)
- Descriptive commit messages
- Atomic commits (one logical change per commit)

---

## Pre-commit Hook Enforcement

All PRs have already passed local checks:
- Type-check (`tsc --noEmit`) ✓
- Linting (`npm run lint`) ✓
- Tests with 100% coverage ✓

**These should NOT fail in the PR**, but verify:
- Changes don't skip/disable the hook
- No `.only` or `.skip` in test files
- No console.logs left in production code

---

## Common Issues to Flag

🔴 **Critical - Request Changes:**
- Missing tests for new functionality
- Coverage below 100% for business logic
- TypeScript errors
- Security vulnerabilities
- Breaking changes without migration path

🟡 **Important - Suggest Changes:**
- Poor error handling
- Missing input validation
- Inefficient database queries
- Complex functions that need refactoring
- Missing JSDoc for public APIs

🔵 **Nice-to-have - Comment Only:**
- Code style inconsistencies
- Opportunities for DRY improvements
- Performance micro-optimizations
- Better naming suggestions

---

## Example Review Comments

**Good:**
```
🔴 Missing test coverage for error handling in `lib/neo4j.ts:45`

The `connectToDatabase` function doesn't have tests for the retry logic
when connection fails. Please add tests covering:
- Successful connection after 1 retry
- Failure after max retries exceeded
- Proper session cleanup on failure

Example test structure:
\`\`\`typescript
describe('connectToDatabase - retry logic', () => {
  it('should retry on transient failure', async () => {
    // mock neo4j to fail once, then succeed
  })
})
\`\`\`
```

**Avoid:**
```
This code looks bad. Add more tests.
```

---

## Questions to Ask During Review

1. **Can I understand this code in 30 seconds?**
   - If no → suggest simplification

2. **What happens if this fails?**
   - Check error handling and recovery

3. **How would I test this?**
   - If difficult → code might be too coupled

4. **Is this the simplest solution?**
   - Complexity should match problem complexity

5. **Will this scale?**
   - Database query efficiency
   - Memory usage for large datasets

---

## Auto-approve Conditions

You may approve automatically if ALL conditions met:
- ✅ 100% test coverage for new code
- ✅ All tests pass
- ✅ No TypeScript errors
- ✅ Follows TDD approach (tests committed first)
- ✅ No security issues
- ✅ Clear, well-documented code
- ✅ Meets all acceptance criteria from issue

Otherwise, request changes with specific, actionable feedback.

---

**Last Updated:** 2025-10-26
**Review Standard:** Strict TDD with 100% coverage enforcement
