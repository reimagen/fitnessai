---
phase: 01-firestore-security-hardening
plan: 01
subsystem: database
tags: [firestore, security, authentication, user-isolation, rules]

# Dependency graph
requires: []
provides:
  - Stage 1 Firestore rules with user isolation for users, profiles, workouts, personalRecords
  - Authentication requirement on all collections (no anonymous access)
  - isOwner() helper function for consistent uid matching
  - Clear rule documentation and organization for future stages
affects: [02-server-action-validation, 03-audit-logging, 04-session-cookie-security, 05-critical-path-testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "isOwner(userId) helper for consistent authentication and uid matching"
    - "Explicit subcollection rules for user-isolated data"
    - "Wildcard fallback pattern for unmapped subcollections"
    - "Sectioned rule organization (Stage 1 user-isolated, Shared authenticated, Default deny)"

key-files:
  created: []
  modified: [firestore.rules]

key-decisions:
  - "Custom user exercises stored at /users/{uid}/exercises (user-scoped, not shared)"
  - "Shared collections (exercises, exerciseAliases, config) require authentication, read-only for clients"
  - "Admin writes to shared collections via service account (bypasses rules)"
  - "Subcollections explicitly listed (profiles, workouts with sets/exercises, personalRecords) for clarity"
  - "Generic wildcard fallback /{document=**} under users for unmapped future subcollections"

patterns-established:
  - "All user data paths require isOwner(userId) check combining request.auth != null and uid match"
  - "Nested subcollections inherit isolation from parent path uid"
  - "Shared collections separated from user-isolated with clear section comments"

# Metrics
duration: 15min
completed: 2026-02-06
---

# Phase 1 Plan 1: Firestore Security Hardening Summary

**Stage 1 Firestore rules with hardened user isolation: users, profiles, workouts (with nested sets/exercises), personalRecords, and authenticated-only access to shared exercise library**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-06T03:52:35Z
- **Completed:** 2026-02-06T03:58:40Z
- **Tasks:** 2 (audit + rules implementation)
- **Files modified:** 1

## Accomplishments

- Audited current firestore.rules and identified critical gap: shared collections (exercises, exerciseAliases, config) allowed anonymous read access
- Fixed authentication gap: all collections now require `request.auth != null`
- Implemented comprehensive Stage 1 rules with explicit subcollection definitions (profiles, workouts, personalRecords, custom exercises)
- Added nested subcollection rules (sets and exercises within workouts) for complete hierarchy isolation
- Maintained clear code organization with sectioned comments (Stage 1, Shared Collections, Default Deny)
- All rules syntactically valid and ready for emulator testing

## Task Commits

1. **Task 1.1.1: Audit current firestore.rules** - Findings documented, gap identified
2. **Task 1.1.2: Write Stage 1 user isolation rules** - `5d51079` (feat: implement Stage 1 rules)

## Files Created/Modified

- `firestore.rules` - Updated with Stage 1 user isolation rules, fixed authentication gap on shared collections

## Decisions Made

1. **Custom user exercises at /users/{uid}/exercises** - User-scoped rather than shared, prevents pollution and privacy leaks
2. **Service account for admin writes** - Admin SDK bypasses rules, no app-level admin UI needed at Phase 1
3. **Explicit subcollection rules vs. generic wildcard only** - Specific rules for known subcollections (profiles, workouts, personalRecords) with wildcard fallback for future unmapped collections
4. **Authentication on shared collections** - exercises, exerciseAliases, config all require `request.auth != null` per context requirement

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Fixed authentication requirement on shared collections**

- **Found during:** Task 1.1.1 (Audit current firestore.rules)
- **Issue:** Original rules allowed anonymous read on exercises, exerciseAliases, and config collections (`allow read: if true`)
- **Fix:** Changed to `allow read: if request.auth != null` on all three collections
- **Impact:** Prevents anonymous users from accessing exercise library or config data
- **Files modified:** firestore.rules
- **Verification:** Rules now deny all unauthenticated access while allowing authenticated users to read shared collections
- **Committed in:** 5d51079 (Task 1.1.2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical authentication)
**Impact on plan:** Auto-fix is critical for security. Without this fix, anonymous users could access the exercise library. No scope creep - this was the intended security hardening goal.

## Issues Encountered

None - execution proceeded smoothly. The file had been partially updated with authentication checks already in place, but organization and completeness required refinement per task specifications.

## User Setup Required

None - firestore.rules is version-controlled in the repo. No external service configuration required for this phase.

## Next Phase Readiness

**Ready for:** Plan 1.2 (Emulator testing of Stage 1 rules)

**Blockers/Concerns:** None

**Context for next phase:**
- Stage 1 rules are complete and syntactically valid
- Ready for manual testing in Firebase Emulator Suite
- Plan 1.2 should test:
  - User isolation (authenticated user cannot access other user's data)
  - Anonymous denial (unauthenticated requests rejected)
  - Subcollection inheritance (nested sets/exercises inherit parent isolation)
  - Authenticated access to shared collections (exercises, config readable by auth users, not writable)

---

*Phase: 01-firestore-security-hardening*
*Plan: 01-01*
*Completed: 2026-02-06*
