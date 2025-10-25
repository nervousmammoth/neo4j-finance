# Neo4j Banking Data Upload Frontend - Project Plan

## Project Overview

A Next.js 15 frontend application that allows analysts to upload banking data (CSV/XLSX) to Neo4j, with automatic relationship detection and a test-driven development approach.

**Purpose**: Upload real banking data (persons, accounts, banks, companies, transactions) and transform it into a Neo4j graph database with automatically inferred relationships.

## Tech Stack

### Core Framework
- **Next.js**: 15.1.8 (App Router)
- **React**: 19
- **TypeScript**: Strict mode
- **Node.js**: >= 20.9.0 (Currently using v20.19.5)
- **npm**: 10.8.2

### UI & Styling
- **shadcn/ui**: Latest (component library)
- **Tailwind CSS**: 4.x
- **Radix UI**: Via shadcn/ui

### Testing
- **Vitest**: Unit & integration tests
- **@testing-library/react**: Component testing
- **Playwright**: E2E tests
- **Target Coverage**: 90-100%

### Data Processing
- **neo4j-driver**: Neo4j database connection
- **papaparse**: CSV parsing
- **xlsx**: Excel file parsing
- **zod**: Runtime validation

### State Management
- **Zustand**: Client-side state (upload wizard)
- **React Context**: Where appropriate

### Additional Tools
- **@tanstack/react-table**: Data tables
- **react-dropzone**: File uploads

## TDD Approach

Every feature follows strict Test-Driven Development:

1. **RED Phase**: Write failing tests first
2. **GREEN Phase**: Write minimal code to pass tests
3. **REFACTOR Phase**: Improve code quality while keeping tests green
4. **Coverage**: Aim for 90-100% where practical

### Test Types
- **Unit Tests**: All `lib/*` utilities (100% coverage target)
- **Integration Tests**: API routes, complete data flows (95%+ coverage)
- **E2E Tests**: Complete user journeys with Playwright

## Git/GitHub Workflow

### Branch Strategy
```
main (protected)
  ├── issue/001-project-setup
  ├── issue/002-neo4j-connection
  ├── issue/003-csv-parser
  └── ... (one branch per issue)
```

### Per-Issue Workflow
1. Create feature branch from `main`: `git checkout -b issue/XXX-short-name`
2. **RED**: Commit failing tests: `git commit -m "test: add failing tests for XXX"`
3. **GREEN**: Commit implementation: `git commit -m "feat: implement XXX"`
4. **REFACTOR**: Commit improvements: `git commit -m "refactor: improve XXX"`
5. Push and create PR: `gh pr create --title "Issue XXX: [Title]"`
6. CI runs automatically (tests, lint, type-check, build)
7. Get PR approval
8. Merge: `gh pr merge --squash`
9. **BLOCKER**: Cannot proceed to next issue until previous PR is merged

### GitHub Actions CI/CD

**Workflows**:
- `.github/workflows/ci.yml` - Unit tests, type-check, lint, build
- `.github/workflows/e2e.yml` - Playwright E2E tests
- `.github/workflows/coverage.yml` - Coverage reporting

**Branch Protection**:
- Require PR before merging
- Require 1 approval
- Require status checks: `test`, `type-check`, `lint`, `build`
- Require branches up to date

## Project Structure

```
neo4j-finance-frontend/
├── issues/                       # Issue definitions (001.md - 027.md) ✅ COMPLETE
├── app/                          # Next.js 15 App Router
│   ├── page.tsx                  # Dashboard
│   ├── upload/                   # Upload wizard
│   │   ├── page.tsx              # Step 1: File upload
│   │   ├── relationships/
│   │   │   └── page.tsx          # Step 2: Review relationships
│   │   └── import/
│   │       └── page.tsx          # Step 3: Execute import
│   ├── datasets/
│   │   ├── page.tsx              # Dataset list
│   │   └── [id]/page.tsx         # Dataset detail
│   ├── docs/page.tsx             # Documentation
│   └── api/
│       ├── parse/route.ts        # POST - Parse CSV/XLSX
│       ├── relationships/
│       │   └── detect/route.ts   # POST - Detect relationships
│       ├── import/
│       │   └── execute/route.ts  # POST - Execute import
│       └── datasets/
│           ├── route.ts          # GET/POST - List/create datasets
│           └── [id]/route.ts     # GET/DELETE - Dataset details
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── FileUploadZone.tsx
│   ├── DataPreviewTable.tsx
│   ├── RelationshipReviewCard.tsx
│   ├── ImportProgress.tsx
│   ├── DatasetCard.tsx
│   └── SchemaDocumentation.tsx
├── lib/
│   ├── neo4j.ts                  # Neo4j connection manager
│   ├── csv-parser.ts             # CSV parsing
│   ├── xlsx-parser.ts            # XLSX parsing
│   ├── validators/
│   │   └── schema.ts             # Zod schemas (Person, Account, etc.)
│   ├── fk-detector.ts            # Foreign key detection
│   ├── relationship-inference.ts # Relationship inference engine
│   ├── cypher/
│   │   ├── node-generator.ts     # Generate node queries
│   │   └── relationship-generator.ts # Generate relationship queries
│   ├── dataset.ts                # Dataset ID generation
│   ├── batch-manager.ts          # Batch transaction manager
│   └── import-orchestrator.ts    # Import coordination
├── __tests__/
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── e2e/                      # Playwright E2E tests
├── docs/
│   └── schema-templates/         # Example CSV files
├── .github/
│   ├── workflows/                # CI/CD workflows
│   └── PULL_REQUEST_TEMPLATE.md
├── vitest.config.ts
├── playwright.config.ts
├── vitest.setup.ts
├── .env.local.example
└── PROJECT_PLAN.md               # This file
```

