---
phase: 01-firestore-security-hardening
plan: 03
subsystem: database
tags: [firestore, security, authentication, authorization, rules]

# Dependency graph
requires:
  - phase: 01-firestore-security-hardening
    plan: 01
    provides: Stage 1 rules for user-isolated collections (users, profiles, workouts, PRs)
provides:
  - Stage 2 rules requiring authentication on shared collections (exercises, exerciseAliases, config)
  - Custom user exercises at /users/{uid}/exercises with user isolation
  - Complete Firestore rules foundation for secure data access
affects:
  - Phase 01-04 (testing combined rules in emulator)
  - Phase 01-05 (deployment to staging)
  - All future phases requiring Firestore data access

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Authentication requirement pattern: request.auth != null on all user-facing collections"
    - "User isolation pattern: isOwner(userId) function for scoped access checks"
    - "Shared collection pattern: read-only for authenticated users, write-only via Admin SDK"

key-files:
  created: []
  modified:
    - firestore.rules

key-decisions:
  - "Custom exercises stored at /users/{uid}/exercises for user isolation"
  - "Shared collections (exercises, exerciseAliases, config) require authentication"
  - "Regular users have read-only access to global exercises; admin writes via Firebase Console or service account"

patterns-established:
  - "All shared collections use consistent auth check: request.auth != null"
  - "All user-isolated paths use isOwner(userId) function"
  - "Admin access via Firebase Admin SDK (bypasses rules), no app-level admin interface needed"

# Metrics
duration: 2 min
completed: 2026-02-06
---

# Phase 1, Plan 3: Write Stage 2 Exercises & Custom Exercises Rules Summary

**Exercises collection now requires authentication for reads; custom user exercises added with full user isolation**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-06T03:52:39Z
- **Completed:** 2026-02-06T03:54:30Z
- **Tasks:** 3 (all completed)
- **Files modified:** 1

## Accomplishments

- Updated exercises, exerciseAliases, and config collections to require authentication (changed from `allow read: if true` to `allow read: if request.auth != null`)
- Added /users/{uid}/exercises subcollection for user-created custom exercises with full user isolation
- Verified complete Stage 1 + Stage 2 rules are syntactically correct and follow established patterns
- All shared collections now prevent anonymous access; custom exercises enforce user ownership via isOwner check

## Task Commits

1. **Task 1.3.1 & 1.3.2 & 1.3.3: Stage 2 exercises rules** - `ad7e85a` (feat)

## Files Created/Modified

- `firestore.rules` - Updated to add authentication requirement and custom exercises rules

## Decisions Made

- Custom exercises stored under `/users/{uid}/exercises` (not in global exercises collection) to prevent pollution and moderation burden
- Admin edits to global exercises only via Firebase Console or backend scripts (service account); no app-level admin interface needed
- All shared collections use consistent `request.auth != null` check pattern
- Custom exercises inherit parent user isolation via isOwner check

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Firestore rules are edited via Firebase Console or deployed via command line.

## Next Phase Readiness

- Stage 1 + Stage 2 rules complete and ready for combined testing in Firebase Emulator (Plan 1.4)
- Rules are syntactically valid and follow consistent patterns
- No blockers for next phase

---

*Phase: 01-firestore-security-hardening*
*Plan: 03*
*Completed: 2026-02-06*
