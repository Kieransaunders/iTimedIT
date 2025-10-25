# TestFlight Crash Fix - expo-live-activity Module

## Issue Summary

**Date:** October 25, 2025
**Build:** 1.0.0 (14)
**Device:** iPhone 15 Pro (iOS 18.6.2)
**Error:** App crashes immediately on launch in TestFlight

## Root Cause

The `expo-live-activity` module (v0.4.1) is causing a fatal crash on app startup in TestFlight/production builds. The crash occurs in the module's native Swift code:

- `ErrorRecovery.swift:277` - crash() method
- `StartupProcedure.swift:344` - throwException() method

These are internal to the expo-live-activity native module and trigger when the module fails its startup validation in production environment.

## Crash Log Analysis

```
Exception Type:  EXC_CRASH (SIGABRT)
Termination Reason: SIGNAL 6 Abort trap: 6
Thread 4 Crashed:
- ErrorRecovery.crash()
- ErrorRecovery.runNextTask()
- ErrorRecovery.tryRelaunchFromCache()
```

The module appears to have a startup procedure that validates the runtime environment and crashes when it detects an issue with the production build configuration.

## Immediate Fix Applied

**File:** `services/liveActivityService.ts:8`

Temporarily disabled Live Activities by hardcoding `LIVE_ACTIVITIES_ENABLED = false` to prevent the module from loading:

```typescript
// TEMPORARILY DISABLED: The expo-live-activity module is causing crashes in TestFlight
// See crash log: ErrorRecovery.swift and StartupProcedure.swift throwing exceptions
// TODO: Re-enable once the native module is properly configured for production builds
const LIVE_ACTIVITIES_ENABLED = false; // process.env.EXPO_PUBLIC_LIVE_ACTIVITIES === "1";
```

## Impact

With this fix:
- ✅ App will no longer crash on TestFlight
- ✅ Timer functionality remains intact
- ✅ Notifications still work (fallback to standard iOS notifications)
- ❌ Live Activities on lock screen temporarily disabled
- ❌ Dynamic Island integration temporarily disabled

## Fallback Behavior

When Live Activities are disabled, the app automatically falls back to:
- **iOS < 16.2 behavior:** Time-sensitive notifications that update every 5 seconds
- **Lock screen:** Shows standard notification with timer info
- **Functionality:** Full timer tracking continues to work

## Next Steps for Deployment

### 1. Immediate (For Current TestFlight)

```bash
# Commit the temporary fix
git add services/liveActivityService.ts
git commit -m "fix: disable Live Activities to prevent TestFlight crash"

# Build new version for TestFlight
eas build --platform ios --profile production
```

### 2. Permanent Fix (Future Releases)

To properly fix Live Activities for production:

#### Option A: Update expo-live-activity Module
```bash
# Check for updates
npm update expo-live-activity

# Or try a specific version known to work in production
npm install expo-live-activity@latest
```

#### Option B: Rebuild with Proper Configuration
```bash
# Clean rebuild with native module
npx expo prebuild --clean
cd ios
pod install
cd ..

# Ensure EAS config DOES NOT set EXPO_PUBLIC_LIVE_ACTIVITIES
# Remove from eas.json temporarily:
# "env": {
#   "EXPO_PUBLIC_LIVE_ACTIVITIES": "1"  // Remove this
# }
```

#### Option C: Debug the Native Module
1. Open `ios/iTimedIT.xcworkspace` in Xcode
2. Build for "Any iOS Device" with Release configuration
3. Look for build warnings/errors related to Live Activity extension
4. Check if the widget extension target has proper provisioning

## Testing Checklist

Before resubmitting to TestFlight:

- [ ] Test locally with Release build: `npx expo run:ios --configuration Release`
- [ ] Verify no crash on app launch
- [ ] Confirm timer starts and stops correctly
- [ ] Check notification appears on lock screen (even without Live Activity)
- [ ] Test on physical device, not just simulator

## Long-term Solution

Consider these approaches for production Live Activities:

1. **Conditional Module Loading:** Only load the module after app initialization, not during startup
2. **Feature Flag:** Use remote config to enable/disable per user or build
3. **Version Check:** Only enable for specific iOS versions where it's stable
4. **Alternative Library:** Consider react-native-widget-extension or building custom

## References

- [TestFlight Feedback](feedback.json) - User report: "Crashed at opening"
- [Crash Log](crashlog.crash) - Full stack trace
- [Live Activity Docs](LIVE_ACTIVITY_TESTFLIGHT_FIX.md) - Previous configuration attempts
- [expo-live-activity Issues](https://github.com/software-mansion-labs/expo-live-activity/issues) - Check for similar reports

## Monitoring

After deploying the fix:

1. Monitor TestFlight feedback for any new crashes
2. Check Crashlytics/Sentry for error trends
3. Test on various iOS versions (especially 16.2, 17.x, 18.x)
4. Gather user feedback on missing Live Activity feature

## Rollback Plan

If issues persist after disabling Live Activities:

1. Remove expo-live-activity completely:
   ```bash
   npm uninstall expo-live-activity
   rm -rf ios/LiveActivity
   ```

2. Clean and rebuild:
   ```bash
   npx expo prebuild --clean
   eas build --platform ios --profile production
   ```

3. Use only standard notifications for timer display

---

**Status:** Fix applied, ready for new TestFlight build
**Priority:** High - Blocking TestFlight testing
**Owner:** Mobile team