# Authentication for FitnessAI Mobile (WebView)

## Overview

The FitnessAI mobile app uses a **WebView wrapper approach** for authentication. The web app handles all authentication logic, and the WebView shares the same session cookies, enabling seamless authentication without additional code changes.

## How It Works

### 1. Authentication Flow (Option A: Recommended for Phase 1)

```
┌─────────────────┐
│   WebView App   │
│   (React)       │
└────────┬────────┘
         │
         │ User signs in/up
         │
         ▼
┌─────────────────────────┐
│  Firebase Auth (Client) │ ◄─── Uses Firebase SDK (same as web)
│  (signinWithEmail, etc) │
└────────┬────────────────┘
         │
         │ Gets ID Token
         │
         ▼
┌────────────────────────────┐
│  Next.js API: /api/session │ ◄─── Verifies ID token
│  (POST with idToken)       │
└────────┬───────────────────┘
         │
         │ Creates session cookie (__session)
         │
         ▼
┌─────────────────────────────┐
│  Sets HTTP-only Cookie      │ ◄─── Shared with WebView!
│  (__session with 5-day exp) │
└─────────────────────────────┘
```

### 2. WebView Cookie Sharing (Key to Working Auth)

The WebView is configured to share cookies:

```typescript
// App.tsx
<WebView
  incognito={false}                    // ✅ Allow persistent storage
  sharedCookiesEnabled={true}          // ✅ Share cookies with system
  thirdPartyCookiesEnabled={true}      // ✅ Allow third-party cookies
  domStorageEnabled={true}             // ✅ Allow DOM storage
/>
```

This means:
- When the web app creates a session cookie, it's automatically available to the WebView
- If the user is already logged in on the web, the WebView inherits that session
- No additional authentication bridge needed for Phase 1

## Development Testing

### Testing Authentication Flow

#### Test 1: Fresh Sign-Up (New User)

1. Start the Expo dev server: `npm start`
2. Open the app in iOS simulator
3. You should see the FitnessAI login page
4. Enter new email and password
5. Click "Sign up"
6. **Expected:** User is logged in and redirected to home page

#### Test 2: Sign-In (Existing User)

1. After test 1, sign out (menu > sign out)
2. Enter the same email and password
3. Click "Sign in"
4. **Expected:** User is logged in and redirected to home page

#### Test 3: Cookie Persistence (Restart App)

1. After logging in, go to home screen
2. Force close the app (swipe up)
3. Reopen the app
4. **Expected:** User is still logged in (no need to sign in again)

#### Test 4: Session Expiry (5 Days)

- Session cookies last 5 days
- After 5 days without using the app, user will be logged out
- User can sign in again normally

### Testing on Production Build

For preview/production builds, update `.env`:

```bash
EXPO_PUBLIC_WEB_URL=https://staging.fitnessai.com  # or production URL
```

Then:
```bash
npm run build:ios:preview  # TestFlight build
npm start                   # Test locally
```

## Potential Issues & Solutions

### Issue 1: Not Logged In After Launch

**Symptom:** User signs in, but after closing and reopening the app, they're logged out.

**Cause:** Cookie sharing not working properly or WebView configuration incorrect.

**Solution:**
1. Check WebView config in `App.tsx`:
   - `incognito={false}` ✅
   - `sharedCookiesEnabled={true}` ✅
   - `domStorageEnabled={true}` ✅
2. Check that web app is setting cookies with proper SameSite policy
3. For development: ensure `secure` cookie flag is disabled in dev

### Issue 2: Infinite Loading on Login

**Symptom:** User clicks sign in but the page never loads.

**Cause:** Network issue or web app not accessible.

**Solution:**
1. Verify `EXPO_PUBLIC_WEB_URL` is correct
2. Check that the web app is running: `curl http://localhost:3000`
3. Check device network connectivity
4. Review device logs: Xcode > Devices > Console

### Issue 3: Redirect Loop

**Symptom:** After signing in, user is redirected back to login page repeatedly.

**Cause:** Session verification failing on backend.

