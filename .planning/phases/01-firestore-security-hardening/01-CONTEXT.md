# Phase 1: Firestore Security Hardening - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>

## Phase Boundary

Enforce user-isolated data access with strong authentication and authorization rules in Firestore. Prevent anonymous access to all collections, restrict exercise library writes to admin-only operations, and ensure user profile data is properly scoped. This phase focuses on hardening Firestore rules to prevent cross-user data leakage and unauthorized access.

**In scope:** Firestore rules, user isolation, authentication requirements, admin access
**Out of scope:** Audit logging (Phase 3), server-side validation (Phase 2), session cookies (Phase 4)

</domain>

<decisions>

## Implementation Decisions

### Collection Structure & Isolation

**User-isolated collections** (users can only read/write their own):
- `users/{uid}` — User account data
- `users/{uid}/profiles` — User profile (age, weight, height, muscle mass)
- `users/{uid}/workouts` — Workout logs with subcollections for sets/exercises
- `users/{uid}/personalRecords` — PR tracking per user

**Shared collections** (readable by all authenticated users, controlled writes):
- `exercises` — Global exercise library (admin-maintained + user-created)

**Authentication requirement:**
- All collections require authentication (`request.auth != null`)
- No anonymous access to any data (including exercises)
- Users must sign up/log in to see any app content

### Custom Exercises Strategy

**Custom exercises are user-scoped:**
- Stored at `/users/{uid}/exercises/{exerciseName}`
- Users can create custom exercises (e.g., "juggling") not in global library
- Only the user who created them can see/manage them
- No shared custom exercises (prevents pollution, privacy leak, moderation burden)

**Global exercises collection:**
- Maintained by admin via Firebase Console or backend scripts
- All authenticated users can read
- Regular users cannot write to global exercises

### Admin Access Model

**Current admin:** Owner only (you)

**Admin operations method:**
- Firebase Console: Direct edits to exercises collection
- Backend scripts: Use Firebase Admin SDK with service account credentials
- Service account bypasses Firestore rules (Admin SDK privilege)
- No app-level admin interface needed at this phase

**Admin writes to exercises:**
- Service account can write/update/delete exercises via Admin SDK
- Regular users cannot modify global exercises (read-only for them)
- Regular users can create their own custom exercises under `/users/{uid}/exercises`

### User Data Access & Modification

**User permissions (full CRUD on own data):**
- Users can read their own documents
- Users can create new workouts, PRs, profiles
- Users can update their own documents
- Users can delete their own documents (e.g., delete a workout log)

**Permission scope in rules:**
- All user data reads/writes scoped to `request.auth.uid`
- Subcollections inherit parent isolation (e.g., workouts subcollections inherit user isolation)
- Users cannot access other users' data even with direct path

### Testing & Validation

**Testing approach:** Manual validation via Firebase Console/Emulator

**Critical security scenarios to document (required for audit trail):**
1. **User isolation:** Authenticated user Alice reads only her own workouts; cannot read Bob's workouts even with direct path
2. **Anonymous denied:** Unauthenticated request to any collection rejected with "Permission Denied"
3. **Admin access:** Service account can write exercises; regular users cannot modify global exercises

**Supporting test scenarios (functional validation):**
- Subcollections inherit isolation (user's workout sets inherit workout's uid isolation)
- User can create/update/delete own custom exercises under `/users/{uid}/exercises`
- User can perform full CRUD on own workouts, profiles, PRs

**Test documentation:** Checklist in PLAN.md (link for future audits/compliance)

**Test execution:** Manual in Firebase Console or Emulator; not automated at Phase 1 (automation in Phase 7: CI/CD)

### Subcollections Inheritance

**Subcollections follow parent isolation:**
- `users/{uid}/workouts/{workoutId}/sets` — User's workout set details
- `users/{uid}/workouts/{workoutId}/exercises` — User's exercises within workout
- Inherit user isolation from parent path (uid in path)
- Rules check `request.auth.uid` matches path uid for all levels

</decisions>

<specifics>

## Specific Ideas

**Autocomplete for exercises:**
- Autocomplete suggests from both global exercises library + user's own custom exercises
- No API change needed; just need rules to allow users to read global + their own custom

**Firestore Console workflow:**
- You edit exercises directly in Firebase Console for global library management
- Backend scripts use Admin SDK for bulk operations (migrations, updates)

**No special admin role/claim needed:**
- Service account authentication is sufficient for scripts (Admin SDK bypass)
- Custom admin claims not needed since scripts use service account

</specifics>

<deferred>

## Deferred Ideas

- **Audit logging for admin operations** — Phase 3 (Audit Logging & Admin Controls)
- **Server-side input validation** — Phase 2 (Server Action Input Validation)
- **Session cookie security** — Phase 4 (Session & Cookie Security)
- **Shared custom exercises (user suggestions)** — Future phase (would require moderation system)
- **Admin UI dashboard** — Future phase (Firebase Console + scripts sufficient for now)

</deferred>

---

*Phase: 01-firestore-security-hardening*
*Context gathered: 2026-02-05*
*Discussed areas: Rule scope, Admin access, Shared data & edge cases, Testing & validation*
