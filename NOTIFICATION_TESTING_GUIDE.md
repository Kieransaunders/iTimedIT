# User Attention & Notifications Testing Guide

This guide covers how to test the newly implemented notification and attention system for the timer app.

## Prerequisites

1. **Environment Setup**
   - Ensure VAPID keys are configured in `.env.local`
   - Run `npm run dev` to start both frontend and Convex backend
   - Use HTTPS or localhost (required for push notifications)

2. **Browser Requirements**
   - **Chrome/Edge**: Full support for all features
   - **Firefox**: Full support for all features  
   - **Safari**: Limited push notification support, full in-app features
   - **Mobile Chrome**: Full support including vibration
   - **iOS Safari**: Limited support (no push when app closed)

## Testing Checklist

### 🔔 Web Push Notifications

#### Basic Setup
- [ ] Open Settings page (`/settings`)
- [ ] Locate "Notifications & Attention" section
- [ ] Verify all toggles are visible with browser compatibility indicators
- [ ] Click "Enable push notifications" toggle
- [ ] **Expected**: Browser permission prompt appears
- [ ] Grant permission
- [ ] **Expected**: Toggle shows enabled, success toast appears

#### Push Notification Flow
1. **Setup Timer with Interruptions**
   - [ ] Go to timer page
   - [ ] Set interrupt interval to "5 seconds" (for quick testing)
   - [ ] Start a timer on any project
   - [ ] Wait 5 seconds
   - [ ] **Expected**: Interrupt modal appears in-app

2. **Test Out-of-Focus Notifications (Immediate Timing)**
   - [ ] Start a new timer (5 second interval)
   - [ ] Immediately switch to different tab/app or minimize browser
   - [ ] Wait exactly 5+ seconds
   - [ ] **Expected**: Push notification appears **IMMEDIATELY** at the 5 second mark with:
     - Title: "Timer Interruption"
     - Body: "Are you still working on [project name]?"
     - Actions: Continue, Stop Timer, Snooze 5min
   - [ ] **Timing Check**: Notification should appear at the same time as in-app interrupt (no delay)

3. **Test Notification Actions**
   - [ ] Click "Continue" on notification
   - [ ] **Expected**: App opens/focuses, timer continues
   - [ ] Repeat test, click "Stop Timer"
   - [ ] **Expected**: App opens, timer stops
   - [ ] Repeat test, click "Snooze 5min"
   - [ ] **Expected**: App opens, timer continues (snooze functionality)

#### Subscription Management
- [ ] Check browser developer tools → Application → Storage → IndexedDB
- [ ] **Expected**: Push subscription data stored
- [ ] Disable notifications in Settings
- [ ] **Expected**: Subscription removed, toggle shows disabled
- [ ] Re-enable notifications
- [ ] **Expected**: New subscription created

### ⚡ In-App Attention Features

#### App Badging
- [ ] Start timer with 5 second interrupts
- [ ] Switch to different tab (keep browser open)
- [ ] Wait for interrupt
- [ ] **Expected**: Browser tab shows badge/count or title blinks "⚠️ Timer Alert"
- [ ] Return to app tab
- [ ] **Expected**: Badge/title returns to normal

#### Sound Alerts
- [ ] Enable "Play alert sounds" in Settings
- [ ] Start timer, wait for interrupt while app is visible
- [ ] **Expected**: Subtle beep sound plays
- [ ] Disable sound setting
- [ ] **Expected**: No sound on next interrupt

#### Vibration (Mobile Only)
- [ ] On mobile device, enable "Vibrate device" in Settings  
- [ ] Start timer, wait for interrupt
- [ ] **Expected**: Device vibrates briefly
- [ ] Disable vibration setting
- [ ] **Expected**: No vibration on next interrupt

#### Wake Lock
- [ ] Enable "Keep screen awake during timing" in Settings
- [ ] Start timer on mobile device
- [ ] **Expected**: Screen stays on during timer
- [ ] Stop timer
- [ ] **Expected**: Normal screen timeout resumes

### ⚙️ Settings & Preferences

#### Quiet Hours
- [ ] Enable "Quiet hours" in Settings
- [ ] Set start time to current time - 1 hour
- [ ] Set end time to current time + 1 hour
- [ ] Start timer with 5 second interrupts
- [ ] Switch to different tab, wait for interrupt
- [ ] **Expected**: No push notification sent (app interrupt still works)
- [ ] Disable quiet hours
- [ ] **Expected**: Push notifications resume

#### Notification Preferences Persistence
- [ ] Configure all settings (enable some, disable others)
- [ ] Refresh page
- [ ] **Expected**: All settings preserved
- [ ] Sign out and back in
- [ ] **Expected**: Settings still preserved

### 🎯 Timer Integration Testing

#### Different Timer Scenarios
1. **Short Intervals**
   - [ ] Set 5-second interrupts, test notifications work
   
2. **Normal Intervals** 
   - [ ] Set 15-minute interrupts, start timer
   - [ ] Close browser tab, wait 15+ minutes
   - [ ] **Expected**: Push notification appears

3. **Multiple Projects**
   - [ ] Test notifications show correct project names
   - [ ] Test with different clients
   - [ ] **Expected**: Notification includes client and project info

