# Live Activity TestFlight Crash - Fix Applied

## Root Causes Identified

1. **Wrong APNs Environment**: Main app had `aps-environment: development` instead of `production`
2. **Missing App Group**: Widget extension had empty entitlements (no shared app group)
3. **No Build Flag**: EAS config didn't set `EXPO_PUBLIC_LIVE_ACTIVITIES=1`
4. **No Feature Guard**: JS code loaded the module unconditionally

## Fixes Applied

### 1. Updated EAS Build Configuration (`eas.json`)

Added environment variable to all build profiles:
```json
{
  "env": {
    "EXPO_PUBLIC_LIVE_ACTIVITIES": "1"
  }
}
```

This tells the JS code that the native extension is included in this build.

### 2. Fixed Main App Entitlements (`ios/iTimedIT/iTimedIT.entitlements`)

**Before:**
```xml
<key>aps-environment</key>
<string>development</string>
```

**After:**
```xml
<key>aps-environment</key>
<string>production</string>
<key>com.apple.security.application-groups</key>
<array>
  <string>group.com.itimedit.app</string>
</array>
```

- Changed APNs to `production` (required for TestFlight/App Store)
- Added app group for data sharing with widget extension

### 3. Fixed Widget Extension Entitlements (`ios/LiveActivity/LiveActivity.entitlements`)

**Before:**
```xml
<dict/>
```

**After:**
```xml
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>group.com.itimedit.app</string>
  </array>
</dict>
```

Added the same app group so the widget can access shared data.

### 4. Updated JS Service (`services/liveActivityService.ts`)

Added feature flag check:
```typescript
const LIVE_ACTIVITIES_ENABLED = process.env.EXPO_PUBLIC_LIVE_ACTIVITIES === "1";

if (LIVE_ACTIVITIES_ENABLED) {
  try {
    LiveActivity = require("expo-live-activity");
  } catch (error) {
    // Graceful fallback
  }
}
```

Now the module only loads when explicitly enabled, preventing crashes when the native extension isn't present.

## Next Steps for TestFlight

### 1. Rebuild the App

```bash
# Clean rebuild with EAS
eas build --platform ios --profile production

# Or for preview/internal testing
eas build --platform ios --profile preview
```

### 2. Verify the Build Includes Widget Extension

After downloading the IPA, you can verify:
```bash
unzip YourApp.ipa
ls Payload/iTimedIT.app/PlugIns/
# Should see: LiveActivity.appex
```

### 3. Test on TestFlight

1. Install the TestFlight build
2. Start a timer
3. Lock your device
4. Check lock screen - Live Activity should appear with:
   - Project name
   - Client name
   - Real-time timer (updates every 5 seconds)
   - Earnings (if project has hourly rate)
5. Tap the Live Activity - app should open

### 4. Verify in Xcode (Optional)

Open `ios/iTimedIT.xcworkspace` and check:

**Main App Target (iTimedIT):**
- Signing & Capabilities → Push Notifications enabled
- Signing & Capabilities → App Groups → `group.com.itimedit.app`
- Build Settings → Code Signing Entitlements → `iTimedIT/iTimedIT.entitlements`

**Widget Extension Target (LiveActivity):**
- Signing & Capabilities → App Groups → `group.com.itimedit.app`
- Build Settings → Code Signing Entitlements → `LiveActivity/LiveActivity.entitlements`

## How It Works Now

### Local Timer (Current Implementation)

1. User starts timer → `liveActivityService.startActivity()` called
2. Service checks `EXPO_PUBLIC_LIVE_ACTIVITIES` flag
3. If enabled, creates ActivityKit activity with timer data
4. iOS displays Live Activity on lock screen
5. Service updates every 5 seconds with new elapsed time
6. User taps → App opens via deep link
7. Timer stops → Activity ends gracefully

### Data Flow

```
Timer Start
    ↓
Check EXPO_PUBLIC_LIVE_ACTIVITIES=1
    ↓
Check iOS >= 16.2
    ↓
ActivityKit.request(attributes, contentState)
    ↓
iOS renders LiveActivityWidget.swift
    ↓
Lock Screen shows timer
    ↓
Update every 5s via ActivityKit.update()
    ↓
Timer Stop → ActivityKit.end()
```

## Troubleshooting

### If Live Activity Still Doesn't Appear

1. **Check iOS version**: Must be 16.2+
   ```swift
   // In Swift console
   print(UIDevice.current.systemVersion)
   ```

2. **Check if extension is in build**:
   ```bash
   # After installing TestFlight build
   # Use Xcode → Window → Devices and Simulators
   # Select device → Installed Apps → iTimedIT → Show Container
   # Check for LiveActivity.appex
   ```

3. **Check console logs**:
   - Open Console.app on Mac
   - Connect iPhone
   - Filter for "iTimedIT"
   - Look for "Live Activity started" or error messages

4. **Verify entitlements in installed app**:
   ```bash
   # Extract entitlements from installed app
   codesign -d --entitlements - /path/to/iTimedIT.app
   ```

### If It Works Locally But Not in TestFlight

- Ensure you're building with the **same profile** that has `EXPO_PUBLIC_LIVE_ACTIVITIES=1`
- Check that the provisioning profile includes Push Notifications capability
- Verify the app group is registered in Apple Developer Portal

### Common Errors

**"Module not found: expo-live-activity"**
- Build doesn't have `EXPO_PUBLIC_LIVE_ACTIVITIES=1` set
- Solution: Rebuild with correct EAS profile

**"Activity request failed"**
- Entitlements mismatch between app and extension
- Solution: Verify both have the same app group

**"aps-environment not found"**
- Missing Push Notifications capability
- Solution: Add in Xcode or ensure provisioning profile includes it

## Future Enhancements

### Push-Driven Updates (Optional)

If you want server-controlled timer updates:

1. **Backend sends APNs with Live Activity headers**:
```json
{
  "aps": {
    "timestamp": 1234567890,
    "event": "update",
    "content-state": {
      "title": "Project Name",
      "elapsedTime": "01:23:45"
    }
  }
}
```

Headers:
```
apns-push-type: liveactivity
apns-topic: com.itimedit.app.push-type.liveactivity
apns-priority: 10
```

2. **Update ActivityKit initialization**:
```typescript
await LiveActivity.startActivity(state, {
  ...config,
  pushType: 'token' // Enable push updates
});
```

3. **Get push token**:
```typescript
const pushToken = await LiveActivity.getPushToken(activityId);
// Send to your backend
```

## Testing Checklist

- [ ] Build with EAS production/preview profile
- [ ] Install via TestFlight
- [ ] Start timer
- [ ] Lock device
- [ ] Live Activity appears on lock screen
- [ ] Timer updates every 5 seconds
- [ ] Tap opens app
- [ ] Stop timer → Live Activity disappears
- [ ] No crashes in Console.app

## References

- [ActivityKit Documentation](https://developer.apple.com/documentation/activitykit)
- [expo-live-activity GitHub](https://github.com/software-mansion-labs/expo-live-activity)
- [Apple Push Notifications for Live Activities](https://developer.apple.com/documentation/activitykit/updating-and-ending-your-live-activity-with-activitykit-push-notifications)
