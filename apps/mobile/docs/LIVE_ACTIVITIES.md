# iOS Live Activities - Timer Lock Screen Display

## Overview

The mobile app now supports **iOS Live Activities** for real-time timer updates on the lock screen and Dynamic Island (iPhone 14 Pro+). When a timer is running, users will see:

- ✅ **Real-time timer updates** on lock screen
- ✅ **Dynamic Island integration** (iPhone 14 Pro and newer)
- ✅ **Tap to open app** functionality
- ✅ **Project info** (name, client, earnings)
- ✅ **Better battery efficiency** than repeated notifications

## Requirements

- **iOS 16.2 or later** - Live Activities were introduced in iOS 16.1 and stabilized in 16.2
- **Expo DevClient** - Live Activities require native code, so Expo Go won't work
- **Physical device recommended** - Simulator support is limited

## Platform Support

### iOS 16.2+
Uses Live Activities for real-time lock screen updates with tap-to-open functionality.

### iOS < 16.2
Falls back to time-sensitive notifications (current behavior, no real-time updates).

### Android
Uses persistent foreground notifications with 3-second updates (unchanged).

## Setup Instructions

### 1. Install Dependencies

Dependencies are already installed via `package.json`:
```json
{
  "expo-live-activity": "^0.4.1"
}
```

### 2. Configuration

The app is already configured in `app.json`:
```json
{
  "expo": {
    "plugins": ["expo-live-activity"],
    "ios": {
      "infoPlist": {
        "NSSupportsLiveActivities": true
      }
    }
  }
}
```

### 3. Rebuild with DevClient

⚠️ **IMPORTANT**: You must rebuild the app with Expo DevClient for Live Activities to work.

```bash
# Clean rebuild
npx expo prebuild --clean

# Run on iOS device or simulator
npx expo run:ios

# Or build with EAS
eas build --platform ios --profile development
```

### 4. Test on Device

Live Activities work best on physical devices. To test:

1. **Start a timer** in the app
2. **Lock your device** (press power button)
3. **Check lock screen** - you should see the Live Activity with:
   - Project name and client
   - Real-time updating timer (HH:MM:SS)
   - Earnings (if project has hourly rate)
4. **Tap the Live Activity** - app should open to timer screen

## Implementation Details

### Service Architecture

```
┌─────────────────────────────────────┐
│   TimerNotificationService          │
│   (services/timerNotification.ts)   │
└──────────────┬──────────────────────┘
               │
               ├─ iOS 16.2+  →  Live Activities
               │                 (liveActivityService)
               │
               ├─ iOS < 16.2 →  Notifications
               │                 (existing)
               │
               └─ Android    →  Foreground Service
                                (existing)
```

### Key Files

- **`services/liveActivityService.ts`** - Live Activity manager
  - Detects iOS version
  - Starts/updates/stops Live Activities
  - Formats timer data
  - Calculates earnings

- **`services/timerNotification.ts`** - Timer notification orchestrator
  - Routes to Live Activities when supported
  - Falls back to notifications otherwise
  - Maintains backward compatibility

### Data Flow

1. **Timer starts** → `useTimer.ts` hook triggers
2. **Service detection** → Check if Live Activities supported
3. **Start Live Activity** → Pass project data and start time
4. **Periodic updates** → Update every 5 seconds with new elapsed time
5. **User taps** → App opens to timer screen (automatic)
6. **Timer stops** → End Live Activity gracefully

### State Structure

Live Activities receive this data:
```typescript
{
  title: "Project Name",              // Main heading
  subtitle: "Client Name",            // Subheading
  elapsedTime: "01:23:45",           // HH:MM:SS format
  earnings: "$45.67",                 // If hourly rate exists
  projectColor: "#a855f7",           // For theming
  progressBar: {
    date: timestamp                   // For visual countdown
  }
}
```

## User Experience

### Lock Screen Display

```
┌──────────────────────────────────┐
│  🕐  Project Name                │
│      Client Name                  │
│                                   │
│      01:23:45  •  $45.67         │
└──────────────────────────────────┘
```

### Dynamic Island (iPhone 14 Pro+)

The timer also appears in the Dynamic Island for quick glances without unlocking.

### Tap Behavior

- **Tap anywhere** on the Live Activity → Opens app
- **Swipe left** → Options to clear or open
- **Long press** → Expanded view (iOS manages this)

## Troubleshooting

### Live Activity Not Appearing

1. **Check iOS version**: Must be 16.2 or later
2. **Rebuild app**: Run `npx expo prebuild --clean && npx expo run:ios`
3. **Check console**: Look for "Live Activity started" log
4. **Try physical device**: Simulator may have limitations

### Timer Not Updating

1. **Check update interval**: Updates every 5 seconds (iOS limit)
2. **Check background app refresh**: Enable in Settings → iTimedIT
3. **Check battery optimization**: iOS may throttle background updates

### Falls Back to Notifications

This is expected on:
- iOS < 16.2 devices
- Android devices
- When running in Expo Go (not DevClient)

Check console for: "Live Activities not supported on this device"

## Known Limitations

1. **12-hour limit** - iOS automatically ends Live Activities after 12 hours
2. **5-second updates** - iOS system limit for Live Activity updates
3. **No action buttons** - Unlike notifications, Live Activities are primarily for display
4. **Native code required** - Must use DevClient, not Expo Go

## Future Enhancements

Potential improvements:
- [ ] Custom Swift UI widget design
- [ ] Multiple timer display styles
- [ ] Interactive buttons on Live Activity
- [ ] Push updates when app is killed (requires backend)
- [ ] Widget configuration options

## Testing Checklist

- [ ] Timer starts → Live Activity appears on lock screen
- [ ] Timer updates every 5 seconds with correct time
- [ ] Earnings display correctly (if project has rate)
- [ ] Project color/client name shows correctly
- [ ] Tap opens app to timer screen
- [ ] Timer stops → Live Activity disappears
- [ ] Falls back to notification on iOS < 16.2
- [ ] Android still uses foreground notification

## References

- [expo-live-activity GitHub](https://github.com/software-mansion-labs/expo-live-activity)
- [Apple ActivityKit Documentation](https://developer.apple.com/documentation/activitykit)
- [iOS Live Activities Design Guidelines](https://developer.apple.com/design/human-interface-guidelines/live-activities)

## Support

For issues related to Live Activities:
1. Check this documentation first
2. Review console logs for error messages
3. Verify iOS version and DevClient setup
4. Open GitHub issue with reproduction steps
