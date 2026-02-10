# Testing Guide for FitnessAI Mobile

Comprehensive testing checklist and procedures for the FitnessAI iOS app before App Store submission.

## Pre-Testing Setup

### Requirements

- iPhone SE (small, 375pt width)
- iPhone 14 Pro (standard, 390pt width)
- iPhone 15 Pro Max (large, 430pt width)
- iOS 15.0 or later on all devices

### Test Account

Create a test account on the staging web app:

```
Email: test@fitnessai.dev
Password: TestPassword123!
```

Populate test account with:
- 5-10 workout logs
- 3-5 personal records
- Fitness goals
- Generated plan

## Test Plan

### 1. App Launch & Loading (5 min)

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| **Cold Launch** | Force close app, reopen | App launches with splash screen, web loads in <3 sec | ☐ |
| **Splash Screen** | Observe launch | Splash displays 1-2 sec, then transitions to app | ☐ |
| **Loading Indicator** | Check while loading | Activity spinner visible while web page loads | ☐ |
| **Status Bar** | Observe top of screen | Status bar dark text on light background | ☐ |
| **Safe Area** | Check notch/home bar | No content hidden under notch or home indicator | ☐ |

### 2. Authentication (10 min)

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| **Sign In** | Enter test account email/pass | User signed in, redirected to home page | ☐ |
| **Sign Up** | Create new account | New account created, user redirected to profile setup | ☐ |
| **Profile Setup** | Complete profile (age, weight, goal) | Profile saved, redirected to home | ☐ |
| **Session Persistence** | Sign in, close app, reopen | User still signed in (no login required) | ☐ |
| **Sign Out** | Click sign out in menu | User signed out, redirected to login page | ☐ |
| **Password Reset** | Click "Forgot password" | Email sent, can reset via link | ☐ |
| **Wrong Password** | Enter incorrect password | Clear error message displayed | ☐ |
| **Network Error (Offline)** | Disable network, try sign in | Clear error, retry option available | ☐ |

### 3. Workout Logging - Manual (10 min)

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| **Manual Entry** | Go to History, fill form | Exercise logged with sets/reps/weight | ☐ |
| **Multiple Exercises** | Log 3+ exercises | All saved correctly | ☐ |
| **View History** | Go to History tab | All logged workouts displayed with dates | ☐ |
| **Edit Workout** | Tap existing workout | Can edit exercise details | ☐ |
| **Delete Workout** | Tap delete on workout | Workout removed from history | ☐ |
| **Date Picker** | Select past date | Workout logged on correct date | ☐ |
| **Form Validation** | Leave required fields blank | Validation error shown | ☐ |

### 4. Workout Logging - Camera/Photo (15 min)

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| **Camera Permission** | Tap camera button first time | Permission request appears | ☐ |
| **Camera Capture** | Grant permission, take photo | Camera opens, can take photo | ☐ |
| **Photo Processing** | Capture workout screenshot | Photo processed, exercises extracted | ☐ |
| **Photo Library Access** | Tap photo library button | Photo library permission request | ☐ |
| **Select from Library** | Grant permission, select image | Image selected, processed | ☐ |
| **Camera Denied** | Deny permission, tap button | Clear message about permission | ☐ |
| **Cancel Photo** | Tap camera, cancel capture | No workout logged | ☐ |
| **Cancel Library** | Open library, cancel selection | No workout logged | ☐ |
| **Failed Parse** | Upload non-workout photo | Error message "couldn't parse" | ☐ |
| **Large Photo** | Upload 5MB+ photo | Handles gracefully or shows error | ☐ |

### 5. Personal Records (10 min)

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| **View PRs** | Go to PRs tab | Current PRs displayed with dates | ☐ |
| **Add PR Manual** | Fill PR form | PR saved and displayed | ☐ |
| **Add PR via Camera** | Capture PR screenshot | PR extracted and saved | ☐ |
| **Edit PR** | Tap existing PR | Can modify weight/date | ☐ |
| **Delete PR** | Tap delete | PR removed | ☐ |
| **PR History** | Check past PRs | Shows all PRs with progression | ☐ |
| **Strength Levels** | View PR page | Strength categories displayed | ☐ |

