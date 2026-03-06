# Contributing to DocuRoute

Thank you for your interest in contributing to DocuRoute! This guide explains how to get started.

## Code of Conduct

Please be respectful and professional in all interactions. We follow the [Contributor Covenant](https://www.contributor-covenant.org/).

## Branch Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/short-description` | `feat/document-versioning` |
| Bug fix | `fix/short-description` | `fix/upload-progress-bar` |
| Chore | `chore/short-description` | `chore/update-dependencies` |
| Docs | `docs/short-description` | `docs/api-reference` |
| Refactor | `refactor/short-description` | `refactor/auth-middleware` |

## Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`

**Examples:**
```
feat(documents): add bulk download support
fix(auth): resolve JWT expiry race condition
docs(readme): update deployment instructions
test(encryption): add AES-256-GCM edge case tests
```

## Development Setup

1. **Fork and clone** the repository
2. **Install dependencies:** `npm install`
3. **Copy environment variables:** `cp .env.example .env`
4. **Set up your database** (PostgreSQL required)
5. **Run migrations:** `npx prisma migrate dev`
6. **Start the dev server:** `npm run dev`

See the full [Developer Guide in README.md](README.md) for detailed setup instructions.

## PR Checklist

Before submitting a pull request, ensure:

- [ ] `npm test` passes with all tests green
- [ ] `npx tsc --noEmit` has zero TypeScript errors
- [ ] Zod validation added to any new API routes
- [ ] Tenant isolation (`companyId` filtering) applied to all new API routes
- [ ] JWT authentication check (`getCurrentUser()`) on all protected routes
- [ ] Audit logging added for any new mutations
- [ ] Security headers not broken
- [ ] No console.log statements left in production code
- [ ] README updated if you added new environment variables or changed setup steps

## Running Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage (must meet thresholds)
npm run test:coverage

# Run specific test file
npx vitest run __tests__/permissions.test.ts
```

Coverage thresholds: **65% lines, 60% functions, 50% branches, 65% statements**.

## How to Add a New Feature

1. **Schema change:** Edit `prisma/schema.prisma`, run `npx prisma migrate dev --name add_feature`
2. **API route:** Create `app/api/feature/route.ts` with auth + Zod + tenant guard + audit log
3. **UI component:** Create `components/feature-name.tsx` as a client component
4. **Page:** Create `app/dashboard/feature/page.tsx`
5. **Types:** Update `types/index.ts` if needed
6. **Tests:** Add tests in `__tests__/` for lib functions, or integration tests in `tests/`

## Getting Help

- Open a GitHub Issue for bugs or feature requests
- Discussions are welcome in GitHub Discussions
- For security vulnerabilities, see [SECURITY.md](SECURITY.md)
