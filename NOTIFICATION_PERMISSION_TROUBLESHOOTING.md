# Notification Permission Troubleshooting Guide

This guide helps resolve the "Permission denied for notifications" error and other notification setup issues.

## 🚨 Quick Fixes

### 1. Check Browser Address Bar
**Most Common Solution**: Look for notification icons in your browser's address bar:

#### Chrome/Edge
- Look for a 🔔 icon or "blocked" indicator in the address bar
- Click the lock icon 🔒 → **Notifications** → **Allow**
- Refresh the page and try enabling notifications again

#### Firefox  
- Look for a shield icon 🛡️ in the address bar
- Click the shield → **Notifications** → **Allow**
- Refresh the page and try again

#### Safari
- **Safari menu** → **Settings for [domain]** → **Notifications** → **Allow**
- Or: **Safari menu** → **Preferences** → **Websites** → **Notifications**

### 2. Reset Site Permissions
If notifications were previously blocked:

#### Chrome/Edge
1. Chrome menu → **Settings** → **Privacy and security** → **Site Settings**
2. **Notifications** → Find your site → **Allow**
3. Or clear all site data: **Settings** → **Advanced** → **Reset and clean up**

#### Firefox
1. Firefox menu → **Settings** → **Privacy & Security**
2. **Permissions** section → **Notifications** → **Settings**
3. Find your site and change to **Allow**

#### Safari
1. **Safari menu** → **Preferences** → **Websites** → **Notifications**
2. Find your site and change to **Allow**

## 🔍 Diagnostic Steps

### Step 1: Check Browser Console
1. Open Developer Tools (F12)
2. Go to **Console** tab
3. Look for these messages:
   ```
   Current notification permission: denied
   Notification permission was previously denied
   ```

### Step 2: Test Permission Status
Open browser console and run:
```javascript
// Check current permission
console.log('Permission:', Notification.permission);

// Test if notifications are supported
console.log('Supported:', 'Notification' in window);

// Check if we're on HTTPS/localhost
console.log('Secure context:', window.isSecureContext);
```

### Step 3: Manual Permission Test
In browser console:
```javascript
// Try requesting permission manually
Notification.requestPermission().then(permission => {
  console.log('Permission result:', permission);
});
```

## 🌐 Browser-Specific Issues

### Chrome/Chromium
**Issue**: Permission stuck as "denied"
- **Solution**: Clear site data or reset permissions in chrome://settings/content/notifications

**Issue**: No permission prompt appears
- **Solution**: Check if site is in the "Block" list in notification settings

### Firefox
**Issue**: Permission request fails silently
- **Solution**: Check if Enhanced Tracking Protection is interfering
- Go to **about:preferences#privacy** → adjust settings

### Safari (macOS)
**Issue**: Limited notification support
- **Solution**: Notifications work best when site is added to home screen (PWA)
- Some versions require user gesture (click) before permission request

### Mobile Browsers
**Issue**: iOS Safari notifications don't work
- **Solution**: Add site to home screen as PWA for full notification support
- Regular Safari tab has limited notification capabilities

## 🛠️ Advanced Troubleshooting

### Clear Browser Data
If permissions are completely stuck:

1. **Chrome**: Settings → Advanced → Clear browsing data → Site settings
2. **Firefox**: Settings → Privacy & Security → Clear Data → Site settings  
3. **Safari**: Develop menu → Empty caches + Reset permissions

### Check System Settings
**macOS**: System Preferences → Notifications → [Browser] → Allow notifications

**Windows**: Settings → System → Notifications → [Browser] → On

### Incognito/Private Mode
- Test in private/incognito mode to isolate extension interference
- Note: Some browsers don't persist notifications in private mode

### Extension Conflicts
- Disable ad blockers and privacy extensions temporarily
- Some extensions block notification requests

## 🔧 Developer Solutions

### Check HTTPS Requirement
Notifications require secure context:
```javascript
if (!window.isSecureContext) {
  console.error('Notifications require HTTPS or localhost');
}
```

### Implement Graceful Fallback
```javascript
// Check if notifications are available
if (!('Notification' in window)) {
  // Fallback to in-app alerts only
  console.warn('Browser does not support notifications');
}
```

### Debug Permission State
```javascript
// Get detailed permission info
function debugPermissions() {
  console.log({
    supported: 'Notification' in window,
    permission: Notification.permission,
    secureContext: window.isSecureContext,
    serviceWorker: 'serviceWorker' in navigator
  });
}
```

## 📱 Mobile-Specific Solutions

### iOS Safari
- **Add to Home Screen**: Safari → Share → Add to Home Screen
- **System Settings**: Settings → Notifications → Safari → Allow
- **Note**: Regular Safari tabs have limited notification support

### Android Chrome
- **Enable notifications**: Chrome → Settings → Site settings → Notifications
- **System settings**: Android Settings → Apps → Chrome → Notifications

## ✅ Verification Steps

After fixing permissions:

1. **Refresh the page** completely (Cmd/Ctrl + R)
2. Go to **Settings** in the app
3. Click **"Enable push notifications"**
4. **Expected**: Browser shows permission prompt
5. Click **"Allow"**
6. **Expected**: Green checkmark and success message
7. **Test**: Start timer with 5-second intervals, switch tabs, wait for notification

## 🆘 Still Not Working?

### Last Resort Solutions

1. **Different Browser**: Try Chrome, Firefox, or Edge
2. **Different Device**: Test on mobile or another computer
3. **Clear Everything**: Reset all browser data and try again
4. **Check Network**: Some corporate networks block push services
5. **Update Browser**: Ensure you're on the latest version

### Report Issues
If notifications still don't work after trying all steps:

1. Note your browser version and OS
2. Check browser console for errors
3. Test the manual JavaScript commands above
4. Report with full error details

## 🎯 Prevention

### For Future Users
- Always grant permission when first prompted
- Don't block notifications unless absolutely necessary  
- Keep browser updated for best compatibility
- Use HTTPS in production (notifications won't work on HTTP)

The notification system works reliably once permissions are properly configured. Most issues are resolved by resetting browser permissions for the site.