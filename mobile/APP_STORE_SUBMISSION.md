# App Store Submission Guide

Complete guide for preparing and submitting FitnessAI to the Apple App Store.

## Pre-Submission Checklist

Before you start the submission process:

### Development Completion
- [ ] All tests passing (see TESTING.md)
- [ ] No crashes on iOS 15.0+
- [ ] All features working (auth, workouts, camera, analysis)
- [ ] Performance optimized (load times < 3 sec)
- [ ] No console errors or warnings

### Content Preparation
- [ ] App name decided: **FitnessAI**
- [ ] Subtitle optional: **Your AI Fitness Coach**
- [ ] Description written
- [ ] Keywords selected (5-10)
- [ ] Support URL: https://fitnessai.com/support
- [ ] Privacy Policy URL: https://fitnessai.com/privacy
- [ ] Homepage: https://fitnessai.com
- [ ] Copyright year: 2025

### Assets Prepared
- [ ] App Icon 1024×1024 (no transparency, no rounded corners)
- [ ] Screenshots for 6.5" and 5.5" displays
- [ ] Preview video (optional)
- [ ] Support email configured

### Account Requirements
- [ ] Apple Developer account active
- [ ] App Store Connect access
- [ ] Apple Developer Program membership ($99)
- [ ] Team ID obtained
- [ ] Bundle identifier registered

## Step 1: App Store Connect Setup

### 1.1 Create the App

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Sign in with Apple ID
3. Click "My Apps" → "+"
4. Select "New App"

### 1.2 App Details

Fill in the following:

| Field | Value | Notes |
|-------|-------|-------|
| **Platform** | iOS | Required |
| **Name** | FitnessAI | 30 character max, shown in App Store |
| **Bundle ID** | com.reimagen.fitnessai | Must match Xcode |
| **SKU** | fitnessai-1-0-0 | Unique, not shown to users |
| **Full Access** | No | Unless you have team members |

Click "Create"

## Step 2: App Information

### 2.1 General App Information

1. Go to App Store Connect > FitnessAI > App Information
2. Fill in:

**App Name:** FitnessAI (30 chars max)

**Subtitle:** Your AI Fitness Coach (30 chars max, optional)

**Privacy Policy URL:**
```
https://fitnessai.com/privacy
```

**Support URL:**
```
https://fitnessai.com/support
```

**App Website:**
```
https://fitnessai.com
```

### 2.2 Category & Content Rating

1. **Primary Category:** Health & Fitness
2. **Secondary Category:** (Optional) Lifestyle

3. **Content Rating:**
   - Click "Rate"
   - Answer questions about content:
     - Violence: None
     - Profanity: None
     - Sexual Content: None
     - Gambling: None
     - Tobacco/Alcohol: None
   - Save rating

## Step 3: App Description & Keywords

### 3.1 Description

In App Store Connect > Version Information, add:

```
FitnessAI: Your Personal AI Fitness Coach

Take your fitness to the next level with AI-powered insights and personalized guidance.

FEATURES:
📷 Smart Workout Logging
- Take a screenshot of your workout log
- AI automatically extracts exercises, sets, and reps
- Or log workouts manually for complete control

💪 Personal Records Tracking
- Track your PRs for every exercise
- Automatic strength level classification
- Monitor your progress over time

📊 Intelligent Analysis
- Strength imbalance detection
- Lift progression tracking
- Goal analysis and recommendations

🏋️ Personalized Plans
- Generate custom workout plans
- Tailored to your fitness goals
- Adapt your training automatically

🎯 Goal Setting & Tracking
- Set specific fitness goals
- Track progress toward goals
- Get AI coaching recommendations

PERMISSIONS:
- Camera: Used to parse your workout screenshots for quick logging
- Photos: Allows selecting existing images to process

ABOUT US:
Reimagen is building AI-powered tools for health and fitness. FitnessAI is our flagship app for strength training athletes.

Questions? Visit fitnessai.com or email support@fitnessai.com
```

Character limit: 4000

### 3.2 Keywords

Select 5-10 relevant keywords (space-separated):
```
fitness workout ai training strength gym exercise personal trainer health logging
```

### 3.3 Release Notes

For version 1.0.0:
```
🎉 FitnessAI has launched!

This is the initial release of FitnessAI, featuring:
- AI-powered workout logging via screenshot
- Personal records tracking
- Strength analysis
- Intelligent workout plan generation
- Goal setting and tracking

This is a WebView-wrapped version of our web app, offering 100% feature parity with web.

Feedback? Visit https://fitnessai.com/feedback
```

