# Claude Code Guidelines for FitnessAI

This document provides guidelines and authorizations for Claude to work efficiently on this project.

## Project Overview

**FitnessAI** is a fitness tracking and analysis application built with:
- **Frontend**: Next.js, React, TypeScript
- **Backend**: Next.js Server Actions
- **Database**: Firebase (Firestore)
- **Caching**: React Query + Next.js `unstable_cache`
- **AI**: Google Gemini API

**Repository**: Main branch is `main`, feature branches follow pattern `feature/*` or `<topic>/*`

## Git Workflow & Permissions

### Branch Management
- ⚠️ **Never create branches**—user creates branches
- ⚠️ **Never commit** to any branch (feature or main)
- ⚠️ **Never push** to any branch
- When work is ready: Show user `git diff` and ask for approval
- User handles all branch creation, commits, and pushes

### Pull Requests
- ⚠️ **Never create PRs**—user creates PRs manually
- ⚠️ **Never merge PRs**—user handles all PR operations
- When work is ready: Show user `git diff` and ask for approval
- User will create the PR and handle merging

### Commits & Pushes
- ⚠️ **Never commit**—user handles all commits
- ⚠️ **Never push**—user handles all pushes
- When work is ready: Show user `git diff` and ask for approval to proceed
- User will handle creating commits, pushing to remote, and all git operations
- When committing (by user), suggested format:
  - Use imperative form: "Fix", "Add", "Update"
  - Use conventional commit format: fix:, feat:, refactor:, etc.
  - Include co-author: `Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>`

## Code Conventions

### TypeScript & React
- Use explicit types (no `any`)
- Prefer `const` over `let`
- Use `React.FC` for component typing
- Memoize expensive computations with `useMemo`
- Avoid creating new utility functions for single-use cases

### Firestore & Data
- Always include error handling in server actions
- Use React Query with appropriate staleTime values:
  - **Historical data**: `Infinity` (never refetch)
  - **Current data**: 1 hour
  - **Dynamic/filtered data**: 30 minutes
- Invalidate cache on mutations (add/update/delete)

### Caching Strategy
- **Mutations invalidate immediately**: Don't wait for staleTime expiration
- **Longer cache times = lower cost**: Prefer 30min over 5min when mutations handle freshness
- **No automatic refetch on page reload** unless data has changed via mutation
- See `/docs/archive/caching-strategy.md` for full strategy

### Exercise Resolution
- Always use `resolveCanonicalExerciseName(name, exercises)` to normalize exercise names
- Check legacyNames in Firebase exercises collection for aliases
- Don't hardcode exercise names in analysis/comparison logic

### Error Handling
- Wrap server actions in try-catch
- Log errors to Cloud Logging (use `logger` from `src/lib/logging`)
- Redact PII before logging (use `redactPII()`)
- Return user-friendly error messages, not stack traces

## Security & Sensitive Data

### Environment Variables
- ✅ **Can read** .env.local and .env.production.local for context
- ⚠️ **Never commit** credentials, API keys, or secrets
- ⚠️ **Never log** PII (emails, weights, user IDs) without redaction

### API Keys & Credentials
- ❌ **NEVER hardcode API keys** in source code (Gemini, Google APIs, etc.)
- ✅ **Always use environment variables**: `process.env.GEMINI_API_KEY`, `process.env.GOOGLE_API_KEY`
- ✅ **Check for existence** before using: `if (!process.env.GEMINI_API_KEY) throw new Error('Missing API key')`
- ⚠️ **Previous issues**: API keys have been accidentally committed before—be extra vigilant
- ⚠️ **Never log** API keys or credentials
- ⚠️ **Never pass** credentials in URLs or request bodies—use Authorization headers

### Firebase
- Production database: `fitnessai-prod` (Firestore)
- Development/dummy database: Separate Firebase project
- Always verify correct project before making data changes
- Security rules are configured—test queries work as expected
- Firebase config comes from environment variables (safe)

### Logging
- Use `redactPII()` before logging user data
- Log at appropriate levels: debug, info, warn, error
- Avoid logging request/response bodies with sensitive data

## Testing & Verification

### Before Committing
- ✅ **Run typecheck**: `npm run build` (includes TypeScript)
- ✅ **Run linting**: `npm run lint` (ESLint, Prettier)
- ✅ **Check diagnostics**: IDE should show 0 errors
- ✅ **Manual testing**: Test the feature works as expected