### 6. Strength Analysis (8 min)

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| **Strength Imbalance** | Go to Analysis | Imbalance analysis visible | ☐ |
| **Progression Chart** | View analysis | Progression chart displays | ☐ |
| **Exercise Comparison** | Check metrics | All metrics accurate | ☐ |
| **Load Time** | View analysis card | Loads in <2 seconds | ☐ |
| **Mobile Layout** | Check on SE/Plus/Max | Charts readable on all sizes | ☐ |

### 7. Goals & Planning (10 min)

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| **Set Goals** | Go to Profile, set goals | Goals saved | ☐ |
| **Goal Analysis** | View Analysis tab | Goal analysis displayed | ☐ |
| **Generate Plan** | Tap "Generate Plan" | Plan generated (AI feature) | ☐ |
| **View Plan** | Go to Plan tab | Weekly plan displayed | ☐ |
| **Plan Customization** | Try custom goals | Plan regenerates | ☐ |
| **Export Plan** | Tap share button | Share menu appears | ☐ |

### 8. Profile & Settings (8 min)

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| **View Profile** | Go to Profile tab | Current stats displayed | ☐ |
| **Edit Profile** | Update user info | Changes saved | ☐ |
| **Update Goals** | Modify fitness goals | Goals updated | ☐ |
| **Change Password** | Use settings option | Can change password | ☐ |
| **Preferences** | Toggle any settings | Preferences persisted | ☐ |
| **Help Section** | Go to Help | FAQs and support displayed | ☐ |

### 9. Navigation (8 min)

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| **Tab Navigation** | Tap each tab | Smooth transitions | ☐ |
| **Back Button** | Navigate back | Proper state maintained | ☐ |
| **Pull to Refresh** | Pull down on page | Page refreshes | ☐ |
| **Deep Links** | Tap notification/link | Correct screen opens | ☐ |
| **Screen Rotation** | Rotate device | Layout adapts correctly | ☐ |
| **Modal Dismissal** | Tap outside modal | Modal closes | ☐ |

### 10. Performance (10 min)

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| **Initial Load** | Launch app | Loads in <3 sec on 5G | ☐ |
| **History Load** | Scroll history | Smooth scrolling 60fps | ☐ |
| **Chart Rendering** | View analysis | Charts render smoothly | ☐ |
| **Memory Leaks** | Use app 10+ min | No apparent slowdown | ☐ |
| **Background/Foreground** | Minimize & restore | App resumes correctly | ☐ |
| **Extended Use** | Use app 30+ minutes | No crashes or hangs | ☐ |

### 11. Offline Mode (5 min)

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| **Offline Viewing** | Disable network, view history | Can still view cached data | ☐ |
| **Offline Action** | Disable network, try to add | Clear network error message | ☐ |
| **Reconnect** | Re-enable network | Data syncs, no duplicates | ☐ |

### 12. Screen Sizes (15 min)

Test on all three device sizes for:

**iPhone SE (375pt)**
- [ ] Text readable
- [ ] Buttons easily tappable
- [ ] No horizontal scroll needed
- [ ] Images properly scaled

**iPhone 14 Pro (390pt)**
- [ ] Standard layout works
- [ ] All content visible
- [ ] Touch targets appropriate

**iPhone 15 Pro Max (430pt)**
- [ ] Content uses space effectively
- [ ] Not too much unused space
- [ ] Charts/graphs readable

### 13. App Store Compliance (5 min)

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| **Camera Permissions** | View Camera permission | Reason displayed: "Screenshot parsing" | ☐ |
| **Photo Permissions** | View Photos permission | Reason displayed: "Workout image selection" | ☐ |
| **No Ads** | Navigate through app | No third-party ads shown | ☐ |
| **No Sketchy Links** | Check all links | All links are legitimate | ☐ |
| **Proper Signing Out** | Sign out | Session properly cleared | ☐ |
| **Data Privacy** | Review privacy policy | Privacy policy addresses data usage | ☐ |

