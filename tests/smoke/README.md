# Smoke Tests

End-to-end smoke tests for critical user flows.

## Setup

1. **Create a test user in Firebase** (dev project):
   - Go to Firebase Console → Authentication → Users
   - Create user with email: `new@fake.com` and password: `fake26`

2. **Set environment variables before running tests**:
   ```bash
   export E2E_AUTH_EMAIL="new@fake.com"
   export E2E_AUTH_PASSWORD="fake26"
   ```

3. **Run smoke tests**:
   ```bash
   npm run test:smoke
   ```

   Or with browser visible:
   ```bash
   npm run test:smoke:headed
   ```

## Tests Included

- **auth.spec.ts**
  - Sign in page loads
  - Sign in and out flow

- **workout-log.spec.ts**
  - History page shows logging entry points
  - Create and delete a workout

- **screenshot-parse.spec.ts**
  - Screenshot parser surface accessible (history)
  - Screenshot parser surface accessible (PRs)
  - Screenshot upload form functional

- **analysis-plan.spec.ts**
  - Analysis page loads
  - Plan page loads
  - Can generate plan
  - Can generate analysis

## Notes

- Tests skip automatically if `E2E_AUTH_EMAIL` and `E2E_AUTH_PASSWORD` are not set
- Tests run against the dev Firebase project by default
- Playwright is configured to auto-start the dev server on port 3000