## Data Schema

### Entities (CSV/XLSX Format)

**persons.csv**:
- `person_id` (required), `ssn`, `first_name`, `last_name`, `date_of_birth`, `nationality`, `risk_level`, `investigation_status`, `occupation`, `alias`

**accounts.csv**:
- `account_id` (required), `iban` (required), `bank_id`, `account_type`, `country`, `currency`, `current_balance`, `opened_date`, `status`

**banks.csv**:
- `bank_id` (required), `name`, `country`, `routing_number`

**companies.csv**:
- `company_id` (required), `registration_number`, `name`, `country`, `business_type`, `is_shell_company`, `incorporation_date`, `status`

**transactions.csv**:
- `transaction_id` (required), `from_iban` (required), `to_iban` (required), `amount`, `currency`, `date`, `transaction_type`, `reference`, `is_flagged`, `flag_reason`

### Neo4j Graph Schema

**Nodes**:
- `(:Person {person_id, dataset_id, ...})`
- `(:BankAccount {account_id, iban, dataset_id, ...})`
- `(:Bank {bank_id, dataset_id, ...})`
- `(:Company {company_id, dataset_id, ...})`
- `(:Transaction {transaction_id, dataset_id, ...})`

**Relationships**:
- `(:Person)-[:OWNS]->(:BankAccount)`
- `(:Company)-[:OWNS]->(:BankAccount)`
- `(:BankAccount)-[:HELD_AT]->(:Bank)`
- `(:Transaction)-[:FROM]->(:BankAccount)`
- `(:Transaction)-[:TO]->(:BankAccount)`
- `(:Person)-[:CONTROLS]->(:Company)`
- `(:Employee)-[:REPORTS_TO]->(:Employee)`

### Dataset Namespacing
All nodes include `dataset_id` property to allow multiple datasets in one database without conflicts.

## Issue Breakdown (27 Issues)

### Phase 1: Foundation & Setup (Issues 001-005)
- **001**: Project setup, Vitest, Playwright, shadcn/ui, Git/GitHub ⏳ IN PROGRESS
- **002**: Neo4j connection manager
- **003**: CSV parser with validation
- **004**: XLSX parser with validation
- **005**: Schema validator (Zod schemas for all entities)

### Phase 2: Business Logic (Issues 006-012)
- **006**: Foreign key detector (pattern matching)
- **007**: Relationship inference engine
- **008**: Node Cypher query generator
- **009**: Relationship Cypher query generator
- **010**: Dataset ID generator and validator
- **011**: Batch transaction manager (200 rows/batch)
- **012**: Import orchestrator (coordinates entire flow)

### Phase 3: API Routes (Issues 013-017)
- **013**: POST /api/parse
- **014**: POST /api/relationships/detect
- **015**: POST /api/import/execute
- **016**: GET/POST/DELETE /api/datasets
- **017**: GET /api/datasets/[id]

### Phase 4: UI Components (Issues 018-023)
- **018**: FileUploadZone component
- **019**: DataPreviewTable component
- **020**: RelationshipReviewCard component
- **021**: ImportProgress component
- **022**: DatasetCard component
- **023**: SchemaDocumentation component