### 14. Error Handling (5 min)

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| **Network Timeout** | Slow connection, try action | Timeout error with retry | ☐ |
| **Server Error** | Trigger 500 error | Friendly error message | ☐ |
| **Invalid Data** | Send malformed data | Error handling prevents crash | ☐ |
| **Missing Photos** | View without permissions | Fallback options work | ☐ |

### 15. Accessibility (5 min)

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| **Text Sizing** | Increase font size in Settings | App text scales properly | ☐ |
| **Dark Mode** | Enable dark mode | App displays in dark mode | ☐ |
| **Color Contrast** | Check text on backgrounds | Meets WCAG AA standards | ☐ |
| **VoiceOver** | Enable VoiceOver | Can navigate with VoiceOver | ☐ |

## Regression Testing Scenarios

After any bug fixes or changes, verify:

### Critical User Journeys

**Journey 1: Sign Up → Log Workout → View History**
- [ ] Sign up with new email
- [ ] Complete profile
- [ ] Log 1 manual workout
- [ ] Log 1 workout via camera
- [ ] View history shows both
- [ ] Can navigate between workouts

**Journey 2: Strength Analysis**
- [ ] Add 3+ PRs
- [ ] Generate strength analysis
- [ ] View imbalance detection
- [ ] View progression
- [ ] Data accurate

**Journey 3: Plan Generation**
- [ ] Set fitness goals
- [ ] Generate workout plan
- [ ] View plan details
- [ ] Try sharing plan

## Bug Report Template

If you find a bug:

```
Title: [Brief description]
Device: [SE/14 Pro/15 Pro Max]
iOS Version: [15.0+]
Steps to Reproduce:
1. ...
2. ...
3. ...

Expected: [What should happen]
Actual: [What actually happens]
Screenshots/Video: [If possible]
Console Error: [If applicable]
```

## Pre-Submission Checklist

Before submitting to App Store:

- [ ] All 15 test categories passed ✅
- [ ] No crashes on any device size
- [ ] No memory leaks (30+ min use)
- [ ] Camera features working
- [ ] Photo library access working
- [ ] Session persistence working
- [ ] Error messages are user-friendly
- [ ] No console errors or warnings
- [ ] App icon is correct (1024×1024)
- [ ] Splash screen displays correctly
- [ ] Privacy policy linked
- [ ] Support URL working
- [ ] Test account credentials ready
- [ ] Screenshots prepared (6 images)
- [ ] App description written
- [ ] Keywords defined
- [ ] Age rating completed
- [ ] No external payment systems

## Test Execution Schedule

### Day 1: Core Functionality
- Categories 1-3 (Launch, Auth, Manual Logging)
- Fix any critical issues

### Day 2: Features & Navigation
- Categories 4-9 (Camera, PRs, Analysis, Goals, Profile, Nav)
- Fix any blocking issues

### Day 3: Performance & Edge Cases
- Categories 10-15 (Performance, Offline, Screen Sizes, Compliance, Errors, Accessibility)
- Final polish

### Day 4: Final Verification
- Re-test all critical paths
- Verify no regressions
- Ready for submission

## Performance Benchmarks

Target metrics:

| Metric | Target | Actual |
|--------|--------|--------|
| App Launch | <3 sec | __ sec |
| Page Load | <2 sec | __ sec |
| Scrolling | 60 fps | __ fps |
| Memory Usage | <150 MB | __ MB |
| Battery Impact | <5% per hour | __%/hr |

## Sign-Off

Once all tests pass:

- **QA Lead:** _________________ Date: _______
- **Product Owner:** _________________ Date: _______
- **Developer:** _________________ Date: _______

## Resources

- [Testing Guide](./TESTING.md) (this file)
- [README.md](./README.md) - Setup and running
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Auth details
- [NATIVE_BRIDGES.md](./NATIVE_BRIDGES.md) - Camera/photo features
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines)