## Step 4: App Preview & Screenshots

### 4.1 App Preview (Optional but Recommended)

30-second video showing key features:

**Shot 1 (0-5 sec):** Sign in screen
**Shot 2 (5-10 sec):** Log workout via camera
**Shot 3 (10-15 sec):** View history
**Shot 4 (15-20 sec):** View strength analysis
**Shot 5 (20-25 sec):** Generate workout plan
**Shot 6 (25-30 sec):** Call to action - "Download FitnessAI"

Audio: Optional (music is good)
Format: MP4, H.264, max 500 MB

### 4.2 Screenshots

Required for TWO sizes:
- 5.5-inch iPhone (1242×2208 px) - iPhone 8
- 6.5-inch iPhone (1242×2688 px) - iPhone 13 Pro Max

You can generate screenshots using Xcode or third-party tools.

**Required Screenshots (in order):**

**Screenshot 1: Login/Signup**
- Show clean login interface
- Emphasize quick setup
- Title: "Easy Sign-In"

**Screenshot 2: Workout Logging - Camera**
- Show camera button highlighted
- Title: "Snap a Screenshot"
- Subtitle: "AI Extracts Your Workout"

**Screenshot 3: Workout History**
- Show list of logged workouts
- Title: "Track Your Progress"
- Subtitle: "View All Your Workouts"

**Screenshot 4: Personal Records**
- Show PRs list with strength levels
- Title: "Monitor Your PRs"
- Subtitle: "Track Strength Progress"

**Screenshot 5: Strength Analysis**
- Show analysis charts
- Title: "Intelligent Analysis"
- Subtitle: "AI Insights on Your Strength"

**Screenshot 6: Workout Plan**
- Show generated plan
- Title: "Get Personalized Plans"
- Subtitle: "AI Creates Your Workouts"

### 4.3 Upload Screenshots

