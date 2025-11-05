import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { AuthError, ErrorCategory, handleAuthError, createAuthError } from './errors';

/**
 * Configuration for Google OAuth
 */
export interface GoogleAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  convexSignIn: (provider: string, params?: FormData) => Promise<void>;
}

/**
 * Result of the Google OAuth flow
 */
export interface GoogleAuthResult {
  type: 'success' | 'cancel' | 'error';
  code?: string;
  codeVerifier?: string;
  error?: string;
  authError?: AuthError;
}

/**
 * PKCE parameters for OAuth flow
 */
interface PKCEParams {
  codeVerifier: string;
  codeChallenge: string;
}

/**
 * Service for handling Google OAuth authentication on mobile
 * Implements OAuth 2.0 with PKCE (Proof Key for Code Exchange)
 */
export class GoogleAuthService {
  private config: GoogleAuthConfig;

  constructor(config: GoogleAuthConfig) {
    this.config = config;
  }

  /**
   * Generates PKCE parameters for secure OAuth flow
   * 
   * PKCE (Proof Key for Code Exchange) adds an extra layer of security
   * by creating a code verifier and challenge that prevents authorization
   * code interception attacks.
   * 
   * @returns Object containing code verifier and code challenge
   */
  private async generatePKCE(): Promise<PKCEParams> {
    // Generate a cryptographically secure random string for the code verifier
    // The verifier must be between 43-128 characters
    const codeVerifier = this.generateCodeVerifier();

    // Create the code challenge by hashing the verifier with SHA256
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    return {
      codeVerifier,
      codeChallenge,
    };
  }

  /**
   * Generates a cryptographically secure code verifier
   * 
   * The code verifier is a random string between 43-128 characters
   * using the characters [A-Z], [a-z], [0-9], and the punctuation
   * characters -._~ (hyphen, period, underscore, and tilde)
   * 
   * @returns A base64 URL-encoded random string
   */
  private generateCodeVerifier(): string {
    // Generate 32 random bytes (will result in 43 characters when base64 encoded)
    const randomBytes = Crypto.getRandomBytes(32);
    
    // Convert to base64 URL-safe string (no padding, replace +/ with -_)
    const base64String = this.base64URLEncode(randomBytes);
    
    return base64String;
  }

