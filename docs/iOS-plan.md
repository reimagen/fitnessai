Plan: Ship FitnessAI as iOS App using Expo                                          │
│                                                                                     │
│ Context                                                                             │
│                                                                                     │
│ FitnessAI is currently a Next.js 16 full-stack web application with Firebase        │
│ backend, Genkit AI flows, and comprehensive fitness tracking features. The goal is  │
│ to get an iOS app to market quickly to validate product-market fit, with plans to   │
│ rebuild in React Native once PMF is established.                                    │
│                                                                                     │
│ User Requirements:                                                                  │
│ - Speed to market is priority                                                       │
│ - Will rebuild in React Native once PMF validated                                   │
│ - Need to understand pros/cons of web vs app-only strategy                          │
│ - Willing to create proper APIs for future scalability                              │
│ - Keep web app operational during mobile development                                │
│                                                                                     │
│ Current Architecture:                                                               │
│ - Next.js 16 with App Router + Server Actions (26 total actions across 6 feature    │
│ areas)                                                                              │
│ - Firebase Auth (hybrid: client SDK + session cookies)                              │
│ - Firestore (client queries for public data, server-side for user data)             │
│ - 6 AI-powered features via Genkit + Gemini                                         │
│ - React Query for client state management                                           │
│ - Radix UI components with Tailwind CSS                                             │
│                                                                                     │
│ Architectural Decision: Three-Phase Approach                                        │
│                                                                                     │
│ Phase 1: WebView Wrapper MVP (2-3 weeks)                                            │
│                                                                                     │
│ Approach: Wrap existing Next.js web app in Expo + WebView                           │
│                                                                                     │
│ Pros:                                                                               │
│ - Fastest time to market (days to basic version, 2-3 weeks to polish)               │
│ - Zero frontend rewrite needed                                                      │
│ - All features work immediately (26 server actions, AI flows, etc.)                 │
│ - Can submit to App Store quickly                                                   │
│ - Minimal new code to maintain                                                      │
│ - Web and mobile stay in sync automatically                                         │
│                                                                                     │
│ Cons:                                                                               │
│ - Not a true native experience (web UI in container)                                │
│ - Performance: web rendering overhead, no native gestures                           │
│ - Limited native integrations (push notifications require bridge)                   │
│ - Camera for screenshots requires WebView-to-Native bridge                          │
│ - Can't use native UI components (still looks like web)                             │
│ - Harder to optimize for different screen sizes                                     │
│                                                                                     │
│ Best For: Validating PMF quickly without significant investment                     │
│                                                                                     │
│ Phase 2: API Foundation (3-4 weeks, parallel)                                       │
│                                                                                     │
│ Approach: Convert Server Actions to REST API endpoints                              │
│                                                                                     │
│ Purpose:                                                                            │
│ - Decouple frontend from backend                                                    │
│ - Enable future React Native app to consume same APIs                               │
│ - Allow other clients (Android, desktop, integrations)                              │
│ - Better separation of concerns                                                     │
│ - Easier to test and version                                                        │
│                                                                                     │
│ Strategy:                                                                           │
│ - Create /api/v1/* routes that wrap existing server actions                         │
│ - Maintain same authentication (Firebase ID tokens via Authorization header)        │
│ - Keep all business logic in existing functions                                     │
│ - Server actions become internal library functions                                  │
│ - APIs follow REST conventions with proper status codes                             │
│                                                                                     │
│ Timeline: Can be built in parallel with Phase 1 WebView wrapper                     │
│                                                                                     │
│ Phase 3: React Native Rebuild (Future - Post PMF)                                   │
│                                                                                     │
│ Approach: Native iOS/Android app consuming Phase 2 APIs                             │
│                                                                                     │
│ When to Start:                                                                      │
│ - After validating PMF with WebView version                                         │
│ - When user growth justifies investment                                             │
│ - When native features become critical (AR, advanced camera, offline mode)          │
│                                                                                     │
│ What Changes:                                                                       │
│ - Replace entire frontend with React Native components                              │
│ - Use Expo for cross-platform (iOS + Android from same codebase)                    │
│ - Firebase SDK works directly in React Native                                       │
│ - Consume REST APIs from Phase 2                                                    │
│ - Can incrementally migrate (start with critical flows)                             │
│                                                                                     │
│ Effort: 8-12 weeks for full rebuild                                                 │
│                                                                                     │
│ ---                                                                                 │
│ Phase 1 Implementation Plan: WebView Wrapper MVP                                    │
│                                                                                     │
│ Step 1: Initialize Expo Project (1 day)                                             │
│                                                                                     │
│ Create Expo app structure:                                                          │
│ # Inside project root, create mobile/ directory                                     │
│ npx create-expo-app mobile --template blank-typescript                              │
│ cd mobile                                                                           │
│                                                                                     │
│ Install dependencies:                                                               │
│ expo install react-native-webview                                                   │
│ expo install expo-constants                                                         │
│ expo install expo-splash-screen                                                     │
│ expo install expo-status-bar                                                        │
│ npx expo install expo-build-properties                                              │
│                                                                                     │
│ Configure app.json:                                                                 │
│ - Set app name, bundle identifiers                                                  │
│ - Configure iOS-specific settings (orientation, permissions)                        │
│ - Add splash screen and app icon assets                                             │
│ - Configure build properties for WebView                                            │
│                                                                                     │
│ Step 2: Build WebView Container (2-3 days)                                          │
│                                                                                     │
│ Create main WebView component:                                                      │
│ - File: mobile/App.tsx                                                              │
│ - Load production web app URL or local dev URL                                      │
│ - Handle loading states with splash screen                                          │
│ - Implement JavaScript bridge for native features                                   │
│ - Handle deep linking (universal links for iOS)                                     │
│ - Error boundary for WebView failures                                               │
│                                                                                     │
│ Critical Features:                                                                  │
│ - Pull-to-refresh                                                                   │
│ - Handle navigation (back button behavior)                                          │
│ - Share authentication state between web and native                                 │
│ - Status bar styling to match web UI                                                │
│                                                                                     │
│ JavaScript Bridge (Web ↔ Native):                                                   │
│ - Camera access for screenshot parsing                                              │
│ - Photo library access                                                              │
│ - Native share functionality                                                        │
│ - Push notification token (future)                                                  │
│                                                                                     │
│ Step 3: Authentication Integration (3-4 days)                                       │
│                                                                                     │
│ Challenge: Current auth uses session cookies (httpOnly), which don't transfer to    │
│ React Native                                                                        │
│                                                                                     │
│ Solution Options:                                                                   │
│                                                                                     │
│ Option A: Keep WebView Auth (Simplest - Recommended for Phase 1)                    │
│ - Let web app handle authentication entirely                                        │
│ - WebView shares cookie storage with web session                                    │
│ - Use incognito={false} and sharedCookiesEnabled={true}                             │
│ - Web app creates session cookie as normal                                          │
│ - No code changes needed in Next.js app                                             │
│                                                                                     │
│ Option B: Native Auth with Token Bridge                                             │
│ - Implement Firebase Auth in React Native                                           │
│ - Store ID token in SecureStore                                                     │
│ - Inject token into web app via JavaScript bridge                                   │
│ - Web app uses token instead of cookie                                              │
│ - Requires Next.js middleware changes                                               │
│                                                                                     │
│ Recommendation: Start with Option A for speed, migrate to Option B if needed        │
│                                                                                     │
│ Step 4: Native Feature Bridges (2-3 days)                                           │
│                                                                                     │
│ Camera Integration:                                                                 │
│ // mobile/src/bridges/CameraBridge.ts                                               │
│ // Expose native camera to web app                                                  │
│ postMessage('cameraResult', { base64Image })                                        │
│                                                                                     │
│ Required for:                                                                       │
│ - parseWorkoutScreenshotAction (workout logging)                                    │
│ - parsePersonalRecordsAction (PR entry)                                             │
│                                                                                     │
│ Implementation:                                                                     │
│ - Install expo-camera and expo-image-picker                                         │
│ - Add camera permission requests to app.json                                        │
│ - Create bridge that listens for camera request from web                            │
│ - Return base64 image data to web app                                               │
│ - Web app sends to existing server action                                           │
│                                                                                     │
│ Photo Library Access:                                                               │
│ - Similar pattern for selecting existing photos                                     │
│ - Uses expo-image-picker library                                                    │
│ - Return base64 to web for upload                                                   │
│                                                                                     │
│ Step 5: Build & Deploy Configuration (1-2 days)                                     │
│                                                                                     │
│ Configure EAS Build:                                                                │
│ npm install -g eas-cli                                                              │
│ eas init                                                                            │
│ eas build:configure                                                                 │
│                                                                                     │
│ Create eas.json:                                                                    │
│ - Development build profile (local testing)                                         │
│ - Preview build profile (TestFlight beta)                                           │
│ - Production build profile (App Store release)                                      │
│                                                                                     │
│ iOS-Specific Configuration:                                                         │
│ - App Store Connect setup                                                           │
│ - Bundle identifier registration                                                    │
│ - Provisioning profiles (via EAS)                                                   │
│ - App privacy declarations                                                          │
│ - Camera usage descriptions                                                         │
│                                                                                     │
│ Environment Variables:                                                              │
│ - Web app URL (EXPO_PUBLIC_WEB_URL)                                                 │
│ - Firebase config (if doing native auth)                                            │
│ - API endpoints (for future API consumption)                                        │
│                                                                                     │
│ Step 6: Testing & Polish (2-3 days)                                                 │
│                                                                                     │
│ Test on Real Devices:                                                               │
│ - iPhone SE (small screen)                                                          │
│ - iPhone 14 Pro (standard)                                                          │
│ - iPhone 15 Pro Max (large screen)                                                  │
│                                                                                     │
│ Critical User Flows:                                                                │
│ 1. Sign up / Sign in                                                                │
│ 2. Log workout via screenshot                                                       │
│ 3. Log workout manually                                                             │
│ 4. View workout history                                                             │
│ 5. Add PR via screenshot                                                            │
│ 6. View PRs                                                                         │
│ 7. Generate workout plan                                                            │
│ 8. View analysis cards                                                              │
│ 9. Update profile / goals                                                           │
│                                                                                     │
│ Polish Items:                                                                       │
│ - Splash screen animation                                                           │
│ - App icon design                                                                   │
│ - Status bar color matching                                                         │
│ - Handle iOS safe areas                                                             │
│ - Haptic feedback for key actions (via Haptics API)                                 │
│ - Handle network errors gracefully                                                  │
│ - Loading indicators                                                                │
│                                                                                     │
│ Step 7: App Store Submission (3-5 days)                                             │
│                                                                                     │
│ Prepare Metadata:                                                                   │
│ - App name, subtitle, description                                                   │
│ - Keywords for ASO (App Store Optimization)                                         │
│ - Screenshots (required: 6.5" and 5.5" iPhone)                                      │
│ - Preview video (optional but recommended)                                          │
│ - Privacy policy URL                                                                │
│ - Support URL                                                                       │
│                                                                                     │
│ Submit via EAS:                                                                     │
│ eas build --platform ios --profile production                                       │
│ eas submit --platform ios                                                           │
│                                                                                     │
│ Review Preparation:                                                                 │
│ - Test account credentials for Apple reviewers                                      │
│ - Demo data in test account                                                         │
│ - Review guidelines compliance check                                                │
│ - Age rating questionnaire                                                          │
│ - Camera permission justification                                                   │
│                                                                                     │
│ Expected Timeline: 1-3 days for initial review                                      │
│                                                                                     │
│ ---                                                                                 │
│ Phase 2 Implementation Plan: API Foundation                                         │
│                                                                                     │
│ Overview                                                                            │
│                                                                                     │
│ Convert existing Server Actions to REST API endpoints to enable future React Native │
│  client. This work can happen in parallel with Phase 1.                             │
│                                                                                     │
│ Step 1: API Route Structure (1 day)                                                 │
│                                                                                     │
│ Create API directory structure:                                                     │
│ src/app/api/v1/                                                                     │
│ ├── auth/                                                                           │
│ │   ├── login/route.ts                                                              │
│ │   ├── logout/route.ts                                                             │
│ │   └── session/route.ts                                                            │
│ ├── workouts/                                                                       │
│ │   ├── route.ts          # GET list, POST create                                   │
│ │   └── [id]/route.ts     # GET, PUT, DELETE individual                             │
│ ├── prs/                                                                            │
│ │   ├── route.ts                                                                    │
│ │   └── [id]/route.ts                                                               │
│ ├── profile/                                                                        │
│ │   └── route.ts                                                                    │
│ ├── goals/                                                                          │
│ │   └── route.ts                                                                    │
│ ├── plans/                                                                          │
│ │   └── route.ts                                                                    │
│ ├── exercises/                                                                      │
│ │   └── route.ts          # Public endpoint                                         │
│ └── ai/                                                                             │
│     ├── parse-workout/route.ts                                                      │
│     ├── parse-prs/route.ts                                                          │
│     ├── analyze-strength/route.ts                                                   │
│     ├── analyze-progression/route.ts                                                │
│     ├── analyze-goals/route.ts                                                      │
│     └── generate-plan/route.ts                                                      │
│                                                                                     │
│ Step 2: API Middleware & Auth (2 days)                                              │
│                                                                                     │
│ Create API auth middleware:                                                         │
│ - File: src/lib/api/middleware.ts                                                   │
│ - Verify Firebase ID token from Authorization header                                │
│ - Extract user ID from token                                                        │
│ - Attach to request context                                                         │
│ - Handle token expiration gracefully                                                │
│                                                                                     │
│ Authentication Pattern:                                                             │
│ // Client sends:                                                                    │
│ Authorization: Bearer <firebase-id-token>                                           │
│                                                                                     │
│ // Server verifies:                                                                 │
│ const token = request.headers.get('authorization')?.replace('Bearer ', '');         │
│ const decodedToken = await admin.auth().verifyIdToken(token);                       │
│ const userId = decodedToken.uid;                                                    │
│                                                                                     │
│ Rate Limiting:                                                                      │
│ - Reuse existing rate limiting logic                                                │
│ - Apply per API endpoint                                                            │
│ - Return 429 with Retry-After header                                                │
│                                                                                     │
│ Error Handling:                                                                     │
│ - Standardized error responses                                                      │
│ - Proper HTTP status codes (400, 401, 403, 404, 500)                                │
│ - Error classification from existing error-classifier.ts                            │
│                                                                                     │
│ Step 3: Refactor Server Actions to Shared Library (2-3 days)                        │
│                                                                                     │
│ Create service layer:                                                               │
│ src/lib/services/                                                                   │
│ ├── workout.service.ts     # From history/actions.ts                                │
│ ├── pr.service.ts          # From prs/actions.ts                                    │
│ ├── profile.service.ts     # From profile/actions.ts                                │
│ ├── plan.service.ts        # From plan/actions.ts                                   │
│ ├── analysis.service.ts    # From analysis/actions.ts                               │
│ └── ai.service.ts          # AI flow wrappers                                       │
│                                                                                     │
│ Pattern:                                                                            │
│ // Before (Server Action):                                                          │
│ export async function addWorkoutLog(userId: string, log: Omit<WorkoutLog, 'id' |    │
│ 'userId'>) {                                                                        │
│   // Implementation                                                                 │
│ }                                                                                   │
│                                                                                     │
│ // After (Service):                                                                 │
│ // src/lib/services/workout.service.ts                                              │
│ export async function createWorkoutLog(userId: string, log: Omit<WorkoutLog, 'id' | │
│  'userId'>) {                                                                       │
│   // Same implementation                                                            │
│ }                                                                                   │
│                                                                                     │
│ // Server Action becomes thin wrapper:                                              │
│ // src/app/history/actions.ts                                                       │
│ export async function addWorkoutLog(userId: string, log: Omit<WorkoutLog, 'id' |    │
│ 'userId'>) {                                                                        │
│   return createWorkoutLog(userId, log);                                             │
│ }                                                                                   │
│                                                                                     │
│ // API Route also wraps service:                                                    │
│ // src/app/api/v1/workouts/route.ts                                                 │
│ export async function POST(request: Request) {                                      │
│   const userId = await authenticateRequest(request);                                │
│   const log = await request.json();                                                 │
│   const result = await createWorkoutLog(userId, log);                               │
│   return Response.json(result, { status: 201 });                                    │
│ }                                                                                   │
│                                                                                     │
│ Step 4: Implement Core CRUD Endpoints (3-4 days)                                    │
│                                                                                     │
│ Priority Order (implement in this sequence):                                        │
│                                                                                     │
│ Tier 1 (MVP - Must Have):                                                           │
│ 1. GET /api/v1/workouts - List workouts with date filtering                         │
│ 2. POST /api/v1/workouts - Create workout                                           │
│ 3. GET /api/v1/prs - List personal records                                          │
│ 4. POST /api/v1/prs - Create PRs                                                    │
│ 5. GET /api/v1/profile - Get user profile                                           │
│ 6. PUT /api/v1/profile - Update profile                                             │
│ 7. GET /api/v1/goals - Get goals                                                    │
│ 8. POST /api/v1/goals - Save goals                                                  │
│ 9. GET /api/v1/exercises - List exercises (public)                                  │
│                                                                                     │
│ Tier 2 (Enhanced Features):                                                         │
│ 10. PUT /api/v1/workouts/:id - Update workout                                       │
│ 11. DELETE /api/v1/workouts/:id - Delete workout                                    │
│ 12. PUT /api/v1/prs/:id - Update PR                                                 │
│ 13. DELETE /api/v1/prs/:id - Delete PR                                              │
│ 14. GET /api/v1/plans - Get current plan                                            │
│ 15. POST /api/v1/plans - Save plan                                                  │
│                                                                                     │
│ Step 5: Implement AI Endpoints (2-3 days)                                           │
│                                                                                     │
│ AI-Powered Endpoints:                                                               │
│ POST /api/v1/ai/parse-workout                                                       │
│   Body: { photoDataUri: string }                                                    │
│   Response: { exercises: [...], metadata: {...} }                                   │
│                                                                                     │
│ POST /api/v1/ai/parse-prs                                                           │
│   Body: { photoDataUri: string }                                                    │
│   Response: { personalRecords: [...] }                                              │
│                                                                                     │
│ POST /api/v1/ai/analyze-strength                                                    │
│   Body: StrengthImbalanceInput                                                      │
│   Response: StrengthImbalanceOutput                                                 │
│                                                                                     │
│ POST /api/v1/ai/analyze-progression                                                 │
│   Body: AnalyzeLiftProgressionInput                                                 │
│   Response: AnalyzeLiftProgressionOutput                                            │
│                                                                                     │
│ POST /api/v1/ai/analyze-goals                                                       │
│   Body: AnalyzeFitnessGoalsInput                                                    │
│   Response: AnalyzeFitnessGoalsOutput                                               │
│                                                                                     │
│ POST /api/v1/ai/generate-plan                                                       │
│   Body: WeeklyWorkoutPlanInput                                                      │
│   Response: WeeklyWorkoutPlanOutput                                                 │
│                                                                                     │
│ Implementation:                                                                     │
│ - Wrap existing Genkit flows                                                        │
│ - Apply rate limiting (critical for AI endpoints)                                   │
│ - Validate input with existing Zod schemas                                          │
│ - Return standardized error responses                                               │
│ - Log usage for billing/monitoring                                                  │
│                                                                                     │
│ Step 6: API Documentation (1-2 days)                                                │
│                                                                                     │
│ Create API docs:                                                                    │
│ - File: docs/api/README.md                                                          │
│ - Document all endpoints                                                            │
│ - Request/response examples                                                         │
│ - Authentication requirements                                                       │
│ - Error codes and meanings                                                          │
│ - Rate limit information                                                            │
│                                                                                     │
│ Consider using:                                                                     │
│ - OpenAPI/Swagger spec generation                                                   │
│ - Postman collection export                                                         │
│ - TypeScript types for request/response                                             │
│                                                                                     │
│ Step 7: Testing (2-3 days)                                                          │
│                                                                                     │
│ Integration Tests:                                                                  │
│ - Test each API endpoint with Vitest                                                │
│ - Mock Firebase Admin SDK                                                           │
│ - Test authentication middleware                                                    │
│ - Test rate limiting                                                                │
│ - Test error handling                                                               │
│                                                                                     │
│ E2E Tests:                                                                          │
│ - Add Playwright tests for API routes                                               │
│ - Test full authentication flow                                                     │
│ - Test critical user journeys via API                                               │
│                                                                                     │
│ ---                                                                                 │
│ Phase 3 Migration Path: Future React Native Rebuild                                 │
│                                                                                     │
│ When PMF is validated and native experience is critical:                            │
│                                                                                     │
│ Step 1: React Native Setup                                                          │
│                                                                                     │
│ - Create new Expo project with TypeScript                                           │
│ - Install Firebase SDK (React Native compatible)                                    │
│ - Set up navigation (Expo Router or React Navigation)                               │
│ - Configure native modules (camera, notifications, etc.)                            │
│                                                                                     │
│ Step 2: Shared Component Library                                                    │
│                                                                                     │
│ - Design system with React Native components                                        │
│ - Replicate Tailwind styles with NativeWind or StyleSheet                           │
│ - Create mobile-optimized layouts                                                   │
│ - Implement native gestures and animations                                          │
│                                                                                     │
│ Step 3: Incremental Feature Migration                                               │
│                                                                                     │
│ Start with highest-value screens:                                                   │
│ 1. Workout logging (most used feature)                                              │
│ 2. Workout history                                                                  │
│ 3. Personal records                                                                 │
│ 4. Profile / goals                                                                  │
│ 5. Analysis cards                                                                   │
│ 6. Plan generation                                                                  │
│                                                                                     │
│ Step 4: Firebase Direct Integration                                                 │
│                                                                                     │
│ - Use Firebase SDK directly in React Native                                         │
│ - Client-side Firestore queries for public data                                     │
│ - Still consume REST APIs for user data (or use Firebase callable functions)        │
│ - Implement offline persistence with Firestore                                      │
│                                                                                     │
│ Step 5: Native Features                                                             │
│                                                                                     │
│ - Push notifications (Expo Notifications)                                           │
│ - Offline mode (Firestore offline persistence)                                      │
│ - Native camera with advanced features                                              │
│ - Health app integration (Apple HealthKit)                                          │
│ - Apple Watch app (future)                                                          │
│                                                                                     │
│ Step 6: Migration Strategy                                                          │
│                                                                                     │
│ Option A: Big Bang                                                                  │
│ - Build complete React Native app                                                   │
│ - Switch users over on release day                                                  │
│ - Sunset WebView app                                                                │
│                                                                                     │
│ Option B: Gradual Migration                                                         │
│ - Release React Native as separate app                                              │
│ - Let users choose during transition                                                │
│ - Migrate users in cohorts                                                          │
│ - Eventually sunset WebView version                                                 │
│                                                                                     │
│ ---                                                                                 │
│ Pros/Cons: Web vs App-Only Strategy                                                 │
│                                                                                     │
│ Keep Both Web + iOS                                                                 │
│                                                                                     │
│ Pros:                                                                               │
│ - Reach wider audience (desktop users, users without iPhones)                       │
│ - Easier onboarding (try on web, download app later)                                │
│ - SEO benefits for discovery                                                        │
│ - Better for desktop use cases (detailed analysis, planning)                        │
│ - Simpler development (web-first, mobile follows)                                   │
│                                                                                     │
│ Cons:                                                                               │
│ - Maintain two frontends (eventually)                                               │
│ - Design needs to work on both platforms                                            │
│ - Feature parity challenges                                                         │
│ - More testing surface area                                                         │
│ - Higher infrastructure costs                                                       │
│                                                                                     │
│ Best For: SaaS products, productivity tools, data analysis apps                     │
│                                                                                     │
│ App-Only (Eventually)                                                               │
│                                                                                     │
│ Pros:                                                                               │
│ - Focused product vision                                                            │
│ - Native mobile experience unlocked                                                 │
│ - Better performance (no web overhead)                                              │
│ - Simpler codebase (one client)                                                     │
│ - Native integrations (HealthKit, Watch, Shortcuts)                                 │
│ - Mobile-first design freedom                                                       │
│                                                                                     │
│ Cons:                                                                               │
│ - Lose desktop users                                                                │
│ - Harder discovery (App Store vs Google search)                                     │
│ - Platform lock-in (Apple's rules)                                                  │
│ - Can't reach Android users (unless you build that too)                             │
│ - Higher barrier to entry (must install app)                                        │
│                                                                                     │
│ Best For: Lifestyle apps, fitness apps, social apps, consumer mobile-first products │
│                                                                                     │
│ Recommendation for FitnessAI:                                                       │
│                                                                                     │
│ Start with Both → Move to App-Only post-PMF                                         │
│                                                                                     │
│ Reasoning:                                                                          │
│ - Fitness tracking is inherently mobile-first (gym use)                             │
│ - Camera features (screenshot parsing) work better native                           │
│ - Competition is mobile apps, not web apps                                          │
│ - Health app integration is valuable                                                │
│ - Offline gym access is important                                                   │
│                                                                                     │
│ Timeline:                                                                           │
│ - Phase 1: WebView wrapper keeps web + iOS in sync                                  │
│ - Phase 2: API layer works for both web and mobile                                  │
│ - Phase 3: Native rebuild, keep web for onboarding                                  │
│ - Phase 4: Evaluate web traffic, consider sunset if <5% usage                       │
│                                                                                     │
│ ---                                                                                 │
│ Critical Files                                                                      │
│                                                                                     │
│ Phase 1 (WebView Wrapper):                                                          │
│                                                                                     │
│ - mobile/App.tsx - Main WebView container (NEW)                                     │
│ - mobile/app.json - Expo configuration (NEW)                                        │
│ - mobile/eas.json - Build configuration (NEW)                                       │
│ - mobile/src/bridges/CameraBridge.ts - Native camera bridge (NEW)                   │
│                                                                                     │
│ Phase 2 (API Layer):                                                                │
│                                                                                     │
│ - src/app/api/v1/*/route.ts - API endpoints (NEW - 15+ files)                       │
│ - src/lib/api/middleware.ts - Authentication middleware (NEW)                       │
│ - src/lib/services/*.service.ts - Shared business logic (REFACTOR - 6 files)        │
│ - src/app/*/actions.ts - Server actions (MODIFY - wrap service calls)               │
│                                                                                     │
│ Critical Existing Files:                                                            │
│                                                                                     │
│ - src/lib/firebase-admin.ts - Backend Firebase (REUSE)                              │
│ - src/lib/auth-server.ts - Auth verification (MODIFY for token auth)                │
│ - src/lib/firestore-server.ts - Database operations (REUSE)                         │
│ - src/ai/flows/*.ts - AI flows (REUSE)                                              │
│ - src/lib/logging/* - Logging infrastructure (REUSE)                                │
│ - src/app/prs/rate-limiting.ts - Rate limiting (REUSE)                              │
│                                                                                     │
│ ---                                                                                 │
│ Verification & Testing                                                              │
│                                                                                     │
│ Phase 1 Verification:                                                               │
│                                                                                     │
│ WebView Functionality:                                                              │
│ 1. Install app on physical iPhone                                                   │
│ 2. Sign up with new account                                                         │
│ 3. Complete profile setup                                                           │
│ 4. Log workout via camera (screenshot)                                              │
│ 5. Log workout manually                                                             │
│ 6. View workout history with charts                                                 │
│ 7. Add PR via camera (screenshot)                                                   │
│ 8. View PRs and strength levels                                                     │
│ 9. Set fitness goals                                                                │
│ 10. Generate AI workout plan                                                        │
│ 11. View all analysis cards                                                         │
│ 12. Edit profile                                                                    │
│ 13. Sign out and sign back in                                                       │
│                                                                                     │
│ Native Features:                                                                    │
│ 1. Pull to refresh works                                                            │
│ 2. Camera permission request appears                                                │
│ 3. Photo library access works                                                       │
│ 4. Deep linking works (if implemented)                                              │
│ 5. Status bar color matches web UI                                                  │
│ 6. Safe areas respected (no content under notch)                                    │
│ 7. Splash screen displays correctly                                                 │
│ 8. App doesn't crash on background/foreground                                       │
│                                                                                     │
│ Performance:                                                                        │
│ - Page load times under 3 seconds on 5G                                             │
│ - Smooth scrolling (60fps)                                                          │
│ - Camera bridge response under 500ms                                                │
│ - No memory leaks on extended use                                                   │
│                                                                                     │
│ Phase 2 Verification:                                                               │
│                                                                                     │
│ API Endpoints:                                                                      │
│ 1. Test all endpoints with curl/Postman                                             │
│ 2. Verify authentication with Firebase ID token                                     │
│ 3. Test rate limiting (hit limits, verify 429 responses)                            │
│ 4. Test error handling (invalid inputs, missing auth, etc.)                         │
│ 5. Test all AI endpoints with real data                                             │
│ 6. Verify CORS headers if calling from web                                          │
│ 7. Load test critical endpoints (workouts, PRs)                                     │
│                                                                                     │
│ Integration:                                                                        │
│ 1. Create test React Native app consuming APIs                                      │
│ 2. Verify all CRUD operations work                                                  │
│ 3. Verify AI endpoints work with camera uploads                                     │
│ 4. Test with existing Next.js web app (if modified to use APIs)                     │
│                                                                                     │
│ ---                                                                                 │
│ Timeline Summary                                                                    │
│                                                                                     │
│ Phase 1: WebView Wrapper MVP                                                        │
│                                                                                     │
│ - Week 1: Expo setup, WebView implementation, authentication                        │
│ - Week 2: Native bridges (camera), testing on devices                               │
│ - Week 3: Polish, App Store submission, review                                      │
│                                                                                     │
│ Total: 3 weeks to App Store                                                         │
│                                                                                     │
│ Phase 2: API Foundation (Parallel)                                                  │
│                                                                                     │
│ - Week 1: API structure, auth middleware, refactor to services                      │
│ - Week 2: Implement CRUD endpoints (Tier 1)                                         │
│ - Week 3: Implement AI endpoints, testing                                           │
│ - Week 4: Documentation, integration tests                                          │
│                                                                                     │
│ Total: 4 weeks to production-ready API                                              │
│                                                                                     │
│ Combined:                                                                           │
│                                                                                     │
│ - Can work on both in parallel                                                      │
│ - API layer can be deployed to production incrementally                             │
│ - WebView app doesn't need API layer to ship                                        │
│ - Total to iOS App Store: 3 weeks                                                   │
│ - Total to API-ready architecture: 4-5 weeks                                        │
│                                                                                     │
│ Phase 3: React Native Rebuild (Future)                                              │
│                                                                                     │
│ - Estimated: 10-12 weeks for complete rebuild                                       │
│ - When: After validating PMF with WebView version                                   │
│                                                                                     │
│ ---                                                                                 │
│ Risks & Mitigations                                                                 │
│                                                                                     │
│ Risk: WebView Performance Issues                                                    │
│                                                                                     │
│ Mitigation:                                                                         │
│ - Use production build of Next.js (optimized)                                       │
│ - Enable hermes JS engine in Expo                                                   │
│ - Lazy load analysis cards                                                          │
│ - Optimize image loading in web app                                                 │
│                                                                                     │
│ Risk: Camera Bridge Complexity                                                      │
│                                                                                     │
│ Mitigation:                                                                         │
│ - Start with simple image picker (no live camera)                                   │
│ - Add live camera in v1.1 if needed                                                 │
│ - Fallback to manual entry if camera fails                                          │
│                                                                                     │
│ Risk: App Store Rejection                                                           │
│                                                                                     │
│ Mitigation:                                                                         │
│ - Review guidelines thoroughly before submission                                    │
│ - Provide clear camera permission justifications                                    │
│ - Have demo account ready for reviewers                                             │
│ - Respond quickly to review feedback                                                │
│                                                                                     │
│ Risk: Authentication Issues on Mobile                                               │
│                                                                                     │
│ Mitigation:                                                                         │
│ - Test WebView cookie sharing extensively                                           │
│ - Have Option B (native auth bridge) ready as backup                                │
│ - Implement clear error messages for auth failures                                  │
│                                                                                     │
│ Risk: Feature Parity Web vs Mobile                                                  │
│                                                                                     │
│ Mitigation:                                                                         │
│ - WebView wrapper maintains 100% parity automatically                               │
│ - Document any mobile-specific features (camera)                                    │
│ - Keep web app as source of truth                                                   │
│                                                                                     │
│ ---                                                                                 │
│ Success Metrics                                                                     │
│                                                                                     │
│ Phase 1 (WebView Wrapper):                                                          │
│                                                                                     │
│ - App Store approval within 1 week of submission                                    │
│ - Zero critical bugs in first month                                                 │
│ - 95%+ feature parity with web (100% expected)                                      │
│ - Crash rate < 0.5%                                                                 │
│ - 4+ star average rating                                                            │
│                                                                                     │
│ Phase 2 (API Layer):                                                                │
│                                                                                     │
│ - 100% of server actions have API equivalents                                       │
│ - API response times < 500ms (p95)                                                  │
│ - Zero breaking changes for existing web app                                        │
│ - API documentation complete and accurate                                           │
│ - Integration tests covering all endpoints                                          │
│                                                                                     │
│ Business Metrics:                                                                   │
│                                                                                     │
│ - Mobile app installs                                                               │
│ - Mobile vs web user engagement comparison                                          │
│ - Camera feature usage (screenshot parsing)                                         │
│ - Retention rate (mobile vs web)                                                    │
│ - Time to validate PMF                                                              │
│                                                                                     │
│ ---                                                                                 │
│ Next Steps                                                                          │
│                                                                                     │
│ 1. Confirm approach: Review this plan and confirm Phase 1 + 2 strategy              │
│ 2. Decide on authentication: WebView auth (Option A) vs Native bridge (Option B)    │
│ 3. Prepare assets: App icon, splash screen, screenshots for App Store               │
│ 4. Set up Apple Developer account: Required for App Store submission ($99/year)     │
│ 5. Begin Phase 1 implementation: Initialize Expo project                            │
│                                                                                     │
│ Estimated time to first TestFlight build: 1 week                                    │
│ Estimated time to App Store submission: 3 weeks    

~/.claude/plans/sleepy-jingling-zebra.md