---
phase: 01-firestore-security-hardening
plan: 05
title: "Deploy Stage 1+2 Rules to Staging & Validate"
subtitle: "Stage 1+2 Firestore rules deployed to staging project (fitnessai-dev-dummy) - manual validation approved"
status: complete
completed_date: 2026-02-06
requires: ["01-02", "01-03"]
provides: "Stage 1+2 rules deployed to staging and validated; approved for production deployment"
tech-stack:
  patterns:
    - "Two-stage deployment: Staging validation → Production deployment"
    - "Three-stage validation: Emulator (local) → Staging (cloud test) → Production (live)"
  deployments:
    - "Firestore rules to staging project (fitnessai-dev-dummy)"
---

# Plan 1.5: Deploy Stage 1+2 Rules to Staging & Validate - SUMMARY

**Date Completed:** 2026-02-06
**Status:** Complete - Validation Approved
**Checkpoint Type:** human-verify (manual validation completed and approved)

---

## What Was Built

### Task 1.5.1: Configure Firebase Staging & Deploy Rules ✅ COMPLETE

**Actions:**
1. Updated `.firebaserc` to add `staging` alias pointing to `fitnessai-dev-dummy` project
2. Deployed Stage 1+2 rules to staging: `firebase deploy --only firestore:rules --project staging`
3. Firebase CLI validated rule syntax and deployed successfully

**Deployment Result:**
- **Firestore API:** Enabled
- **Rules Compilation:** Passed (no syntax errors)
- **Deployment Status:** SUCCESS
- **Live In:** https://console.firebase.google.com/project/fitnessai-dev-dummy/firestore

**Rules Deployed:**
- Stage 1: User isolation (users, workouts, profiles, personalRecords, custom exercises)
- Stage 2: Exercises auth + custom user exercises
- Helper: isOwner(userId) function for ownership checks

### Commit
```
6e7ce34 - chore(01-05): configure staging project alias in .firebaserc
```

---

## Validation Results (Tasks 1.5.2, 1.5.3, 1.5.4)

All 5 critical security scenarios have been validated in staging. User approval confirmed.

### Scenario 1: User Isolation (Stage 1)
- **Test:** Alice can read her own workouts, Bob cannot read Alice's workouts
- **Expected:** Alice: SUCCESS, Bob: PERMISSION DENIED
- **Status:** ✅ PASSED

### Scenario 2: Anonymous Denial (Stage 1)
- **Test:** Unauthenticated users cannot access any collection
- **Expected:** PERMISSION DENIED
- **Status:** ✅ PASSED

### Scenario 3: Subcollection Inheritance (Stage 1)
- **Test:** Alice can read her nested workout sets, Bob cannot
- **Expected:** Alice: SUCCESS, Bob: PERMISSION DENIED
- **Status:** ✅ PASSED

### Scenario 4: Exercises Auth Requirement (Stage 2)
- **Test:** Exercises require authentication; users cannot write to global exercises
- **Expected:** Anon: DENIED, Auth: CAN READ, Auth: CANNOT WRITE
- **Status:** ✅ PASSED

### Scenario 5: Custom Exercises User Isolation (Stage 2)
- **Test:** Alice can read/write her custom exercises, Bob cannot
- **Expected:** Alice: SUCCESS, Bob: PERMISSION DENIED
- **Status:** ✅ PASSED

---

## How to Validate

### In Firebase Console

1. Go to: https://console.firebase.google.com/project/fitnessai-dev-dummy/firestore
2. Create test accounts:
   - alice@test.com / Test1234!
   - bob@test.com / Test1234!
3. Create test data:
   - /users/{alice-uid}/workouts/w1 (sample workout)
   - /users/{alice-uid}/workouts/w1/sets/s1 (nested sets)
   - /users/{alice-uid}/exercises/juggling (custom exercise)
4. Test read/write operations with different auth contexts
5. Verify expected behavior matches actual behavior

### Detailed Instructions

See: `01-05-STAGING-VALIDATION.md` - Complete testing matrix with all scenarios

---

## Approval Gate

**Status:** ✅ APPROVED

All 5 critical security scenarios tested and passed. User validated staging deployment and approved for production deployment (Plan 1.6).

**Approval Decision:**
- All scenarios show expected behavior: PASS
- No data leakage or permission issues
- Rules are stable and secure in staging
- Ready for production deployment

---

## Deviations from Plan

None - plan executed exactly as written.

Deployment successful on first attempt. No rule syntax errors. No unexpected behaviors during deployment.

---

## Key Files

- **Rules:** `/Users/lisagu/Projects/fitnessai-1/firestore.rules` (Stage 1+2 complete)
- **Config:** `/Users/lisagu/Projects/fitnessai-1/.firebaserc` (staging alias added)
- **Validation Doc:** `.planning/phases/01-firestore-security-hardening/01-05-STAGING-VALIDATION.md`

---

## Next Phase

**Plan 1.6: Production Deployment** (blocked by this validation checkpoint)
- Deploy same rules to production project (fitnessai-prod)
- Same validation approach
- Requires approval from Plan 1.5 checkpoint

**Critical Path:**
1. ✅ Plan 1.1: Stage 1 rules created & tested in emulator
2. ✅ Plan 1.2: Stage 1 rules validated in emulator
3. ✅ Plan 1.3: Stage 2 rules created
4. ✅ Plan 1.4: Combined rules tested in emulator
5. ⏳ Plan 1.5: Stage 1+2 rules deployed to staging, validated → **YOU ARE HERE**
6. Plan 1.6: Stage 1+2 rules deployed to production

---

**Completion Status:** Plan 1.5 complete. User validated all 5 scenarios and approved staging rules for production deployment.

**Next:** Plan 1.6 (Production Deployment) can now proceed.

