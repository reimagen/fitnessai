# EAS Build & Deployment Setup Guide

This guide walks through setting up Expo Application Services (EAS) Build for iOS app building and App Store submission.

## Prerequisites

1. **Expo Account**
   - Sign up at https://expo.dev
   - Confirm email

2. **Apple Developer Account**
   - Enroll at https://developer.apple.com
   - Cost: $99/year
   - Required for TestFlight and App Store submission

3. **Node.js & npm**
   - Version 18+ recommended
   - Verify: `node --version && npm --version`

4. **EAS CLI**
   ```bash
   npm install -g eas-cli@latest
   ```

## Step 1: EAS Project Initialization

From the `mobile/` directory:

```bash
eas login
```

This will:
- Prompt you to sign in to your Expo account
- Set up the EAS project for your app

Verify setup:
```bash
eas whoami
```

## Step 2: iOS Bundle Identifier Setup

### Option A: Using Existing Bundle ID

If you have an existing Apple App ID:

```bash
eas build:configure --platform ios
```

When prompted, select your team and existing App ID.

### Option B: Create New Bundle ID

1. Go to [Apple Developer Console](https://developer.apple.com/account)
2. Sign in with your Apple ID
3. Navigate to Certificates, Identifiers & Profiles > Identifiers
4. Click the "+" button
5. Select "App IDs"
6. Fill in:
   - **App Name:** FitnessAI
   - **Bundle ID:** `com.reimagen.fitnessai` (must be unique)
   - **Capabilities:** Check "HealthKit" (for future integration)
7. Click "Continue" and "Register"

### Configure in app.json

Update `app.json`:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.reimagen.fitnessai",
      "buildNumber": "1"
    }
  }
}
```

## Step 3: Configure eas.json

Update the `eas.json` file with your team ID and credentials:

```bash
# Get your Apple Team ID from:
# https://developer.apple.com/account > Membership > Team ID
```

Then update `eas.json`:

```json
{
  "cli": {
    "version": ">= 5.0.0",
    "requireCommit": false
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m1"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "m1",
        "image": "latest"
      },
      "env": {
        "EXPO_PUBLIC_WEB_URL": "https://staging.fitnessai.com"
      }
    },
    "production": {
      "distribution": "store",
      "ios": {
        "resourceClass": "m1",
        "image": "latest",
        "enterpriseProvisioning": "adhoc"
      },
      "env": {
        "EXPO_PUBLIC_WEB_URL": "https://app.fitnessai.com"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleTeamId": "YOUR_TEAM_ID",
        "appleId": "your-apple-id@example.com",
        "appleIdPassword": "@env APPLE_ID_PASSWORD"
      }
    }
  }
}
```

Replace:
- `YOUR_TEAM_ID` - Your Apple Developer Team ID
- `your-apple-id@example.com` - Your Apple ID email

## Step 4: Create App Store Connect Account

1. Visit [App Store Connect](https://appstoreconnect.apple.com)
2. Sign in with your Apple ID
3. Click "My Apps"
4. Click the "+" button
5. Select "New App"
6. Fill in:
   - **Platform:** iOS
   - **Name:** FitnessAI
   - **Bundle ID:** com.reimagen.fitnessai (from step 2)
   - **SKU:** fitnessai (internal ID, unique)
   - **Full Access:** No (unless team)
7. Click "Create"

## Step 5: Set Up App Store Connect Details

### Version and Build

1. Go to your app on App Store Connect
2. Click "iOS App"
3. Under "Version Information," set:
   - **Version:** 1.0.0
   - **Build:** Auto-increment in eas.json

### App Information

1. **App Name:** FitnessAI
2. **Subtitle:** AI-powered fitness tracking (optional)
3. **Description:**
   ```
   FitnessAI is your personal AI fitness coach.

   Features:
   - Log workouts via screenshot parsing or manual entry
   - Track personal records and strength progression
   - Get personalized workout plans
   - Analyze fitness goals and progress
   - View detailed strength metrics

   Camera access is used to parse workout screenshots for quick logging.
   Photo library access allows selecting existing images to process.
   ```
4. **Keywords:** fitness, workout, ai, strength, training, gym, exercise
5. **Support URL:** https://fitnessai.com/support
6. **Privacy Policy URL:** https://fitnessai.com/privacy

### App Icon

1. Prepare icon (1024×1024 PNG)
2. Upload in App Store Connect > App Icon section
3. Icon should have 20pt safe margin

### Screenshots

Minimum 2 screenshots for both:
- 6.5-inch display (e.g., iPhone 15 Pro Max)
- 5.5-inch display (e.g., iPhone SE)

Required screenshots:
1. Login/Sign-up screen
2. Workout history
3. Personal records
4. Analysis/insights
5. Plan generation
6. Profile settings

## Step 6: Credentials & Passwords

### App-Specific Password

For automated submission, create an app-specific password:

1. Go to [Apple ID Account](https://appleid.apple.com)
2. Sign in
3. Go to Security
4. Click "Generate password" under App-Specific Passwords
5. Select "Other (custom name)" → "EAS Submit"
6. Copy the generated password

### Set Environment Variable

```bash
# Add to your shell profile or .env file
export APPLE_ID_PASSWORD="your-app-specific-password"

