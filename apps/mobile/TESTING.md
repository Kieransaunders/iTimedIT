# Authentication Testing Guide

This document provides comprehensive testing instructions for all authentication methods in the iTimedIT mobile app.

## Prerequisites

Before testing, ensure the following:

1. **Convex Backend is Running**
   - The mobile app connects to: `https://watchful-hedgehog-860.convex.cloud`
   - Verify the backend is accessible

2. **Google OAuth Configuration (for Google Sign-In)**
   - Backend must have `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` set
   - Check: `WebCompanianApp/iTimedIT/apps/web/.env.local`
   - These should contain your Google OAuth credentials from [Google Cloud Console](https://console.cloud.google.com/)

3. **Development Environment**
   - Run `npm start` or `expo start` to launch the app
   - Test on iOS Simulator, Android Emulator, or physical device

---

## Test Cases

### 1. Email/Password Sign-In

**Purpose**: Verify traditional email/password authentication works correctly.

#### Test Steps:
1. Launch the app - you should see the sign-in screen
2. Enter a valid email address (e.g., `test@example.com`)
3. Enter the password for that account
4. Tap the **"Sign In"** button
5. Verify loading state appears (spinner in button)
6. Wait for authentication to complete

#### Expected Results:
- ✅ Loading spinner appears on the "Sign In" button
- ✅ All buttons are disabled during sign-in
- ✅ Success toast appears: "Welcome back! You have successfully signed in."
- ✅ App navigates to main screen (tabs interface)
- ✅ User data is properly loaded

#### Error Scenarios to Test:
- **Invalid Email**: Enter malformed email → should show validation error
- **Wrong Password**: Enter incorrect password → "Sign In Failed" toast
- **Empty Fields**: Try to sign in without filling fields → validation errors

---

### 2. Google OAuth Sign-In

**Purpose**: Verify Google OAuth integration works on mobile.

#### Backend Setup Required:
```bash
# In WebCompanianApp/iTimedIT/apps/web/.env.local
AUTH_GOOGLE_ID=your-google-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-google-client-secret
```

#### Test Steps:
1. Launch the app and navigate to sign-in screen
2. Scroll down to see the **"Sign in with Google"** button (outline style)
3. Tap the button
4. Verify OAuth flow initiates (browser/webview opens)
5. Sign in with your Google account in the browser
6. Authorize the app to access your profile
7. Verify redirect back to the app

#### Expected Results:
- ✅ Loading spinner appears on "Sign in with Google" button
- ✅ All buttons are disabled during OAuth flow
- ✅ Browser/webview opens with Google sign-in page
- ✅ After authorization, redirects back to app
- ✅ Success toast: "Welcome! You have successfully signed in with Google."
- ✅ User profile populated with Google data (name, email, profile image)
- ✅ App navigates to main screen

#### Error Scenarios to Test:
- **OAuth Cancelled**: Close browser during sign-in → should show error toast
- **Missing Credentials**: Test without backend credentials → "Google Sign In Failed" toast

#### Verify User Data:
After successful Google sign-in, check that:
- `user.name` contains your Google display name
- `user.email` contains your Google email
- `user.image` contains your Google profile picture URL
- `user.isAnonymous` is `false` or `undefined`

---

### 3. Anonymous/Guest Sign-In

**Purpose**: Verify users can try the app without creating an account.

#### Test Steps:
1. Launch the app and navigate to sign-in screen
2. Scroll to the bottom to find the **"Try App"** button (ghost style)
3. Tap the button
4. Verify loading state appears
5. Wait for authentication to complete

#### Expected Results:
- ✅ Loading spinner appears on "Try App" button
- ✅ All buttons are disabled during sign-in
- ✅ Success toast: "Welcome! Explore the app as a guest."
- ✅ App navigates to main screen immediately
- ✅ User is authenticated but marked as anonymous

#### Verify Anonymous User Data:
After successful anonymous sign-in, check that:
- `user.isAnonymous` is `true`
- `user.email` is `undefined` or empty
- `user.name` is `undefined` or generic
- User can access all app features

#### Anonymous User Limitations (if any):
- Check if anonymous users have restricted features
- Verify data is properly isolated per anonymous session
- Test that anonymous users can upgrade to full account later (if supported)

---

## Testing Checklist

Use this checklist when performing a full authentication test cycle:

### Initial State
- [ ] App starts and shows sign-in screen
- [ ] All three sign-in options are visible and styled correctly
- [ ] No authentication errors in console

### Email/Password
- [ ] Can sign in with valid credentials
- [ ] Shows loading state during sign-in
- [ ] Displays success toast
- [ ] Navigates to main app
- [ ] Handles invalid credentials gracefully
- [ ] Shows validation errors for malformed input

### Google OAuth
- [ ] Backend has Google OAuth credentials configured
- [ ] "Sign in with Google" button triggers OAuth flow
- [ ] Browser/webview opens correctly
- [ ] Can complete Google authentication
- [ ] Returns to app after authorization
- [ ] User profile populated with Google data
- [ ] Handles OAuth cancellation

### Anonymous
- [ ] "Try App" button works without any input
- [ ] Anonymous user created successfully
- [ ] User marked as anonymous in database
- [ ] Can access app features as guest
- [ ] Data isolated from other users

### Session Management
- [ ] User stays logged in after app restart
- [ ] Can sign out successfully
- [ ] Signing out returns to sign-in screen
- [ ] Session token is cleared on sign out

### UI/UX
- [ ] All buttons are properly disabled during loading
- [ ] Loading spinners appear in buttons
- [ ] Toast messages display correctly
- [ ] Navigation flows work smoothly
- [ ] No UI glitches or visual issues

---

## Debugging Tips

### Check Authentication State
View auth state in your hooks:
```javascript
const { isAuthenticated, user, isLoading, error } = useAuth();
console.log('Auth State:', { isAuthenticated, user, isLoading, error });
```

### Verify Backend Connection
Check if Convex backend is accessible:
- Convex URL: `https://watchful-hedgehog-860.convex.cloud`
- Check console for connection errors
- Verify `EXPO_PUBLIC_CONVEX_URL` in `.env.local`

### Common Issues

1. **"Failed to sign in with Google"**
   - Check `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` in backend `.env.local`
   - Verify OAuth redirect URIs in Google Cloud Console
   - Check that Convex deployment URL is authorized

2. **"Session has expired"**
   - Token storage may be corrupted
   - Clear app data and try again
   - Check `secureStorage` implementation

3. **Navigation doesn't work after sign-in**
   - Verify `isAuthenticated` becomes `true`
   - Check `ProtectedLayout` routing logic in `app/_layout.tsx`
   - Ensure auth state updates properly

4. **Anonymous sign-in fails**
   - Verify `Anonymous` provider is configured in `convex/auth.ts`
   - Check backend logs for errors
   - Ensure anonymous authentication is not disabled

---

## Test Report Template

Use this template to document your test results:

```markdown
## Test Report - [Date]

**Environment**: iOS Simulator / Android Emulator / Physical Device
**App Version**: 1.0.0
**Tester**: [Your Name]

### Email/Password Sign-In
- Status: ✅ Pass / ❌ Fail
- Notes:

### Google OAuth Sign-In
- Status: ✅ Pass / ❌ Fail
- Notes:

### Anonymous Sign-In
- Status: ✅ Pass / ❌ Fail
- Notes:

### Issues Found:
1.
2.

### Recommendations:
1.
2.
```

---

## Next Steps

After successful authentication testing:

1. **Security Review**: Verify tokens are stored securely in `SecureStore`
2. **Session Management**: Test token expiration and refresh logic
3. **Multi-device**: Test signing in on multiple devices simultaneously
4. **Account Linking**: Test upgrading anonymous users to full accounts
5. **Sign Out**: Verify clean sign-out and data clearing

---

## Support

For issues or questions:
- Check Convex logs: [Convex Dashboard](https://dashboard.convex.dev/)
- Review backend auth configuration: `WebCompanianApp/iTimedIT/apps/web/convex/auth.ts`
- Check mobile auth implementation: `hooks/useAuth.ts`