#### Grace Period Testing
- [ ] Set grace period to 5 seconds in Settings
- [ ] Start timer with 5-second interrupts  
- [ ] When interrupt appears, ignore it
- [ ] Wait 5+ seconds
- [ ] **Expected**: Timer auto-stops

### 🌐 Cross-Browser Testing

#### Chrome/Chromium
- [ ] All features should work
- [ ] Push notifications when app closed ✅
- [ ] App badging ✅
- [ ] Sound and vibration ✅
- [ ] Wake lock ✅

#### Firefox
- [ ] All features should work
- [ ] Push notifications when app closed ✅
- [ ] Title blinking fallback for badging ✅
- [ ] Sound ✅
- [ ] Limited wake lock support ⚠️

#### Safari (Desktop)
- [ ] Push notifications ⚠️ (limited)
- [ ] In-app features work ✅
- [ ] Title blinking ✅
- [ ] Sound ✅

#### Mobile Browsers
- [ ] Chrome Mobile: Full support ✅
- [ ] Safari iOS: Limited push support ⚠️
- [ ] Vibration on supported devices ✅

### 🐛 Error Scenarios

#### Permission Denied
- [ ] Block notification permission in browser
- [ ] Try to enable in Settings
- [ ] **Expected**: Error message, toggle stays disabled

#### Network Issues
- [ ] Disconnect internet, try to enable notifications
- [ ] **Expected**: Graceful error handling

#### Invalid Subscriptions
- [ ] Clear browser data while notifications enabled
- [ ] Trigger notification
- [ ] **Expected**: Subscription automatically cleaned up

## Manual Testing Scenarios

### Scenario 1: New User Flow
1. Fresh browser/incognito mode
2. Sign up/sign in
3. Go to Settings
4. Enable notifications (first time)
5. Set up timer with short intervals
6. Test full notification flow

### Scenario 2: Power User Flow  
1. Configure all notification preferences
2. Set up quiet hours
3. Test multiple notification channels
4. Verify settings persistence across sessions

### Scenario 3: Mobile User Flow
1. Test on mobile device
2. Enable vibration and wake lock
3. Test push notifications with screen off
4. Test PWA install notification behavior

## ⏱️ Timing Verification

### Confirm Immediate Notifications
The push notification should happen **exactly** when the timer interruption occurs, with **zero delay**. Here's how to verify:

1. **Dual Window Test**
   - [ ] Open app in two browser windows side by side
   - [ ] Start timer with 5-second interrupts in window 1
   - [ ] Focus on window 2 (so window 1 is out of focus)
   - [ ] Watch both windows at the 5-second mark
   - [ ] **Expected**: Push notification appears at the exact same moment as the interrupt modal in window 1

2. **Console Timing Logs**
   - [ ] Open browser console (F12)
   - [ ] Start timer and switch tabs
   - [ ] Look for console logs: `🔔 Sending push notification for interrupt at [timestamp]`
   - [ ] **Expected**: Timestamp matches the interrupt timing exactly

3. **Manual Stopwatch Test**
   - [ ] Use phone/external stopwatch
   - [ ] Start timer and stopwatch simultaneously
   - [ ] Switch to different tab
   - [ ] When push notification appears, check stopwatch
   - [ ] **Expected**: Notification appears at exactly the interrupt interval time

### Common Timing Issues to Check
- **Browser throttling**: Some browsers throttle background tabs - use different browser if needed
- **Network delays**: Push service delays should be minimal (< 1 second)
- **Device sleep**: Ensure device isn't in power saving mode during testing

## Development Testing Tools

### Browser Developer Tools
- **Application Tab**: Check service worker registration
- **Console**: Monitor notification errors
- **Network**: Verify push subscription requests
- **Storage**: Check subscription data persistence

### Convex Dashboard
- **Functions**: Monitor push action calls
- **Database**: Check `pushSubscriptions` and `notificationPrefs` tables
- **Logs**: Review notification sending attempts

### Testing Commands
```bash
# Run development servers
npm run dev

# Check for TypeScript errors
npm run lint

# Test notification permissions in console
navigator.permissions.query({name: 'notifications'})

# Test service worker registration
navigator.serviceWorker.getRegistrations()
```

## Known Limitations

1. **iOS Safari**: Push notifications only work when app is added to home screen (PWA)
2. **Firefox**: Wake lock support is limited
3. **Privacy Mode**: Notifications may not persist across sessions
4. **Battery Saver**: May affect notification delivery timing

## Troubleshooting

### No Notifications Received
1. Check browser notification settings
2. Verify VAPID keys are configured
3. Check Convex logs for errors
4. Ensure HTTPS/localhost environment

### Notifications Not Persisting
1. Check browser storage settings
2. Verify user not in private/incognito mode
3. Check subscription data in developer tools

### Service Worker Issues
1. Check for service worker registration errors
2. Verify `public/sw.js` is accessible
3. Hard refresh to update service worker

## Success Criteria

✅ **Basic**: Push notifications work when app is closed  
✅ **Intermediate**: All in-app attention features functional  
✅ **Advanced**: Settings persist, quiet hours respected  
✅ **Expert**: Cross-browser compatibility verified  

The notification system is ready for production when all basic and intermediate criteria pass across target browsers.