  /**
   * Generates the code challenge from the code verifier
   * 
   * The code challenge is created by hashing the code verifier
   * with SHA256 and then base64 URL-encoding the result
   * 
   * @param codeVerifier - The code verifier to hash
   * @returns Base64 URL-encoded SHA256 hash of the verifier
   */
  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    // Hash the code verifier using SHA256
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      codeVerifier,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );

    // Convert to base64 URL-safe format
    return this.base64URLEncode(hash);
  }

  /**
   * Converts a string or Uint8Array to base64 URL-safe encoding
   * 
   * Base64 URL encoding replaces:
   * - '+' with '-'
   * - '/' with '_'
   * - Removes padding '='
   * 
   * @param input - String or Uint8Array to encode
   * @returns Base64 URL-encoded string
   */
  private base64URLEncode(input: string | Uint8Array): string {
    let base64: string;

    if (typeof input === 'string') {
      // If already base64, just convert to URL-safe
      base64 = input;
    } else {
      // Convert Uint8Array to base64
      const binaryString = Array.from(input)
        .map(byte => String.fromCharCode(byte))
        .join('');
      base64 = btoa(binaryString);
    }

    // Make it URL-safe
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Builds the Google OAuth authorization URL with all required parameters
   * 
   * The URL includes:
   * - client_id: The OAuth client ID
   * - redirect_uri: Where Google should redirect after auth
   * - response_type: Set to 'code' for authorization code flow
   * - scope: Requested permissions (openid, profile, email)
   * - code_challenge: PKCE challenge for security
   * - code_challenge_method: Set to 'S256' for SHA256
   * - state: Random string to prevent CSRF attacks
   * 
   * @param codeChallenge - The PKCE code challenge
   * @param state - Random state parameter for CSRF protection
   * @returns Complete Google OAuth authorization URL
   */
  private buildAuthUrl(codeChallenge: string, state: string): string {
    const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    
    // Build query parameters
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: state,
      // Request access type offline to get refresh token
      access_type: 'offline',
      // Force consent screen to ensure we get refresh token
      prompt: 'consent',
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Generates a random state parameter for CSRF protection
   * 
   * @returns Random base64 URL-encoded string
   */
  private generateState(): string {
    const randomBytes = Crypto.getRandomBytes(16);
    return this.base64URLEncode(randomBytes);
  }

  /**
   * Initiates the Google OAuth sign-in flow
   * 
   * This method:
   * 1. Generates PKCE parameters for security
   * 2. Builds the OAuth authorization URL
   * 3. Opens an in-app browser to Google's auth page
   * 4. Waits for the redirect back to the app
   * 5. Extracts the authorization code from the redirect
   * 
   * @returns GoogleAuthResult with authorization code on success
   */
  async signIn(): Promise<GoogleAuthResult> {
    try {
      // Ensure any previous auth session is completed
      WebBrowser.maybeCompleteAuthSession();

      // Generate PKCE parameters
      const pkce = await this.generatePKCE();
      const state = this.generateState();

      // Build the authorization URL
      const authUrl = this.buildAuthUrl(pkce.codeChallenge, state);

      // Open the in-app browser with Google's OAuth page
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        this.config.redirectUri
      );

      // Handle the different result types
      if (result.type === 'cancel') {
        const authError = createAuthError(
          ErrorCategory.USER_CANCELLATION,
          'User cancelled the authentication flow',
          'Sign in was cancelled',
          null,
          true,
          false
        );
        return {
          type: 'cancel',
          error: 'User cancelled the authentication flow',
          authError,
        };
      }

      if (result.type === 'dismiss') {
        const authError = createAuthError(
          ErrorCategory.USER_CANCELLATION,
          'Authentication was dismissed',
          'Sign in was cancelled',
          null,
          true,
          false
        );
        return {
          type: 'cancel',
          error: 'Authentication was dismissed',
          authError,
        };
      }

      if (result.type === 'locked') {
        const authError = createAuthError(
          ErrorCategory.OAUTH,
          'Another authentication session is already in progress',
          'Another sign in is already in progress. Please wait and try again.',
          null,
          true,
          false
        );
        return {
          type: 'error',
          error: 'Another authentication session is already in progress',
          authError,
        };
      }

      if (result.type !== 'success' || !result.url) {
        const authError = createAuthError(
          ErrorCategory.OAUTH,
          'Failed to complete authentication',
          'Authentication failed. Please try again.',
          null,
          true,
          true
        );
        return {
          type: 'error',
          error: 'Failed to complete authentication',
          authError,
        };
      }

      // Parse the redirect URL to extract the authorization code
      const redirectUrl = new URL(result.url);
      const code = redirectUrl.searchParams.get('code');
      const returnedState = redirectUrl.searchParams.get('state');
      const error = redirectUrl.searchParams.get('error');
      const errorDescription = redirectUrl.searchParams.get('error_description');

      // Check for OAuth errors from Google
      if (error) {
        const authError = createAuthError(
          ErrorCategory.OAUTH,
          `OAuth error: ${error}`,
          errorDescription || 'Authentication failed. Please try again.',
          { error, errorDescription },
          true,
          true
        );
        return {
          type: 'error',
          error: errorDescription || error,
          authError,
        };
      }

      // Verify state parameter to prevent CSRF attacks
      if (returnedState !== state) {
        const authError = createAuthError(
          ErrorCategory.OAUTH,
          'State parameter mismatch - possible CSRF attack',
          'Authentication failed due to a security check. Please try again.',
          { expectedState: state, receivedState: returnedState },
          true,
          true
        );
        return {
          type: 'error',
          error: 'State parameter mismatch - possible CSRF attack',
          authError,
        };
      }

      // Verify we received an authorization code
      if (!code) {
        const authError = createAuthError(
          ErrorCategory.OAUTH,
          'No authorization code received from Google',
          'Authentication failed. Please try again.',
          null,
          true,
          true
        );
        return {
          type: 'error',
          error: 'No authorization code received from Google',
          authError,
        };
      }

      // Return success with the authorization code and code verifier
      return {
        type: 'success',
        code,
        codeVerifier: pkce.codeVerifier,
      };
    } catch (error: any) {
      // Handle unexpected errors with comprehensive error handling
      const authError = handleAuthError(error, 'GoogleAuthService.signIn');
      
      return {
        type: 'error',
        error: authError.message,
        authError,
      };
    }
  }

  /**
   * Exchanges the authorization code for a session token via Convex
   * 
   * This method takes the authorization code received from Google and
   * exchanges it with Convex for a session token. Convex will:
   * 1. Exchange the code with Google for access/refresh tokens
   * 2. Fetch user info from Google
   * 3. Create or update the user in the database
   * 4. Return a session token
   * 
   * @param code - The authorization code from Google
   * @param codeVerifier - The PKCE code verifier
   * @throws AuthError if token exchange fails
   */
  async exchangeCodeForToken(code: string, codeVerifier: string): Promise<void> {
    try {
      // Create FormData with the authorization code and PKCE verifier
      const formData = new FormData();
      formData.append('code', code);
      formData.append('codeVerifier', codeVerifier);
      formData.append('redirectUri', this.config.redirectUri);

      // Call Convex signIn with Google provider and the authorization code
      await this.config.convexSignIn('google', formData);
    } catch (error: any) {
      // Categorize and handle the error appropriately
      const errorMessage = error?.message?.toLowerCase() || '';
      
      // Check for specific error types
      if (errorMessage.includes('invalid authorization code') || 
          errorMessage.includes('invalid_grant') ||
          errorMessage.includes('code has expired')) {
        const authError = createAuthError(
          ErrorCategory.OAUTH,
          'Invalid or expired authorization code',
          'The authorization code is invalid or has expired. Please try signing in again.',
          error,
          true,
          true
        );
        throw authError;
      }
      
      if (errorMessage.includes('network') || 
          errorMessage.includes('timeout') ||
          errorMessage.includes('connection')) {
        const authError = createAuthError(
          ErrorCategory.NETWORK,
          'Network error during token exchange',
          'Network error during authentication. Please check your connection and try again.',
          error,
          true,
          true
        );
        throw authError;
      }

      if (errorMessage.includes('redirect_uri') || 
          errorMessage.includes('client_id')) {
        const authError = createAuthError(
          ErrorCategory.CONFIGURATION,
          'OAuth configuration error',
          'Sign in with Google is temporarily unavailable. Please try again later.',
          error,
          false,
          false
        );
        throw authError;
      }
      
      // Generic Convex error
      const authError = createAuthError(
        ErrorCategory.CONVEX,
        error?.message || 'Token exchange failed',
        'Failed to complete authentication with server. Please try again.',
        error,
        true,
        true
      );
      throw authError;
    }
  }
}
