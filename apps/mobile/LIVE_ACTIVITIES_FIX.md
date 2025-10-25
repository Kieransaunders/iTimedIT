# Live Activities TestFlight Crash Fix

## Issue
The app was crashing immediately on launch in TestFlight builds (iOS) due to the `expo-live-activity` module not being properly configured in the native build.

## Root Cause
The `expo-live-activity` module requires native iOS code that must be included during the build process. When this native code is missing, the app crashes with an `EXC_CRASH (SIGABRT)` error when trying to import the module.

## Solution Implemented

### 1. Conditional Import
Modified `services/liveActivityService.ts` to conditionally import the module:

```javascript
// Try to import expo-live-activity, but handle gracefully if not available
let LiveActivity: any = null;
try {
  LiveActivity = require("expo-live-activity");
} catch (error) {
  console.warn("expo-live-activity not available. Live Activities will be disabled.");
}
```

### 2. Runtime Checks
Added safety checks before using Live Activity features:
- `isSupported()` now checks if the module is available
- All LiveActivity method calls are wrapped in null checks

## Building with Live Activities

### For Production/TestFlight Builds

1. **Prebuild the app** to generate native code:
   ```bash
   cd apps/mobile
   npx expo prebuild --clean
   ```

2. **Install iOS dependencies**:
   ```bash
   cd ios
   pod install
   cd ..
   ```

3. **Configure app.json** (if not already done):
   ```json
   {
     "expo": {
       "plugins": [
         "expo-live-activity"
       ]
     }
   }
   ```

4. **Build with EAS**:
   ```bash
   eas build --platform ios --profile production
   ```

### Important Notes

1. **Expo Go**: Live Activities will NOT work in Expo Go. The fallback to regular notifications will be used.

2. **Development Builds**: Must use a custom dev client:
   ```bash
   npx expo run:ios
   ```

3. **TestFlight**: Requires a proper EAS build with the plugin configured.

## Testing the Fix

1. The app should no longer crash on startup
2. On devices without Live Activities support, the app will fall back to regular notifications
3. Console will show: "expo-live-activity not available. Live Activities will be disabled."

## Fallback Behavior

When Live Activities are not available:
- **iOS < 16.2**: Uses time-sensitive notifications (5-second updates)
- **Android**: Uses foreground service notifications (3-second updates)
- **Expo Go**: Uses regular notifications

## Verifying the Build

To verify Live Activities are properly included:

1. Check the build logs for plugin installation:
   ```
   Installing expo-live-activity plugin...
   ```

2. After building, check if the Info.plist contains:
   ```xml
   <key>NSSupportsLiveActivities</key>
   <true/>
   ```

3. Test on a physical device with iOS 16.2+

## References

- [expo-live-activity documentation](https://github.com/expo/expo/tree/main/packages/expo-live-activity)
- [Expo Config Plugins](https://docs.expo.dev/config-plugins/introduction/)
- [EAS Build documentation](https://docs.expo.dev/build/introduction/)