### Testing Strategy
- **E2E tests**: Use Playwright (11 smoke tests in `.github/workflows/`)
- **Unit tests**: 179 tests passing (`npm run test:ci`). Coverage tracks concerns closeout.
- **Test roadmap**: `.planning/codebase/testing-upgrades.md` (Phases 2-4)
- **Manual testing**: Still used for UI/UX validation

### Code Review Checklist
Before asking for PR approval:
- ✓ TypeScript compiles without errors
- ✓ No ESLint warnings introduced
- ✓ Build passes
- ✓ Feature works as described
- ✓ No breaking changes to existing features
- ✓ Commit messages are clear
- ✓ Related cache invalidations added (if data modified)

## Common Tasks

### Picking Up Work (Default Workflow)
1. Read `.planning/codebase/CONCERNS.md` — it is the **single work queue**
2. Follow the **Priority Order** section for what to work on next
3. Reference linked detail docs (e.g., `imbalance-config.md`, `testing-upgrades.md`) for scope
4. Implement the item
5. **Closeout** (all three required):
   - Update concern status in CONCERNS.md (`RESOLVED` or `PARTIAL RESOLUTION` with remaining risk)
   - Add dated entry in `docs/changelog.md` (area, summary, files, verification)
   - Update adjacent `.planning/codebase` docs if architecture/testing/workflow changed
6. Show user `git diff` and ask for approval

### Adding a New Feature
1. Create feature branch: `git checkout -b feature/description`
2. Implement feature following conventions above
3. Test thoroughly (manual + build verification)
4. Create PR with description of changes
5. Ask user for approval before merging

### Fixing a Bug
1. Create branch: `git checkout -b fix/bug-description`
2. Investigate using CONCERNS.md and STRUCTURE.md
3. Add cache invalidation if modifying data
4. Test the fix
5. Create PR

### Updating Documentation
- ✅ **Can update** docs in `/docs/` and `/CLAUDE.md` without confirmation
- ✅ **Can update** inline code comments
- ⚠️ **Major doc changes**: Mention in commit message for visibility

### Dependency Updates
- ⚠️ **Ask first** before upgrading major versions
- ✅ **Can patch/minor updates** if tests pass
- ✅ **Can add small dependencies** if justified and used

## Debugging & Investigation

### Tools Available
- **CONCERNS.md**: Known bugs, tech debt, fragile areas
- **STRUCTURE.md**: Codebase structure and file organization
- **ARCHITECTURE.md**: System design and patterns
- **CONVENTIONS.md**: Code style and naming conventions
- **Firestore console**: Direct data inspection
- **Build logs**: TypeScript and ESLint errors

### Common Issues
- **Stale cache**: Clear localStorage/IndexedDB or restart dev server
- **Firestore sync issues**: Check if correct Firebase project is active
- **Exercise resolution failing**: Verify legacyNames in Firebase exercises collection
- **Rate limiting**: Check Redis connection and rate-limiting configuration

## Communication Style

- **Be concise**: Prefer short summaries over lengthy explanations
- **Use file references**: Include `path/to/file:line-number` when referencing code
- **Suggest before acting**: For risky operations, propose the change first
- **Document decisions**: Explain why in commit messages/PRs, not just what
- **Show context**: When asking for approval, show relevant code/data

## What NOT to Do

- ❌ **Don't hardcode API keys** in any code (even in comments, configs, or examples)
- ❌ **Don't commit secrets** (.env files, credentials, API keys)
- ❌ **Don't force push** to main or shared branches
- ❌ **Don't modify** security rules in Firestore without testing
- ❌ **Don't skip** typecheck/lint before committing
- ❌ **Don't assume** which Firebase project is active—always verify
- ❌ **Don't create** unnecessary abstractions or utility functions
- ❌ **Don't delete files** without asking (they might be in-progress work)
- ❌ **Don't use `--no-verify`** or other git safety bypasses
- ❌ **Don't log** PII or credentials without redaction
- ❌ **Don't pass credentials in URLs** or request bodies—use environment variables and headers

## References

- [Codebase Concerns (work queue)](/.planning/codebase/CONCERNS.md)
- [Changelog](/docs/changelog.md)
- [Testing Status](/.planning/codebase/TESTING.md)
- [Testing Upgrade Roadmap](/.planning/codebase/testing-upgrades.md)
- [Imbalance Config Plan](/.planning/codebase/imbalance-config.md)
- [Caching Strategy](/docs/archive/caching-strategy.md)
- [Project Structure](/docs/archive/STRUCTURE.md)
- [Architecture](/docs/archive/ARCHITECTURE.md)
- [Conventions](/docs/archive/CONVENTIONS.md)

---

**Last Updated**: 2026-02-14
**Version**: 1.1