# Or when building:
APPLE_ID_PASSWORD=your-password eas build --platform ios --profile production
```

## Step 7: Build & Test

### Development Build (Local Testing)

```bash
npm run build:ios:dev
```

This creates a development client that:
- Loads from localhost
- Allows code reload
- Shows dev tools

Install on your device:
1. Download the build when ready
2. Open the `.ipa` file
3. Or scan QR code with Expo Go app

### Preview Build (TestFlight)

```bash
npm run build:ios:preview
```

This creates a production build but in "internal" distribution mode.

Install via TestFlight:
1. Build completes
2. Go to App Store Connect > TestFlight > Internal Testing
3. Add testers (Apple ID emails)
4. Testers receive email with TestFlight link
5. Install via TestFlight app

**Expected wait time:** 10-30 minutes

### Production Build (App Store)

```bash
npm run build:ios
```

This creates a store-signed build ready for submission.

**Build time:** 15-30 minutes

Once complete, the app will be available in App Store Connect ready for review.

## Step 8: Submit to App Store

Option A: Automatic submission with EAS

```bash
npm run submit:ios
```

Option B: Manual submission via App Store Connect

1. Go to App Store Connect > App > Versions
2. Click "Create a New Version"
3. Upload build from "Build" section
4. Fill in Release Notes
5. Click "Submit for Review"

## App Store Review Checklist

Before submitting, ensure:

- [ ] App name, description, keywords are clear
- [ ] Icons and screenshots are high quality
- [ ] Privacy policy is linked
- [ ] Terms of service are linked (if applicable)
- [ ] Test account credentials provided
- [ ] Camera/photo permissions justify camera usage
- [ ] No beta/test features exposed
- [ ] All links (support, privacy) are working
- [ ] App doesn't access data without permission
- [ ] No external payment systems mentioned (use in-app purchases)
- [ ] No rejected/flagged apps from same developer

## Common Issues

### Issue: "Bundle identifier not found"

**Solution:** Ensure bundle ID in `app.json` matches App Store Connect ID

```json
{
  "ios": {
    "bundleIdentifier": "com.reimagen.fitnessai"
  }
}
```

### Issue: "App type not found"

**Solution:** Create the App on App Store Connect first

### Issue: "Provisioning profile invalid"

**Solution:** Regenerate provisioning profiles via `eas build:configure`

### Issue: "Certificate expired"

**Solution:** Revoke and regenerate:

```bash
eas credentials --platform ios
```

Select "Clear all" and regenerate

## Environment-Specific Configuration

### Development

```bash
# .env.development
EXPO_PUBLIC_WEB_URL=http://localhost:3000
```

### Staging

```bash
# .env.staging
EXPO_PUBLIC_WEB_URL=https://staging.fitnessai.com
```

### Production

```bash
# .env.production
EXPO_PUBLIC_WEB_URL=https://app.fitnessai.com
```

Switch environments:

```bash
# Use preview env
npm run build:ios:preview

# Use production env
npm run build:ios
```

## Monitoring Builds

Monitor build status:

```bash
eas build:list
eas build:view <build-id>
```

View build logs:

```bash
eas build:logs <build-id>
```

## Version Management

After each release:

1. Increment version in `app.json`:
   ```json
   {
     "version": "1.0.1"
   }
   ```

2. Update build number:
   ```json
   {
     "ios": {
      "buildNumber": "2"
     }
   }
   ```

3. Add release notes in App Store Connect

## Timeline to Launch

| Phase | Duration | Steps |
|-------|----------|-------|
| Setup | 1-2 hours | EAS init, Apple account, app on App Store Connect |
| Build | 15-30 min | `npm run build:ios` |
| Submit | 5 min | `npm run submit:ios` |
| Review | 1-2 days | Apple reviews submission |
| **Total** | **1-3 days** | |

## Support Resources

- [EAS Build Docs](https://docs.expo.dev/build/setup)
- [App Store Connect Help](https://help.apple.com/app-store-connect)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines)
- [EAS Build Status](https://status.expo.io)

## Next Steps

After EAS is configured:

1. ✅ Test development build locally
2. ✅ Create preview build for TestFlight
3. ✅ Test with team/early users
4. ✅ Fix any issues found
5. ✅ Create production build
6. ✅ Submit to App Store
7. ✅ Monitor review status
8. ✅ Launch on App Store

See [README.md](./README.md) for building and testing instructions.
