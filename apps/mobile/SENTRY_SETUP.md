# Sentry Setup for iTimedIT Mobile App

## Overview

Sentry is now configured for the iOS mobile app to provide real-time error tracking, crash reporting, and performance monitoring. The mobile app shares the same Sentry project as the web app.

## Configuration Details

### Sentry Project Info
- **Organization**: `serenity-dev`
- **Project**: `itimedit`
- **DSN**: `https://6067a602869754bdf4e3dc3a4c02ed45@o4509537295532033.ingest.de.sentry.io/4510146354020432`

### Files Modified

1. **`apps/mobile/package.json`**
   - Added `@sentry/react-native` v7.4.0
   - Added `sentry-expo` v7.2.0

2. **`apps/mobile/app.config.ts:101-107`**
   - Added `sentry-expo` plugin configuration

3. **`apps/mobile/app/_layout.tsx:18-34`**
   - Sentry initialization at app startup
   - Error tracking integration with global error handler

4. **`apps/mobile/services/errors.ts:11,217-230`**
   - Updated `logAuthError()` to send errors to Sentry

5. **`eas.json:16-19`**
   - Added Sentry environment variables for production builds

## Features Enabled

✅ **Automatic Error Capture**
- Uncaught exceptions
- Unhandled promise rejections
- Global error handler integration

✅ **Performance Monitoring**
- React Native tracing integration
- 100% traces sample rate
- Performance profiling

✅ **Contextual Information**
- Error categorization (auth, network, etc.)
- Recoverable/retryable status
- User context (set on login)
- Custom breadcrumbs

✅ **Environment Separation**
- Only captures errors in production builds
- Development mode disabled (`enableInExpoDevelopment: false`)
- Debug mode enabled in `__DEV__`

## Environment Variables

### For Local Development
No environment variables needed for basic functionality. The DSN is hardcoded in `app/_layout.tsx:23`.

### For EAS Production Builds
Add the following secret to your EAS project:

```bash
# Add SENTRY_AUTH_TOKEN to EAS secrets
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value <your-sentry-auth-token>
```

**Where to get the auth token:**
1. Go to https://sentry.io/settings/account/api/auth-tokens/
2. Create a new auth token with the following scopes:
   - `project:releases`
   - `project:write`
   - `org:read`
3. Copy the token and add it to EAS secrets

This token is used by the `sentry-expo` plugin to upload source maps during production builds, enabling proper error symbolication.

## Testing Sentry Integration

### Manual Test (Development)

Use the test utilities in `services/sentryTest.ts`:

```typescript
import { sendTestError, sendTestMessage } from '@/services/sentryTest';

// Send a test error
sendTestError();

// Send a test message
sendTestMessage("Testing Sentry integration");
```

**Note:** Test functions only work in development mode (`__DEV__`).

### Verify in Sentry Dashboard

1. Go to https://sentry.io/organizations/serenity-dev/projects/itimedit/
2. Navigate to **Issues** tab
3. You should see test errors/messages appear within a few seconds

### Production Testing

To test in a production build:

```bash
# Build for iOS
eas build --platform ios --profile production

# Install the build on a physical device via TestFlight
# Trigger an error in the app
# Check Sentry dashboard for the error report
```

## User Context

Set user context on login to identify which user experienced errors:

```typescript
import { setUserContext, clearUserContext } from '@/services/sentryTest';

// On successful login
setUserContext(
  user._id,
  user.email,
  user.name
);

// On logout
clearUserContext();
```

## Breadcrumbs

Add breadcrumbs to track user actions leading to errors:

```typescript
import { addBreadcrumb } from '@/services/sentryTest';

// Track user actions
addBreadcrumb('Started timer', 'timer', {
  projectId: project._id,
  projectName: project.name,
});

addBreadcrumb('Stopped timer', 'timer', {
  duration: timerDuration,
});
```

## Error Categorization

All authentication errors are automatically categorized and sent to Sentry with:

- **Level**: `warning` (recoverable) or `error` (non-recoverable)
- **Tags**:
  - `category`: Error type (USER_CANCELLATION, NETWORK, OAUTH, etc.)
  - `context`: Where the error occurred
  - `recoverable`: Whether user can retry
  - `retryable`: Whether automatic retry is possible
- **Extra**: Full error details including timestamps

## Source Maps

Source maps are automatically uploaded to Sentry during production builds when `SENTRY_AUTH_TOKEN` is configured. This enables:

- Readable stack traces in production
- Source code context in error reports
- Proper symbolication of minified code

## Monitoring Best Practices

### 1. Set User Context Early
```typescript
// In app/_layout.tsx after authentication
useEffect(() => {
  if (user) {
    setUserContext(user._id, user.email, user.name);
  }
}, [user]);
```

### 2. Add Breadcrumbs for Important Actions
```typescript
// Before critical operations
addBreadcrumb('Starting payment flow', 'payment', {
  amount: total,
  currency: 'USD',
});
```

### 3. Use Custom Tags for Filtering
```typescript
import { setTag } from '@/services/sentryTest';

// Tag errors by feature area
setTag('feature', 'timer');
setTag('screen', 'dashboard');
```

### 4. Set Custom Context
```typescript
import { setCustomContext } from '@/services/sentryTest';

// Add app-specific context
setCustomContext('timer', {
  isRunning: true,
  duration: 3600,
  projectId: project._id,
});
```

## Troubleshooting

### Errors not appearing in Sentry

1. **Check environment**: Sentry is disabled in development mode
2. **Verify DSN**: Ensure DSN in `app/_layout.tsx:23` is correct
3. **Check network**: Ensure device has internet connection
4. **Review filters**: Check Sentry project settings for filters

### Source maps not uploading

1. **Check auth token**: Verify `SENTRY_AUTH_TOKEN` is set in EAS secrets
2. **Review build logs**: Look for Sentry plugin errors in EAS build logs
3. **Verify org/project**: Ensure `SENTRY_ORG` and `SENTRY_PROJECT` match your Sentry settings

### Too many errors

1. **Adjust sample rates**: Reduce `tracesSampleRate` in `app/_layout.tsx:27`
2. **Filter errors**: Configure inbound filters in Sentry project settings
3. **Add error boundaries**: Catch and handle errors locally before they reach Sentry

## Dashboard Access

- **Sentry Dashboard**: https://sentry.io/organizations/serenity-dev/projects/itimedit/
- **Issues**: https://sentry.io/organizations/serenity-dev/issues/?project=4510146354020432
- **Performance**: https://sentry.io/organizations/serenity-dev/performance/?project=4510146354020432

## Related Documentation

- [Sentry React Native Docs](https://docs.sentry.io/platforms/react-native/)
- [sentry-expo Plugin](https://docs.expo.dev/guides/using-sentry/)
- [EAS Build Secrets](https://docs.expo.dev/build-reference/variables/#using-secrets-in-environment-variables)

## Next Steps

1. ✅ Add `SENTRY_AUTH_TOKEN` to EAS secrets
2. ✅ Test error reporting in development
3. ✅ Deploy a test build to TestFlight
4. ✅ Verify errors appear in Sentry dashboard
5. ✅ Set up alerts for critical errors
6. ✅ Configure issue assignment rules
7. ✅ Set up release tracking

---

**Last Updated**: October 26, 2025
**Sentry Version**: @sentry/react-native v7.4.0
