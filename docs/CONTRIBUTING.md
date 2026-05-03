# Contributing

## Purpose

Guidelines for contributing code, documentation, or bug reports to CrisisConnect. Covers the branching strategy, pull request process, code standards, and review expectations.

---

## Overview

CrisisConnect is a production-critical platform used in real emergency situations. Every contribution must meet a high standard for reliability, type safety, and clarity. We welcome contributions that improve correctness, performance, accessibility, and coverage.

---

## Getting Started

### 1. Set up your environment

```bash
# Clone the repository
git clone https://github.com/your-org/crisisconnect.git
cd crisisconnect

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Fill in DATABASE_URL and SESSION_SECRET at minimum

# Apply database schema
npm run db:push

# Start dev server
npm run dev
```

### 2. Verify your setup

```bash
npm run check      # TypeScript — must pass with zero errors
npm test           # All tests — must pass
```

---

## Branching Strategy

| Branch | Purpose | Protected |
|---|---|---|
| `main` | Production-ready code | Yes — no direct pushes |
| `feat/<description>` | New features | No |
| `fix/<description>` | Bug fixes | No |
| `chore/<description>` | Tooling, deps, docs | No |
| `hotfix/<description>` | Emergency production fix | Merged directly to `main` after review |

**Branch naming examples:**
- `feat/digital-twin-export`
- `fix/sos-dispatch-null-radius`
- `chore/update-drizzle-dependencies`

---

## Development Workflow

```
1. Create branch from main
      git checkout -b feat/your-feature main

2. Make changes with small, focused commits

3. Ensure checks pass locally
      npm run check          # Zero TypeScript errors
      npm test               # All tests pass

4. Push branch and open a PR
      git push origin feat/your-feature

5. Address review feedback

6. Squash merge into main (maintainer responsibility)
```

---

## Pull Request Standards

Every PR must:

- [ ] Have a clear title: `feat: add SLA escalation notifications` or `fix: null pointer in dispatch service`
- [ ] Include a description explaining *what* changed and *why*
- [ ] Pass `npm run check` (zero TypeScript errors)
- [ ] Pass `npm test` (all existing tests pass)
- [ ] Add or update tests for changed behavior
- [ ] Not introduce any `any` casts without a comment justifying them
- [ ] Not introduce `console.log` — use `logger.info/warn/error`
- [ ] Update relevant documentation if behavior changes

### PR Description Template

```markdown
## What
Brief description of the change.

## Why
The problem this solves or feature this enables.

## How
Key implementation decisions.

## Testing
How you tested this (manual steps or test files).

## Breaking Changes
List any breaking API or schema changes.
```

---

## Code Standards

### TypeScript

- **Strict mode is on.** No `@ts-ignore` without a comment explaining why.
- All function parameters and return types must be explicitly typed.
- Use `unknown` over `any` for untyped external data.
- Prefer interfaces over type aliases for object shapes.
- No non-null assertions (`!`) without a guard comment.

### Server-Side

- **No business logic in route files.** Routes call services; services own logic.
- Use the `logger` utility — never `console.log`.
- All new endpoints must have Zod request validation.
- New external API calls must go through a circuit breaker (`getCircuitBreaker()`).
- New DB tables require a Drizzle schema definition in `shared/schema.ts`.
- All state-changing actions on incidents or SOS must log to `incident_logs`.

### Client-Side

- **No inline styles.** Use Tailwind classes.
- New UI components go in `client/src/components/ds/` (reusable primitives) or the relevant feature module.
- All data fetching uses TanStack Query — no `useEffect` + `fetch`.
- UI state goes in Zustand stores — not component state if it needs sharing.
- Every new page must be `React.lazy`-loaded in the router.
- Use `SectionBoundary` to wrap independent widgets on pages.

### Database

- All schema changes go through `npm run db:push` (development) — document production migration steps in your PR.
- Never use raw string SQL except in utilities — use Drizzle query builder.
- New tables must have an index on `createdAt` and any FK columns.

---

## Testing Standards

### Unit Tests (`tests/unit/`)

Test individual service functions in isolation. Mock external dependencies.

```typescript
// Example: testing signal fusion
import { describe, it, expect } from "vitest";
import { computeFusedScore } from "../../server/modules/ai/signal-fusion.service";

describe("computeFusedScore", () => {
  it("weights components correctly", () => {
    const score = computeFusedScore({
      aiUrgency: 10,
      locationRisk: 0,
      repetitionScore: 0,
      userTrustScore: 0,
    });
    expect(score).toBeCloseTo(5.0); // 10 × 0.5
  });
});
```

### Integration Tests (`tests/integration/`)

Test API endpoints end-to-end against a real test database.

```typescript
import supertest from "supertest";
import { app } from "../../server";

describe("POST /api/reports", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await supertest(app).post("/api/reports").send({});
    expect(res.status).toBe(401);
  });
});
```

### Coverage Target

- Minimum 70% line coverage for new service files.
- Run `npm run test:coverage` before submitting a PR.

---

## Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`

**Examples:**
```
feat(sos): add SLA level-3 public broadcast
fix(dispatch): handle null radius when no responders found
chore(deps): update drizzle-orm to 0.39.1
docs(api): add multimodal endpoint examples
```

---

## Reporting Bugs

Open a GitHub issue with:

1. **Summary:** One sentence describing the bug.
2. **Steps to reproduce:** Numbered steps.
3. **Expected behavior:** What should happen.
4. **Actual behavior:** What does happen.
5. **Environment:** Node version, OS, browser (for UI bugs).
6. **Logs:** Relevant server or browser console output.

Do not include credentials, personal data, or production database URLs in issues.

---

## Proposing Features

Open a GitHub issue tagged `enhancement` with:

1. **Problem statement:** What user need does this address?
2. **Proposed solution:** High-level approach.
3. **Alternatives considered:** Other approaches and why they were rejected.
4. **Impact:** Which roles/modules are affected?

Large features should be discussed in an issue before a PR is opened.

---

## Code Review Etiquette

- Reviews are about the code, not the person.
- Use `nit:` prefix for style suggestions that don't block merge.
- Request changes only for correctness, security, or significant maintainability issues.
- Approving a PR means you would be comfortable debugging it in production.

---

## Related Docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — understand the system before contributing
- [DEPLOYMENT.md](DEPLOYMENT.md) — how to test against a production-like environment
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — common development issues
