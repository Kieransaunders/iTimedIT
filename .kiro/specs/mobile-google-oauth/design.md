# Design Document: Mobile Google OAuth Implementation

## Overview

This design document outlines the implementation of Google OAuth authentication for the iTimedIT mobile application using expo-auth-session and expo-web-browser. The implementation will enable mobile users to authenticate with their Google accounts through a secure OAuth 2.0 flow with PKCE (Proof Key for Code Exchange), providing a seamless experience that integrates with the existing Convex authentication backend.

The current mobile app has a placeholder for Google sign-in (commented out in sign-in.tsx) and the useAuth hook has a signInWithGoogle method that calls Convex's built-in Google provider. However, this doesn't work properly on mobile because it requires a proper OAuth redirect flow with custom URL schemes, which is what this implementation will provide.

## Architecture

### High-Level Flow

```
User Taps "Sign in with Google"
    ↓
Generate PKCE Code Verifier & Challenge
    ↓
Open In-App Browser with Google OAuth URL
    ↓
User Authenticates with Google
    ↓
Google Redirects to Custom URL Scheme (itimeditapp://)
    ↓
App Intercepts Redirect & Extracts Auth Code
    ↓
Exchange Auth Code for Tokens with Convex
    ↓
Store Session Token Securely
    ↓
Navigate to Main App
```

### Component Architecture

```
┌─────────────────────────────────────────┐
│         Sign-In Screen (UI)             │
│  - Google Sign-In Button                │
│  - Loading States                       │
│  - Error Display                        │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│      useAuth Hook (State Management)    │
│  - signInWithGoogle()                   │
│  - Token Management                     │
│  - Error Handling                       │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│   GoogleAuthService (OAuth Logic)       │
│  - PKCE Generation                      │
│  - Auth Request Building                │
│  - Token Exchange                       │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴──────┐
        ↓             ↓
┌──────────────┐  ┌──────────────┐
│ expo-auth-   │  │ Convex Auth  │
│ session      │  │ Backend      │
└──────────────┘  └──────────────┘
```

## Components and Interfaces

### 1. GoogleAuthService

A new service module that encapsulates all Google OAuth logic.

**Location:** `apps/mobile/services/googleAuth.ts`

**Interface:**
```typescript
export interface GoogleAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

export interface GoogleAuthResult {
  type: 'success' | 'cancel' | 'error';
  code?: string;
  error?: string;
}

export class GoogleAuthService {
  private config: GoogleAuthConfig;
  
  constructor(config: GoogleAuthConfig);
  
  /**
   * Initiates the Google OAuth flow
   * Returns authorization code on success
   */
  async signIn(): Promise<GoogleAuthResult>;
  
  /**
   * Generates PKCE code verifier and challenge
   */
  private generatePKCE(): { codeVerifier: string; codeChallenge: string };
  
  /**
   * Builds the OAuth authorization URL
   */
  private buildAuthUrl(codeChallenge: string): string;
  
  /**
   * Exchanges authorization code for tokens via Convex
   */
  async exchangeCodeForToken(code: string, codeVerifier: string): Promise<void>;
}
```

**Key Responsibilities:**
- Generate PKCE parameters for secure OAuth flow
- Build Google OAuth authorization URL with proper parameters
- Open in-app browser using expo-web-browser
- Handle redirect and extract authorization code
- Exchange code for tokens through Convex backend

### 2. Updated useAuth Hook

Modify the existing useAuth hook to properly implement Google OAuth.

**Location:** `apps/mobile/hooks/useAuth.ts`

**Changes:**
```typescript
export function useAuth(): UseAuthReturn {
  // ... existing code ...
  
  const signInWithGoogle = useCallback(async () => {
    try {
      setError(null);
      
      // Initialize Google Auth Service
      const googleAuth = new GoogleAuthService({
        clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
        redirectUri: AuthSession.makeRedirectUri({
          scheme: 'itimeditapp',
          path: 'auth/callback'
        }),
        scopes: ['openid', 'profile', 'email']
      });
      
      // Start OAuth flow
      const result = await googleAuth.signIn();
      
      if (result.type === 'cancel') {
        throw new Error('Sign in was cancelled');
      }
      
      if (result.type === 'error' || !result.code) {
        throw new Error(result.error || 'Failed to get authorization code');
      }
      
      // Exchange code for token through Convex
      await googleAuth.exchangeCodeForToken(result.code, result.codeVerifier);
      
      // Store authentication flag
      await secureStorage.storeAuthToken("authenticated");
      
    } catch (err: any) {
      console.error("Google sign in error:", err);
      const errorMessage = err?.message || "Failed to sign in with Google.";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [convexSignIn]);
  
  // ... rest of existing code ...
}
```

### 3. Updated Sign-In Screen

Uncomment and enable the Google sign-in button.

**Location:** `apps/mobile/app/auth/sign-in.tsx`

**Changes:**
- Uncomment the Google sign-in button
- Ensure proper loading states are displayed
- Add error handling UI

