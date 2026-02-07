 Implementation Plan: Fix CI Smoke Tests with Firebase Emulator
                                                         
 Context                             

 Problem: CI smoke tests fail with auth/invalid-api-key because
 the required NEXT_PUBLIC_FIREBASE_* secrets don't exist in
 GitHub.

 Solution: Use Firebase Local Emulator for CI testing (no real
 credentials needed).

 Your Existing Setup:
 - ✅ firebase.json and .firebaserc already exist
 - ✅ Project ID: fitnessai-dev-dummy (default)
 - ✅ Unit tests passing (30 tests)
 - ✅ Smoke tests exist but can't run due to Firebase init
 failure

 Implementation Steps

 1. Update firebase.json - Add Emulator Configuration

 Edit /Users/lisagu/Projects/fitnessai-1/firebase.json:

 Add emulators section:
 {
   "firestore": {
     "database": "(default)",
     "rules": "firestore.rules",
     "indexes": "firestore.indexes.json"
   },
   "emulators": {
     "auth": {
       "port": 9099
     },
     "firestore": {
       "port": 8080
     },
     "ui": {
       "enabled": false
     }
   }
 }

 2. Install Firebase Tools

 Add to package.json devDependencies:
 npm install -D firebase-tools

 Or use npx firebase in CI (no install needed).

 3. Update Client Firebase SDK - Connect to Emulator

 Edit /Users/lisagu/Projects/fitnessai-1/src/lib/firebase.ts:

 After initializing app (line 19), add:
 import { connectAuthEmulator } from "firebase/auth";
 import { connectFirestoreEmulator } from "firebase/firestore";

 // Initialize Firebase
 const app = !getApps().length ? initializeApp(firebaseConfig) :
  getApp();
 const db = getFirestore(app);
 const auth = getAuth(app);

 // Connect to emulator in CI environment
 if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === '1') {
   connectAuthEmulator(auth, 'http://127.0.0.1:9099', {
 disableWarnings: true });
   connectFirestoreEmulator(db, '127.0.0.1', 8080);
 }

 export { db, auth };

 4. Update Admin SDK - Allow Emulator Without Credentials

 Edit
 /Users/lisagu/Projects/fitnessai-1/src/lib/firebase-admin.ts:

 Replace getAdminApp() function (lines 26-50):
 export function getAdminApp(): App {
   if (adminApp) {
     return adminApp;
   }

   const existingApp = getApps().find(app => app.name ===
 'admin');
   if (existingApp) {
     adminApp = existingApp;
     return adminApp;
   }

   // Emulator mode: no credentials needed
   if (process.env.FIRESTORE_EMULATOR_HOST ||
 process.env.FIREBASE_AUTH_EMULATOR_HOST) {
     adminApp = initializeApp(
       { projectId: 'fitnessai-dev-dummy' },
       'admin'
     );
     return adminApp;
   }

   // App Hosting: use Application Default Credentials
   if (isAppHosting()) {
     adminApp = initializeApp(
       { credential: applicationDefault() },
       'admin'
     );
   } else {
     // Local/production: use service account
     adminApp = initializeApp(
       { credential: cert(getServiceAccount()) },
       'admin'
     );
   }

   return adminApp;
 }

 5. Update CI Workflow - Run Tests with Emulator

 Edit
 /Users/lisagu/Projects/fitnessai-1/.github/workflows/ci.yml:

 Replace smoke job (lines 26-48):
 smoke:
   runs-on: ubuntu-latest
   needs: quality
   steps:
     - uses: actions/checkout@v4

     - uses: actions/setup-node@v4
       with:
         node-version: 20
         cache: npm

     - run: npm ci

     - name: Build with fake Firebase config
       run: npm run build
       env:
         NEXT_PUBLIC_FIREBASE_API_KEY: "fake-key-for-build"
         NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "localhost"
         NEXT_PUBLIC_FIREBASE_PROJECT_ID: "fitnessai-dev-dummy"
         NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
 "fitnessai-dev-dummy.appspot.com"
         NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123456789"
         NEXT_PUBLIC_FIREBASE_APP_ID: "1:123456789:web:fake"
         NEXT_PUBLIC_USE_FIREBASE_EMULATOR: "1"
         FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080"
         FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099"

     - run: npx playwright install --with-deps chromium

     - name: Run smoke tests with emulator
       run: npx firebase emulators:exec --project
 fitnessai-dev-dummy "npm run test:smoke"
       env:
         NEXT_PUBLIC_FIREBASE_API_KEY: "fake-key-for-build"
         NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "localhost"
         NEXT_PUBLIC_FIREBASE_PROJECT_ID: "fitnessai-dev-dummy"
         NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
 "fitnessai-dev-dummy.appspot.com"
         NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123456789"
         NEXT_PUBLIC_FIREBASE_APP_ID: "1:123456789:web:fake"
         NEXT_PUBLIC_USE_FIREBASE_EMULATOR: "1"
         FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080"
         FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099"

 Key Changes Summary

 1. firebase.json - Add emulators config (auth:9099,
 firestore:8080)
 2. firebase.ts - Connect to emulator when
 NEXT_PUBLIC_USE_FIREBASE_EMULATOR=1
 3. firebase-admin.ts - Skip credentials when emulator env vars
 present
 4. ci.yml - Use firebase emulators:exec with fake credentials +
  emulator flags

 Verification

 Local test:
 # Terminal 1: Start emulator manually
 npx firebase emulators:start --only auth,firestore

 # Terminal 2: Run tests
 NEXT_PUBLIC_USE_FIREBASE_EMULATOR=1 \
 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
 npm run test:smoke

 Or use emulators:exec:
 npx firebase emulators:exec --project fitnessai-dev-dummy "npm
 run test:smoke"

 CI verification:
 - Push changes
 - Check GitHub Actions
 - ✅ Quality job passes
 - ✅ Smoke job passes (no more auth/invalid-api-key)

 Success Criteria

 - ✅ No real Firebase credentials in GitHub
 - ✅ CI smoke tests complete successfully
 - ✅ No auth/invalid-api-key errors
 - ✅ Emulator starts/stops automatically via emulators:exec
 - ✅ Both quality and smoke jobs pass

 Files Modified

 1. firebase.json - Add emulators section
 2. package.json - Add firebase-tools devDependency
 3. src/lib/firebase.ts - Add emulator connection
 4. src/lib/firebase-admin.ts - Handle emulator mode without
 creds
 5. .github/workflows/ci.yml - Update smoke job to use emulator