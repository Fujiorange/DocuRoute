## PR Description

<!-- Describe what this PR does and why. Link to the issue if applicable. -->

Closes #

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Documentation
- [ ] Chore / dependency update

## Checklist

- [ ] `npm test` passes (`npm run test:run`)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] Zod validation added to any new API routes
- [ ] Tenant isolation guard (`companyId` filter) applied to all new API routes
- [ ] JWT authentication check (`getCurrentUser()`) on all protected routes
- [ ] Audit logging added for any new mutations
- [ ] Security headers not broken
- [ ] No hardcoded secrets or credentials in code
- [ ] Added/updated tests for new functionality
- [ ] README updated if setup steps changed

## Screenshots (if UI changes)

<!-- Add before/after screenshots here -->

## Notes for Reviewers

<!-- Anything specific reviewers should pay attention to -->