### Phase 5: Pages & Integration (Issues 024-027)
- **024**: Dashboard page (/)
- **025**: Upload wizard pages (/upload/*)
- **026**: Dataset pages (/datasets/*)
- **027**: E2E test suite (complete user flows)

## Current Status

### Completed ✅
- ✅ All 27 issue definition files created in `/issues/`
- ✅ Issues folder backed up to `/tmp/issues-backup`

### In Progress ⏳
- ⏳ **Issue 001**: Initializing Next.js 15 project
  - Background task running: Installing npm dependencies
  - Task ID: 5e1a2c
  - Status: Installing react, react-dom, next, typescript, tailwind, eslint, etc.

### Pending
- Configure Vitest with React Testing Library
- Configure Playwright for E2E tests
- Set up shadcn/ui
- Initialize git repository
- Create GitHub repository
- Set up GitHub Actions CI/CD
- Create PR template
- Create first PR for Issue 001

## Next Steps

### Immediate (Issue 001 completion)
1. ✅ Wait for Next.js installation to complete
2. Move installed Next.js project from `/home/christoph/neo4j-temp` to `/home/christoph/neo4j-finance-frontend`
3. Restore `/issues/` folder from backup
4. Install additional dependencies:
   ```bash
   npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
   npm install -D @playwright/test
   ```
5. Create configuration files:
   - `vitest.config.ts`
   - `vitest.setup.ts`
   - `playwright.config.ts`
6. Create smoke tests:
   - `__tests__/unit/smoke.test.ts`
   - `__tests__/e2e/smoke.spec.ts`
7. Update `package.json` scripts
8. Create `.github/` structure with workflows
9. Create PR template
10. Initialize git: `git init`
11. **Guide user to create GitHub repo** (manual step)
12. Create first commit and push to main
13. Create branch: `issue/001-project-setup`
14. Create PR for Issue 001
15. **Wait for PR approval and merge** ⚠️ BLOCKER for Issue 002

### Subsequent Issues (002-027)
Each issue follows the same workflow:
1. Create branch from main
2. RED → GREEN → REFACTOR (TDD cycle)
3. Create PR
4. CI runs automatically
5. Get approval
6. Merge
7. Only then proceed to next issue

## Environment Variables

### Required (.env.local)
```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password
NEO4J_DATABASE=neo4j
```

### Optional
```env
# For Codecov integration (if used)
CODECOV_TOKEN=xxx
```

## Key Design Decisions

1. **Single Shared Database**: All analysts use one Neo4j database with dataset namespacing (via `dataset_id` property)

2. **Semi-Automatic Relationships**: System suggests relationships based on FK detection, but users review and confirm before creation

3. **Flexible Upload Mode**: Users can create new datasets or append to existing ones

4. **No Authentication**: Internal tool, no auth needed (can add later if required)

5. **TDD-First**: All code written test-first for high quality and confidence

6. **PR-Based Workflow**: Every issue requires PR approval before proceeding - ensures quality gates

7. **Dataset Isolation via Properties**: Rather than separate databases, use `dataset_id` property on all nodes for filtering

8. **Batch Processing**: Import in 200-row batches for optimal Neo4j performance

9. **Event-Driven Progress**: Use Server-Sent Events or streaming for real-time import progress

10. **Column-Based FK Detection**: Detect foreign keys via naming patterns (`*_id`, `*_iban`, etc.) rather than data analysis

## Important Notes

### Node.js Version
- **Minimum**: 20.9.0
- **Current**: 20.19.5 ✅
- **Use nvm**: `source "$HOME/.nvm/nvm.sh" && nvm use 20` before any npm commands

### Issue Files Location
- **Current**: `/tmp/issues-backup` (temporarily moved during Next.js setup)
- **Final**: `/home/christoph/neo4j-finance-frontend/issues/`
- **Must restore** after Next.js installation completes

### Test Data Location
- **Source**: `/home/christoph/neo4j-finance/data/generated/*.csv`
- **Files**: persons.csv, accounts.csv, banks.csv, companies.csv, transactions.csv
- Generated by `/home/christoph/neo4j-finance/data/generate_data.py`

### CI/CD Requirements
- All tests must pass
- Type checking must pass
- Linting must pass
- Build must succeed
- Coverage thresholds must be met
- Cannot merge PR without approval

## References

### Documentation
- Next.js 15: https://nextjs.org/docs
- Vitest: https://vitest.dev
- Playwright: https://playwright.dev
- shadcn/ui: https://ui.shadcn.com
- Neo4j Driver: https://neo4j.com/docs/javascript-manual/current/
- Zod: https://zod.dev

### Issue Definitions
All detailed issue definitions are in `/issues/001.md` through `/issues/027.md`

Each issue includes:
- Branch name
- Objective
- Dependencies
- RED/GREEN/REFACTOR phases with specific test cases
- Implementation details
- PR checklist
- Acceptance criteria
- Estimated effort

## Success Criteria

Project is complete when:
- ✅ All 27 issues merged to main
- ✅ All tests passing (unit, integration, E2E)
- ✅ Coverage >= 90% overall
- ✅ CI/CD pipeline fully functional
- ✅ Complete upload flow working end-to-end
- ✅ Documentation complete
- ✅ Branch protection rules configured
- ✅ Ready for production use

---

**Last Updated**: 2025-10-25
**Status**: Issue 001 in progress
**Next Milestone**: Complete Issue 001 and create first PR