### 4. App Configuration

Update app.config.ts to properly configure URL schemes and OAuth settings.

**Location:** `apps/mobile/app.config.ts`

**Changes:**
```typescript
export default ({ config }: ConfigContext): ExpoConfig => ({
  // ... existing config ...
  scheme: "itimeditapp",
  
  ios: {
    // ... existing ios config ...
    bundleIdentifier: "com.itimedit.app",
    infoPlist: {
      // ... existing infoPlist ...
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: ["itimeditapp"]
        }
      ]
    }
  },
  
  android: {
    // ... existing android config ...
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: "itimeditapp",
            host: "auth",
            pathPrefix: "/callback"
          }
        ],
        category: ["BROWSABLE", "DEFAULT"]
      }
    ]
  },
  
  // ... rest of config ...
});
```

### 5. Convex Backend Integration

The Convex backend already supports Google OAuth through @auth/core/providers/google. We need to ensure the mobile app can properly exchange authorization codes.

**Location:** `apps/web/convex/auth.ts` (shared with mobile)

**Current Implementation:**
The backend already has Google OAuth configured. The mobile app will use the same Convex Auth endpoints but with a different OAuth flow:

1. Mobile app gets authorization code from Google
2. Mobile app sends code to Convex's signIn action
3. Convex exchanges code for tokens with Google
4. Convex creates/updates user session
5. Mobile app receives session token

**Required Environment Variables:**
- `AUTH_GOOGLE_ID` - Google OAuth Client ID
- `AUTH_GOOGLE_SECRET` - Google OAuth Client Secret
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID` - Google OAuth Client ID for mobile (may be different from web)

## Data Models

### PKCE Parameters
```typescript
interface PKCEParams {
  codeVerifier: string;    // Random string, 43-128 characters
  codeChallenge: string;   // Base64 URL-encoded SHA256 hash of verifier
  codeChallengeMethod: 'S256';
}
```

### OAuth State
```typescript
interface OAuthState {
  codeVerifier: string;
  redirectUri: string;
  timestamp: number;
}
```

### Auth Result
```typescript
interface AuthResult {
  type: 'success' | 'cancel' | 'error' | 'dismiss' | 'locked';
  code?: string;
  error?: string;
  params?: Record<string, string>;
  url?: string;
}
```

## Error Handling

### Error Categories

1. **User Cancellation**
   - User closes the browser before completing auth
   - Handle gracefully, return to sign-in screen
   - No error message needed

2. **Network Errors**
   - No internet connection
   - Timeout during OAuth flow
   - Display: "Please check your internet connection and try again"

3. **OAuth Errors**
   - Invalid client ID
   - Redirect URI mismatch
   - Invalid authorization code
   - Display: "Authentication failed. Please try again"

4. **Convex Integration Errors**
   - Token exchange fails
   - Session creation fails
   - Display: "Failed to complete sign in. Please try again"

5. **Configuration Errors**
   - Missing environment variables
   - Invalid redirect URI format
   - Log error and display: "Sign in with Google is temporarily unavailable"

### Error Handling Strategy

```typescript
try {
  // OAuth flow
} catch (error) {
  if (error.code === 'USER_CANCELLED') {
    // Silent failure, just return to sign-in
    return;
  }
  
  if (error.code === 'NETWORK_ERROR') {
    showToast({
      type: 'error',
      title: 'Connection Error',
      message: 'Please check your internet connection'
    });
    return;
  }
  
  // Log all errors for debugging
  console.error('Google OAuth Error:', {
    code: error.code,
    message: error.message,
    stack: error.stack
  });
  
  // Generic error message for users
  showToast({
    type: 'error',
    title: 'Sign In Failed',
    message: 'Unable to sign in with Google. Please try again.'
  });
}
```

## Testing Strategy

### Unit Tests

1. **PKCE Generation**
   - Test code verifier generation (length, characters)
   - Test code challenge generation (SHA256 hashing)
   - Test that verifier and challenge are properly paired

2. **URL Building**
   - Test authorization URL construction
   - Test parameter encoding
   - Test redirect URI formatting

3. **Error Handling**
   - Test each error type is properly categorized
   - Test error messages are user-friendly
   - Test error logging includes necessary debug info

### Integration Tests

1. **OAuth Flow**
   - Test successful authentication flow
   - Test user cancellation
   - Test network failure scenarios
   - Test invalid authorization code handling

2. **Convex Integration**
   - Test token exchange with Convex
   - Test session creation
   - Test user data retrieval after auth

3. **State Management**
   - Test auth state updates correctly
   - Test navigation after successful auth
   - Test error state handling

### Manual Testing Checklist

- [ ] Google sign-in button appears and is enabled
- [ ] Tapping button opens Google auth page in in-app browser
- [ ] Can successfully authenticate with Google account
- [ ] Browser closes automatically after auth
- [ ] App navigates to main screen after successful auth
- [ ] User data loads correctly after auth
- [ ] Cancelling auth returns to sign-in screen without error
- [ ] Network errors show appropriate message
- [ ] Invalid credentials show appropriate error
- [ ] Works on both iOS and Android
- [ ] Works in development and production builds
- [ ] Redirect URI works correctly in all environments

## Security Considerations

### 1. PKCE Implementation
- Use cryptographically secure random number generator for code verifier
- Properly hash code verifier to create challenge
- Never log or expose code verifier in production

### 2. Redirect URI Validation
- Validate redirect URI matches configured value
- Use custom URL scheme to prevent hijacking
- Verify state parameter to prevent CSRF attacks

### 3. Token Storage
- Store tokens using expo-secure-store (encrypted storage)
- Never store tokens in AsyncStorage or plain text
- Clear tokens on sign out

### 4. HTTPS Requirements
- All OAuth communication must use HTTPS
- Validate SSL certificates
- Fail closed on certificate errors

### 5. Scope Limitation
- Request only necessary scopes (openid, profile, email)
- Don't request additional permissions without user consent
- Document why each scope is needed

## Configuration Requirements

### Environment Variables

**Development (.env.local):**
```bash
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-dev-client-id.apps.googleusercontent.com
EXPO_PUBLIC_CONVEX_URL=https://your-dev-convex.convex.cloud
```

**Production (.env.production):**
```bash
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-prod-client-id.apps.googleusercontent.com
EXPO_PUBLIC_CONVEX_URL=https://your-prod-convex.convex.cloud
```

### Google Cloud Console Configuration

1. **Create OAuth 2.0 Client ID**
   - Application type: iOS / Android
   - Bundle ID (iOS): com.itimedit.app
   - Package name (Android): com.itimedit.app

2. **Configure Redirect URIs**
   - iOS: `itimeditapp://auth/callback`
   - Android: `itimeditapp://auth/callback`
   - Development: `exp://localhost:8081/--/auth/callback` (for Expo Go)

