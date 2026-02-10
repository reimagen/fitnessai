# FitnessAI Mobile App

iOS app for FitnessAI built with Expo and WebView wrapper around the Next.js web application.

## Architecture

This is **Phase 1** of the mobile strategy: a WebView wrapper MVP that wraps the existing Next.js web app with native integrations for camera, photos, and other features.

**Key Benefits:**
- No frontend rewrite needed
- All 26 server actions work immediately
- All AI features work out of the box
- Web and mobile stay in sync automatically
- Fastest path to App Store (2-3 weeks)

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g eas-cli`
- Apple Developer account (for App Store submission)

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
EXPO_PUBLIC_WEB_URL=http://localhost:3000  # For local dev
# EXPO_PUBLIC_WEB_URL=https://app.fitnessai.com  # For production
```

## Development

### Start Local Development Server

```bash
npm start
```

This starts the Expo development server. You can then:
- Press `i` to open iOS simulator
- Press `a` to open Android emulator
- Scan QR code with Expo Go app on physical device

### Running on Physical Device

1. Install [Expo Go](https://expo.dev/client) on your iPhone
2. Run `npm start`
3. Scan the QR code with your iPhone camera or Expo Go app

### Updating the Web App

The app loads the web URL specified in `EXPO_PUBLIC_WEB_URL`. To test with a local web server:

1. Ensure the Next.js app is running on localhost:3000
2. Update `.env` to use `EXPO_PUBLIC_WEB_URL=http://localhost:3000`
3. Restart the app

For remote testing, update the environment variable to point to a deployed web URL.

## Building

### Development Build (for testing)

```bash
npm run build:ios:dev
```

### Preview Build (for TestFlight)

```bash
npm run build:ios:preview
```

### Production Build (for App Store)

```bash
npm run build:ios
```

### Submit to App Store

After building, submit with:

```bash
npm run submit:ios
```

You'll need to configure your Apple Team ID and credentials in `eas.json`.

## Native Features

### Camera Integration

The app exposes a JavaScript bridge for native camera access:

```typescript
// In web app (Next.js)
import { CameraBridge } from '../mobile/src/bridges/CameraBridge';

// Take a photo
const base64 = await CameraBridge.takePhoto();

// Select from photo library
const base64 = await CameraBridge.selectPhoto();
```

The native bridge:
- Returns base64-encoded image data
- Handles permissions automatically
- Works with existing parseWorkoutScreenshot and parsePersonalRecords AI flows

### WebView Configuration

The WebView is configured with:
- Cookie sharing enabled (same session as web)
- JavaScript enabled
- DOM storage enabled
- Local file access allowed
- Mixed content allowed

This means the mobile app has full feature parity with the web app.

## Project Structure

```
mobile/
├── App.tsx              # Main WebView component
├── app.json             # Expo configuration
├── eas.json             # EAS Build configuration
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript configuration
├── assets/              # App icons and splash screens
└── src/
    └── bridges/         # Native bridge implementations
        └── CameraBridge.ts
```

## Features

### ✅ Working Out of Box
- User authentication (Firebase)
- Workout logging (manual & via screenshot)
- Personal records tracking
- Strength analysis
- Progression tracking
- Goal setting
- Workout plan generation
- All AI-powered features

### 🔧 Native Bridges
- Camera access for screenshot parsing
- Photo library access
- Pull-to-refresh
- Status bar styling
- Safe area handling

### 🔮 Future (Phase 2: API Layer)
- REST API endpoints for React Native rebuild
- No changes needed to current web app

### 🚀 Future (Phase 3: React Native Rebuild)
- True native iOS/Android experience
- Native UI components
- HealthKit integration
- Offline mode
- Push notifications
- Apple Watch app

## Troubleshooting

### WebView Not Loading
- Check `EXPO_PUBLIC_WEB_URL` is correct
- Verify the web app is running and accessible
- Check network connectivity
- Review device logs: `eas logs --platform ios`

### Camera Not Working
- Check app permissions in iPhone Settings > FitnessAI > Camera/Photos
- Ensure the web app supports the native bridge
- Review error messages in browser console

### Authentication Issues
- WebView shares cookies with the web session
- If using a new session, log in through the web app first
- For production, ensure both web and app point to same domain

## Testing Checklist

Before submitting to App Store:

- [ ] Sign up works (new account)
- [ ] Login works (existing account)
- [ ] Complete profile setup
- [ ] Log workout via camera
- [ ] Log workout manually
- [ ] View workout history
- [ ] Add PR via camera
- [ ] View PRs and strength levels
- [ ] Set fitness goals
- [ ] Generate workout plan
- [ ] View analysis cards
- [ ] Edit profile
- [ ] Sign out and sign back in
- [ ] Tested on iPhone SE, 14 Pro, 15 Pro Max
- [ ] No crashes on background/foreground
- [ ] Smooth scrolling (60fps)
- [ ] Load times < 3 seconds on 5G

## Documentation

- [Expo Documentation](https://docs.expo.dev)
- [React Native WebView](https://github.com/react-native-webview/react-native-webview)
- [EAS Build](https://docs.expo.dev/build/setup)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines)

## Phase Strategy

This app is **Phase 1 of 3**:

1. **Phase 1 (Current):** WebView wrapper MVP (2-3 weeks to App Store)
2. **Phase 2 (Parallel):** REST API layer (4 weeks) - allows future React Native app
3. **Phase 3 (Post-PMF):** React Native rebuild consuming Phase 2 APIs (10-12 weeks)

After validating PMF with this WebView version, we'll rebuild in React Native for true native experience while maintaining feature parity and data access.

## License

Proprietary - FitnessAI
