# Google OAuth "Error 400: invalid_request" Fix Guide

## Problem
Mobile app shows "Access blocked: Authorization Error" with "Error 400: invalid_request" when trying to sign in with Google.

## Root Cause
The Google Cloud Console OAuth client is not configured correctly for the mobile app. The error occurs because:
1. Wrong OAuth client type (Web instead of iOS)
2. Missing or incorrect redirect URI
3. Bundle ID mismatch
4. OAuth consent screen not properly configured

## Solution

### Step 1: Verify Current Configuration

Run the diagnostic script to see current settings:
```bash
cd apps/mobile
npx ts-node scripts/diagnoseGoogleOAuth.ts
```

This will show you:
- The redirect URI that needs to be registered
- Expected bundle ID
- Configuration checklist

### Step 2: Configure Google Cloud Console

#### 2.1 Create or Update iOS OAuth Client

1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" → "OAuth client ID"
3. Select Application type: **iOS**
4. Fill in:
   - **Name**: iTimedIT Mobile (iOS)
   - **Bundle ID**: `com.itimedit.app`
5. Click "Create"
6. **Copy the Client ID** - you'll need this

#### 2.2 Update Environment Variable

Update `apps/mobile/.env.local` with the new iOS client ID:
```bash
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-new-ios-client-id.apps.googleusercontent.com
```

#### 2.3 Configure OAuth Consent Screen

1. Go to [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Configure:
   - **App name**: iTimedIT
   - **User support email**: your-email@example.com
   - **Developer contact**: your-email@example.com
   - **Authorized domains**: (leave empty for mobile apps)
3. Add scopes:
   - `openid`
   - `profile`
   - `email`
4. Save

#### 2.4 Publishing Status

Choose one:

**Option A: Testing Mode** (for development)
- Status: "Testing"
- Add test users: Go to "Test users" section
- Click "Add Users"
- Add your Google account email
- Note: Only test users can sign in

**Option B: Production Mode** (for public use)
- Status: "In production"
- Click "Publish App"
- No verification needed for non-sensitive scopes (openid, profile, email)
- Anyone can sign in

### Step 3: Verify Redirect URI

The redirect URI format for Expo apps is:
```
itimeditapp://auth/callback
```

For iOS OAuth clients, Google may automatically configure this, but verify:
1. Go to your iOS OAuth client
2. Check that redirect URIs section shows the correct URI
3. If not, you may need to add it manually (though iOS clients typically don't require explicit redirect URI registration)

### Step 4: Alternative Solution - Use Expo's Google Authentication

If the above doesn't work, consider using Expo's built-in Google authentication which handles configuration automatically:

```bash
npx expo install @react-native-google-signin/google-signin
```

Or use Expo's Authentication with Google:
```bash
npx expo install expo-auth-session expo-web-browser
```

This approach uses Expo's proxy which handles redirect URIs automatically.

## Testing

After configuration:

1. **Restart Expo dev server**:
   ```bash
   npm run start --workspace=@itimedit/mobile
   ```

2. **Clear app data**:
   - iOS: Delete app and reinstall
   - Android: Settings → Apps → iTimedIT → Clear data

3. **Test sign-in flow**:
   - Tap "Sign in with Google"
   - Should redirect to Google's consent screen
   - Select your account
   - Grant permissions
   - Should redirect back to app successfully

## Debugging

If issues persist:

### Check Redirect URI Format
Run in your terminal:
```bash
npx uri-scheme list
```
Should show: `itimeditapp`

### Check Google OAuth Logs
1. Go to [Google Cloud Console - Logs](https://console.cloud.google.com/logs)
2. Filter by "OAuth"
3. Look for detailed error messages

### Enable Debug Logging
In `apps/mobile/hooks/useAuth.ts`, add logging:
```typescript
const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'itimeditapp',
  path: 'auth/callback'
});
console.log('Redirect URI:', redirectUri);
console.log('Client ID:', googleClientId);
```

### Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| Error 400: invalid_request | Wrong client type | Use iOS client, not Web |
| Error 400: redirect_uri_mismatch | URI not registered | Add exact URI to console |
| Error 403: access_denied | App in testing mode | Add user as test user |
| Error 403: org_internal | Workspace restriction | Remove workspace restriction |
| Invalid client | Wrong client ID | Use iOS client ID |

## Alternative: Use Web Client with Custom Scheme

If you must use a web client (not recommended), you need to:

1. Use "Web application" OAuth client type
2. Add redirect URI: `itimeditapp://auth/callback`
3. Add to "Authorized redirect URIs" section
4. Note: This is not the recommended approach for mobile apps

## Reference Links

- [Google OAuth 2.0 for Mobile Apps](https://developers.google.com/identity/protocols/oauth2/native-app)
- [Expo AuthSession Documentation](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Google Cloud Console](https://console.cloud.google.com)

## Support

If you continue to have issues:
1. Run the diagnostic script: `npx ts-node scripts/diagnoseGoogleOAuth.ts`
2. Check the console output for configuration details
3. Verify each item in the checklist
4. Ensure your Google account is added as a test user (if in Testing mode)