3. **Configure OAuth Consent Screen**
   - App name: iTimedIT
   - User support email
   - Developer contact email
   - Scopes: openid, profile, email

### Package Dependencies

Add to `apps/mobile/package.json`:
```json
{
  "dependencies": {
    "expo-auth-session": "~6.0.7",
    "expo-crypto": "~15.0.7",
    "expo-web-browser": "~15.0.8"
  }
}
```

Note: expo-web-browser is already installed, but expo-auth-session and expo-crypto need to be added.

## Implementation Notes

### Expo AuthSession vs Manual Implementation

We're using expo-auth-session because it:
- Handles PKCE generation automatically
- Manages redirect URI construction
- Provides consistent behavior across iOS and Android
- Handles edge cases (app backgrounding, etc.)
- Is well-tested and maintained by Expo team

### Development vs Production

**Development (Expo Go):**
- Uses Expo's proxy for redirects
- Redirect URI: `exp://localhost:8081/--/auth/callback`
- Requires different Google OAuth client

**Production (Standalone builds):**
- Uses custom URL scheme
- Redirect URI: `itimeditapp://auth/callback`
- Uses production Google OAuth client

### Platform Differences

**iOS:**
- Uses SFAuthenticationSession (iOS 11+) or ASWebAuthenticationSession (iOS 12+)
- Automatically shows "Sign in with..." prompt
- Better security with separate browser context

**Android:**
- Uses Chrome Custom Tabs
- Shares cookies with Chrome browser
- May show "Complete action using" dialog

## Migration Path

Since the Google sign-in button is currently commented out, this is a new feature rather than a migration. However, we need to ensure:

1. Existing email/password users are not affected
2. Anonymous users can still use the app
3. Users who previously tried Google sign-in (and failed) can now use it
4. The UI clearly indicates Google sign-in is available

## Performance Considerations

1. **OAuth Flow Latency**
   - Opening browser: ~500ms
   - User authentication: variable (user-dependent)
   - Token exchange: ~1-2s
   - Total: 2-5s for successful flow

2. **Bundle Size Impact**
   - expo-auth-session: ~50KB
   - expo-crypto: ~20KB
   - Total impact: ~70KB (minimal)

3. **Memory Usage**
   - In-app browser: ~50-100MB (temporary)
   - Released when browser closes

## Rollout Strategy

1. **Phase 1: Development Testing**
   - Implement and test in development environment
   - Verify OAuth flow works with Expo Go
   - Test on both iOS and Android simulators

2. **Phase 2: Internal Testing**
   - Build standalone development builds
   - Test with real devices
   - Verify production OAuth configuration

3. **Phase 3: Beta Release**
   - Release to small group of beta testers
   - Monitor error rates and user feedback
   - Fix any issues discovered

4. **Phase 4: Production Release**
   - Enable Google sign-in for all users
   - Monitor authentication success rates
   - Provide support documentation

## Success Metrics

- Google sign-in success rate > 95%
- Average authentication time < 10 seconds
- Error rate < 5%
- User adoption of Google sign-in > 30% of new users
- Zero security incidents related to OAuth implementation
