import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { useAuthActions } from '@convex-dev/auth/react';

/**
 * Configuration for Google OAuth
 */
export interface GoogleAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

/**
 * Result of the Google OAuth flow
 */
export interface GoogleAuthResult {
  type: 'success' | 'cancel' | 'error';
  code?: string;
  codeVerifier?: string;
  error?: string;
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
}