1. In App Store Connect, go to Screenshots section
2. Select device size (5.5" first)
3. Upload screenshots 1-6 in order
4. Add text overlay with titles/subtitles
5. Repeat for 6.5" size (can use same images)

## Step 5: App Icon

### 5.1 Icon Requirements

- **Size:** 1024 × 1024 px
- **Format:** PNG, JPEG
- **Design:**
  - No rounded corners (system applies them)
  - 20pt safe margin (full usable area: 960×960)
  - No transparency (solid background)
  - No app name or text

### 5.2 Icon Design

Design suggestions for FitnessAI:
- Incorporate dumbbell or fitness icon
- Use brand colors
- Keep simple and recognizable at small sizes
- Ensure good contrast

### 5.3 Upload Icon

1. In App Store Connect > App Icon section
2. Drag and drop your 1024×1024 image
3. System automatically creates all required sizes

## Step 6: Build & Upload

### 6.1 Create Production Build

```bash
cd mobile
npm run build:ios
```

Expected output:
```
✅ Build successful
📦 Build ID: abc123def456
⏱️ Estimated time: 15-30 minutes
```

Wait for build to complete.

### 6.2 Upload to App Store Connect

Option A: Automatic via EAS

```bash
npm run submit:ios
```

Option B: Manual Upload

1. In App Store Connect, go to TestFlight > Internal Testing
2. Wait for build to appear
3. Once marked as Ready for Distribution:
   - Go to Version Information
   - Click "Build" section
   - Select your build
   - Click "Save"

## Step 7: Compliance & Rating

### 7.1 Export Compliance

1. In App Store Connect > App Information
2. Answer: "Does your app use encryption?"
   - Select **No** (default unless using special encryption)

### 7.2 Content Rating

Already completed in Step 2.2

### 7.3 User Privacy

1. Go to App Privacy section
2. Add privacy disclosures:

**Data Collected:**
- User Profile (name, email, age)
- Fitness Data (workouts, PRs, goals)
- Photos (camera/library uploads)

**Usage:**
- Health & fitness tracking
- AI analysis and recommendations

**Third Parties:**
- Firebase (Google) - user authentication
- Gemini AI (Google) - AI analysis

**Your Privacy Policy URL:**
```
https://fitnessai.com/privacy
```

## Step 8: Ready for Submission

### 8.1 Final Checklist

Before submitting:

- [ ] App Information complete
- [ ] Description & keywords added
- [ ] Screenshots uploaded (2 sizes, 6 images)
- [ ] App icon uploaded (1024×1024)
- [ ] Release notes written
- [ ] Privacy policy URL added
- [ ] Support URL added
- [ ] Content rating completed
- [ ] Build uploaded and marked ready
- [ ] No test credentials exposed
- [ ] No "beta" or "test" mentioned

### 8.2 Submit for Review

1. In App Store Connect, click **Submit for Review**
2. Confirm platform, category, and rating
3. Complete questionnaire:
   - Advertising Identifier: No (unless you use ads)
   - Exact ad targeting: N/A
   - User privacy: Yes (privacy policy provided)
   - Accurate ratings: Yes
   - Third-party SDKs: Yes (Firebase, Google)
4. Click **Submit**

Expected review time: **1-2 business days**

(Rare cases: 3-5 days if Apple has questions)

## Step 9: Monitoring & Response

### 9.1 Check Status

1. App Store Connect > App > Version Information
2. Status appears as: **In Review** → **Review in Progress**
3. Check status daily

### 9.2 Respond to Feedback

If Apple rejects the app:

1. Read the rejection reason carefully
2. Fix the issue (common reasons below)
3. Increment version (1.0.1)
4. Upload new build
5. Submit again

**Common Rejection Reasons:**

| Reason | Fix |
|--------|-----|
| Incomplete app description | Add more detail, fix typos |
| Low-quality screenshots | Higher resolution, better design |
| Missing privacy policy | Ensure URL is valid, not 404 |
| Unclear app purpose | Rewrite description, fix keywords |
| Technical issues | Fix crashes, test more thoroughly |
| Guideline violation | Review Apple's guidelines |

### 9.3 Approval

Once approved, your app will:
1. Appear in App Store within 1 hour
2. Be available in US App Store first
3. Roll out to other regions over 24-48 hours
4. Show up in search results

## Step 10: Post-Launch

### 10.1 Monitor Reviews

1. Check App Store daily for first week
2. Respond to user reviews (positive and negative)
3. Track rating (target: 4.0+ stars)

### 10.2 Plan Updates

For version 1.0.1 (bug fixes):
- Increment build number
- Update release notes
- Resubmit

For version 1.1 (new features):
- Increment version number
- Add changelog
- Update screenshots if needed
- Resubmit

## Troubleshooting

### Issue: Build Not Appearing in App Store Connect

**Solution:**
1. Wait 10-15 minutes for build to process
2. Refresh page
3. Check build status: `eas build:list`
4. Check logs: `eas build:logs <build-id>`

### Issue: "App Rejected - Incomplete App Information"

**Solution:**
1. Check all fields are filled
2. Ensure URLs are valid (test by visiting)
3. Re-read App Review Guidelines
4. Make sure privacy policy mentions data usage

### Issue: "Invalid Bundle Identifier"

**Solution:**
1. Verify bundle ID in app.json matches App Store
2. Check provisioning profile is correct
3. Rebuild with: `npm run build:ios`

### Issue: "App References Non-Existent Capability"

**Solution:**
1. Check app.json for undefined capabilities
2. Review app.json for syntax errors
3. Remove any beta/test features

### Issue: Camera or Photo Permission Rejected

**Solution:**
1. Ensure permission strings in app.json explain usage:
   ```json
   {
     "ios": {
       "infoPlist": {
         "NSCameraUsageDescription": "FitnessAI uses your camera to parse workout screenshots for quick logging."
       }
     }
   }
   ```
2. Make sure feature is actually used

## Timeline

| Task | Duration | Notes |
|------|----------|-------|
| Prep content | 1-2 hours | Describe app, prep screenshots |
| Build app | 15-30 min | EAS build |
| Submit | 5 min | One-click submission |
| In Review | 24-48 hours | Check daily |
| If Rejected | 2-4 hours | Fix and resubmit |
| **Total to Live** | **1-3 days** | |

## Success Metrics

After launch:

- Target: 100+ downloads in first week
- Target: 4.0+ star rating
- Target: <0.5% crash rate
- Monitor and fix issues quickly

## Resources

- [App Store Connect](https://appstoreconnect.apple.com)
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines)
- [App Store Connect Help](https://help.apple.com/app-store-connect)
- [EAS Submit Docs](https://docs.expo.dev/submit/introduction)
- [Privacy Policy Template](https://fitnessai.com/privacy)

## Support

Questions during submission?

- Email: support@fitnessai.com
- App Store Connect: Click "Contact Us" in App Store Connect
- Expo Help: https://docs.expo.dev

---

**Status:** ☐ Submitted
**Date Submitted:** _____________
**Approval Date:** _____________
**App Store URL:** _____________