**Solution:**
1. Check session cookie is being created: Xcode > Devices > Console
2. Verify Firebase Admin SDK is configured correctly
3. Check that `__session` cookie is being set with correct flags

### Issue 4: CORS or "Same Origin" Errors

**Symptom:** Console shows CORS errors or "not same origin" errors.

**Cause:** WebView security policy is too strict.

**Solution:**
1. Ensure `thirdPartyCookiesEnabled={true}` is set
2. Add proper CORS headers to your API routes
3. For localhost testing, CORS should not be an issue

## Migration to Native Auth (Phase 2 / Future)

When moving to a React Native rebuild (Phase 3), you'll need:

1. **Option B: Native Firebase Auth with Token Bridge**
   - Initialize Firebase Auth in React Native
   - Use Firebase SDK directly
   - Store ID tokens in secure storage
   - Inject tokens into headers instead of relying on cookies

2. **Changes to Next.js Backend:**
   ```typescript
   // src/lib/api/middleware.ts - FUTURE API LAYER
   export async function verifyFirebaseToken(request: Request) {
     const authHeader = request.headers.get('authorization');
     const token = authHeader?.replace('Bearer ', '');

     if (!token) {
       return null;
     }

     const adminAuth = getAdminAuth();
     const decodedToken = await adminAuth.verifyIdToken(token);
     return decodedToken;
   }
   ```

3. **Usage in API Routes:**
   ```typescript
   // src/app/api/v1/workouts/route.ts - FUTURE
   export async function POST(request: Request) {
     const decodedToken = await verifyFirebaseToken(request);
     if (!decodedToken) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
     }

     const userId = decodedToken.uid;
     // ... rest of endpoint
   }
   ```

## Production Deployment

### Prerequisites

1. **Apple Developer Account** ($99/year)
2. **App Store Connect** account
3. **EAS Build credentials** (Expo)
4. **Production Web App URL**

### Environment Setup

1. Update `.env` for production:
   ```bash
   EXPO_PUBLIC_WEB_URL=https://app.fitnessai.com
   ```

2. Configure `eas.json`:
   ```json
   {
     "submit": {
       "production": {
         "ios": {
           "appleTeamId": "YOUR_TEAM_ID",
           "appleId": "your-email@example.com"
         }
       }
     }
   }
   ```

3. Set Apple ID password:
   ```bash
   export APPLE_ID_PASSWORD=your-app-specific-password
   ```

### Build & Submit

```bash
# Build for App Store
npm run build:ios

# Submit to App Store
npm run submit:ios
```

### App Store Requirements

1. **Privacy Policy:** Must include camera/photo library usage disclosure
2. **Test Account:** Provide credentials for App Store reviewers
3. **Demo Data:** Ensure test account has valid workout data
4. **Screenshots:** 2-3 screenshots showing key features
5. **Description:** Clear explanation of fitness tracking features

## Debugging

### Enable Console Logging

Add to `App.tsx`:

```typescript
// Add to WebView
onConsoleMessage={(msg) => {
  console.log(`WebView: ${msg.message}`);
}}
onError={(error) => {
  console.error('WebView Error:', error);
}}
```

### Monitor Network Requests

In Xcode:
1. Run app in simulator
2. Open Xcode > Devices and Simulators
3. Select your device
4. Click Console tab
5. Filter for network activity

### Check Cookies

In your web app console (via WebView):

```javascript
// This should return the __session cookie
document.cookie
```

## Summary

- ✅ **For Phase 1:** WebView cookie sharing handles auth automatically
- ✅ **No code changes needed** to Next.js auth system
- ✅ **100% feature parity** with web authentication
- 🔮 **For Phase 3:** Will migrate to native Firebase Auth with token-based API calls
- 📱 **Works offline:** Session persists even if network is temporarily unavailable

## Additional Resources

- [Firebase Web SDK](https://firebase.google.com/docs/auth)
- [React Native WebView Documentation](https://github.com/react-native-webview/react-native-webview)
- [HTTP-only Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#restrict_access_to_cookies)
- [Same-Site Cookie Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
