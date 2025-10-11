# Implementation Plan

- [x] 1. Install and configure required dependencies
  - Install expo-auth-session and expo-crypto packages
  - Update package.json with correct versions
  - Run npm install to ensure dependencies are properly installed
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 2. Update app configuration for OAuth redirect handling
  - Modify app.config.ts to add CFBundleURLTypes for iOS
  - Add Android intent filters for custom URL scheme handling
  - Ensure scheme "itimeditapp" is properly configured
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Create GoogleAuthService module
  - [x] 3.1 Implement PKCE generation utilities
    - Create function to generate cryptographically secure code verifier
    - Implement SHA256 hashing for code challenge generation
    - Write unit tests for PKCE parameter generation
    - _Requirements: 3.1, 4.1_

  - [x] 3.2 Implement OAuth URL builder
    - Create function to build Google OAuth authorization URL
    - Include all required parameters (client_id, redirect_uri, scope, code_challenge, etc.)
    - Properly encode URL parameters
    - Write unit tests for URL construction
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Implement OAuth flow initiation
    - Create signIn method that opens in-app browser with expo-web-browser
    - Use expo-auth-session to handle redirect
    - Extract authorization code from redirect URL
    - Handle user cancellation gracefully
    - Write unit tests for flow initiation
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 3.4 Implement token exchange with Convex
    - Create method to exchange authorization code for session token
    - Call Convex signIn action with Google provider and authorization code
    - Handle token exchange errors
    - Write unit tests for token exchange
    - _Requirements: 6.1, 6.2, 6.4_

- [x] 4. Update useAuth hook for Google OAuth
  - Modify signInWithGoogle method to use GoogleAuthService
  - Initialize GoogleAuthService with proper configuration
  - Handle OAuth result (success, cancel, error)
  - Update error state management for OAuth-specific errors
  - Store authentication token securely after successful auth
  - Write unit tests for updated hook behavior
  - _Requirements: 1.5, 3.2, 3.3, 3.4, 6.1, 6.2_

- [x] 5. Update sign-in screen UI
  - Uncomment Google sign-in button in sign-in.tsx
  - Ensure button shows loading state during OAuth flow
  - Display appropriate error messages for OAuth failures
  - Add accessibility labels for Google sign-in button
  - Test UI responsiveness during OAuth flow
  - _Requirements: 1.1, 5.1, 5.2, 5.3_

- [-] 6. Implement comprehensive error handling
  - Add error categorization (user cancellation, network, OAuth, Convex, configuration)
  - Implement user-friendly error messages for each category
  - Add error logging for debugging
  - Handle edge cases (app backgrounding, network timeout, etc.)
  - Write unit tests for error handling logic
  - _Requirements: 1.4, 5.2, 5.4, 6.4_

- [ ] 7. Add environment variable configuration
  - Create .env.local template with EXPO_PUBLIC_GOOGLE_CLIENT_ID
  - Document required environment variables in README
  - Add validation to check for missing environment variables
  - Provide clear error message if Google OAuth is not configured
  - _Requirements: 2.4, 4.1_

- [ ] 8. Create integration tests for OAuth flow
  - Write test for successful authentication flow
  - Write test for user cancellation scenario
  - Write test for network failure handling
  - Write test for invalid authorization code handling
  - Write test for Convex token exchange
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2_

- [ ] 9. Test OAuth flow on iOS simulator
  - Build and run app on iOS simulator
  - Test Google sign-in button appears and is enabled
  - Verify in-app browser opens with Google auth page
  - Test successful authentication flow
  - Test user cancellation
  - Verify app navigates to main screen after auth
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [ ] 10. Test OAuth flow on Android emulator
  - Build and run app on Android emulator
  - Test Google sign-in button appears and is enabled
  - Verify Chrome Custom Tab opens with Google auth page
  - Test successful authentication flow
  - Test user cancellation
  - Verify app navigates to main screen after auth
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [ ] 11. Configure Google Cloud Console for mobile OAuth
  - Create OAuth 2.0 client IDs for iOS and Android
  - Add redirect URIs for both platforms (itimeditapp://auth/callback)
  - Configure OAuth consent screen
  - Add required scopes (openid, profile, email)
  - Document configuration steps
  - _Requirements: 2.1, 2.2, 2.3, 3.5_

- [ ] 12. Test with real devices
  - Build standalone development builds for iOS and Android
  - Test OAuth flow on physical iOS device
  - Test OAuth flow on physical Android device
  - Verify redirect handling works correctly
  - Test in various network conditions
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 13. Add documentation
  - Document Google OAuth setup process in README
  - Add troubleshooting guide for common OAuth issues
  - Document environment variable requirements
  - Add code comments explaining OAuth flow
  - Create user-facing documentation for Google sign-in
  - _Requirements: 2.4, 5.2_

- [ ] 14. Verify security implementation
  - Confirm PKCE is properly implemented
  - Verify tokens are stored in secure storage
  - Check that code verifier is never logged
  - Ensure HTTPS is used for all OAuth communication
  - Verify redirect URI validation
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
