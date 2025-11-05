import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";
import Constants from "expo-constants";

// Needed for web browser authentication to work properly
WebBrowser.maybeCompleteAuthSession();

const googleClientId = Constants.expoConfig?.extra?.googleClientId ||
                       process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

// OAuth configuration
const discovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

export interface GoogleAuthResult {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  user?: {
    email: string;
    name: string;
    picture: string;
  };
}

/**
 * Generates a cryptographically secure code verifier for PKCE
 * The code verifier is a random string between 43-128 characters
 */
function generateCodeVerifier(): string {
  // Generate 32 random bytes (will result in 43 characters when base64 encoded)
  const randomBytes = Crypto.getRandomBytes(32);

  // Convert to base64 URL-safe string (no padding, replace +/ with -_)
  return base64URLEncode(randomBytes);
}

/**
 * Converts a Uint8Array or string to base64 URL-safe encoding
 * Base64 URL encoding replaces '+' with '-', '/' with '_', and removes padding '='
 */
function base64URLEncode(input: string | Uint8Array): string {
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
 * Initiates Google OAuth PKCE flow
 */
export async function signInWithGoogle(): Promise<GoogleAuthResult | null> {
  try {
    if (!googleClientId) {
      throw new Error("Missing EXPO_PUBLIC_GOOGLE_CLIENT_ID environment variable");
    }

    // Generate code verifier and challenge for PKCE (manual implementation for compatibility)
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = base64URLEncode(
      await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        codeVerifier,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      )
    );

    // Create authentication request
    const request = new AuthSession.AuthRequest({
      clientId: googleClientId,
      scopes: ["openid", "profile", "email"],
      redirectUri: AuthSession.makeRedirectUri({
        scheme: "itimeditapp",
      }),
      usePKCE: true,
      codeChallenge,
      codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
    });

    // Prompt user to authenticate
    const result = await request.promptAsync(discovery);

    if (result.type === "success") {
      const { code } = result.params;

      // Exchange authorization code for tokens
      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId: googleClientId,
          code,
          redirectUri: request.redirectUri,
          extraParams: {
            code_verifier: codeVerifier,
          },
        },
        discovery
      );

      return {
        accessToken: tokenResult.accessToken,
        idToken: tokenResult.idToken,
        refreshToken: tokenResult.refreshToken,
      };
    }

    return null;
  } catch (error) {
    console.error("Google sign-in error:", error);
    throw error;
  }
}

/**
 * Signs out the user
 */
export async function signOut(): Promise<void> {
  // Token cleanup handled by calling code
}
