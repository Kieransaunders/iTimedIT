import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthService } from '../../services/googleAuth';
import { ErrorCategory } from '../../services/errors';

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  getRandomBytes: jest.fn(),
  digestStringAsync: jest.fn(),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA256',
  },
  CryptoEncoding: {
    BASE64: 'BASE64',
  },
}));

// Mock expo-web-browser
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
  maybeCompleteAuthSession: jest.fn(),
}));

// Mock expo-auth-session
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(),
}));

describe('GoogleAuthService - PKCE Generation', () => {
  let service: GoogleAuthService;
  let mockConvexSignIn: jest.Mock;

  beforeEach(() => {
    mockConvexSignIn = jest.fn().mockResolvedValue(undefined);
    service = new GoogleAuthService({
      clientId: 'test-client-id',
      redirectUri: 'itimeditapp://auth/callback',
      scopes: ['openid', 'profile', 'email'],
      convexSignIn: mockConvexSignIn,
    });

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('generateCodeVerifier', () => {
    it('should generate a code verifier with correct length', async () => {
      // Mock getRandomBytes to return a predictable value
      const mockBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        mockBytes[i] = i;
      }
      (Crypto.getRandomBytes as jest.Mock).mockReturnValue(mockBytes);

      // Access the private method through reflection for testing
      const generateCodeVerifier = (service as any).generateCodeVerifier.bind(service);
      const codeVerifier = generateCodeVerifier();

      // Code verifier should be a base64 URL-encoded string
      expect(typeof codeVerifier).toBe('string');
      
      // Should be at least 43 characters (32 bytes base64 encoded)
      expect(codeVerifier.length).toBeGreaterThanOrEqual(43);
      
      // Should not contain +, /, or = (URL-safe base64)
      expect(codeVerifier).not.toMatch(/[+/=]/);
      
      // Should only contain valid base64 URL characters
      expect(codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should generate different verifiers on subsequent calls', async () => {
      // Mock getRandomBytes to return different values
      let callCount = 0;
      (Crypto.getRandomBytes as jest.Mock).mockImplementation(() => {
        const bytes = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
          bytes[i] = (i + callCount) % 256;
        }
        callCount++;
        return bytes;
      });

      const generateCodeVerifier = (service as any).generateCodeVerifier.bind(service);
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();

      expect(verifier1).not.toBe(verifier2);
    });
  });

  describe('generateCodeChallenge', () => {
    it('should generate a valid code challenge from verifier', async () => {
      const testVerifier = 'test-code-verifier-123';
      const mockHash = 'mockHashValue123==';
      
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(mockHash);

      const generateCodeChallenge = (service as any).generateCodeChallenge.bind(service);
      const codeChallenge = await generateCodeChallenge(testVerifier);

      // Should call digestStringAsync with correct parameters
      expect(Crypto.digestStringAsync).toHaveBeenCalledWith(
        Crypto.CryptoDigestAlgorithm.SHA256,
        testVerifier,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );

      // Should return a string
      expect(typeof codeChallenge).toBe('string');
      
      // Should be URL-safe (no +, /, or =)
      expect(codeChallenge).not.toMatch(/[+/=]/);
    });

    it('should produce consistent challenge for same verifier', async () => {
      const testVerifier = 'consistent-verifier';
      const mockHash = 'consistentHash==';
      
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(mockHash);

      const generateCodeChallenge = (service as any).generateCodeChallenge.bind(service);
      const challenge1 = await generateCodeChallenge(testVerifier);
      const challenge2 = await generateCodeChallenge(testVerifier);

      expect(challenge1).toBe(challenge2);
    });
  });

  describe('base64URLEncode', () => {
    it('should convert standard base64 to URL-safe format', () => {
      const base64URLEncode = (service as any).base64URLEncode.bind(service);
      
      // Standard base64 with +, /, and =
      const standardBase64 = 'abc+def/ghi=';
      const urlSafe = base64URLEncode(standardBase64);

      // Should replace + with -, / with _, and remove =
      expect(urlSafe).toBe('abc-def_ghi');
      expect(urlSafe).not.toMatch(/[+/=]/);
    });

    it('should handle Uint8Array input', () => {
      const base64URLEncode = (service as any).base64URLEncode.bind(service);
      
      // Create a simple byte array
      const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const encoded = base64URLEncode(bytes);

      // Should return a string
      expect(typeof encoded).toBe('string');
      
      // Should be URL-safe
      expect(encoded).not.toMatch(/[+/=]/);
    });

    it('should handle empty input', () => {
      const base64URLEncode = (service as any).base64URLEncode.bind(service);
      
      const emptyBytes = new Uint8Array(0);
      const encoded = base64URLEncode(emptyBytes);

      expect(typeof encoded).toBe('string');
      expect(encoded).toBe('');
    });
  });

  describe('generatePKCE', () => {
    it('should generate both verifier and challenge', async () => {
      const mockBytes = new Uint8Array(32).fill(1);
      const mockHash = 'mockHash123==';
      
      (Crypto.getRandomBytes as jest.Mock).mockReturnValue(mockBytes);
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(mockHash);

      const generatePKCE = (service as any).generatePKCE.bind(service);
      const pkce = await generatePKCE();

      // Should return an object with both properties
      expect(pkce).toHaveProperty('codeVerifier');
      expect(pkce).toHaveProperty('codeChallenge');
      
      // Both should be strings
      expect(typeof pkce.codeVerifier).toBe('string');
      expect(typeof pkce.codeChallenge).toBe('string');
      
      // Both should be non-empty
      expect(pkce.codeVerifier.length).toBeGreaterThan(0);
      expect(pkce.codeChallenge.length).toBeGreaterThan(0);
      
      // Both should be URL-safe
      expect(pkce.codeVerifier).not.toMatch(/[+/=]/);
      expect(pkce.codeChallenge).not.toMatch(/[+/=]/);
    });

    it('should generate valid PKCE parameters meeting OAuth specs', async () => {
      const mockBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        mockBytes[i] = Math.floor(Math.random() * 256);
      }
      const mockHash = 'validHash123==';
      
      (Crypto.getRandomBytes as jest.Mock).mockReturnValue(mockBytes);
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(mockHash);

      const generatePKCE = (service as any).generatePKCE.bind(service);
      const pkce = await generatePKCE();

      // Code verifier should be 43-128 characters (OAuth 2.0 spec)
      expect(pkce.codeVerifier.length).toBeGreaterThanOrEqual(43);
      expect(pkce.codeVerifier.length).toBeLessThanOrEqual(128);
      
      // Should only contain unreserved characters
      expect(pkce.codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(pkce.codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe('generateState', () => {
    it('should generate a random state parameter', () => {
      const mockBytes = new Uint8Array(16).fill(42);
      (Crypto.getRandomBytes as jest.Mock).mockReturnValue(mockBytes);

      const generateState = (service as any).generateState.bind(service);
      const state = generateState();

      // Should be a string
      expect(typeof state).toBe('string');
      
      // Should be non-empty
      expect(state.length).toBeGreaterThan(0);
      
      // Should be URL-safe
      expect(state).not.toMatch(/[+/=]/);
      expect(state).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should generate different states on subsequent calls', () => {
      let callCount = 0;
      (Crypto.getRandomBytes as jest.Mock).mockImplementation(() => {
        const bytes = new Uint8Array(16);
        for (let i = 0; i < 16; i++) {
          bytes[i] = (i + callCount) % 256;
        }
        callCount++;
        return bytes;
      });

      const generateState = (service as any).generateState.bind(service);
      const state1 = generateState();
      const state2 = generateState();

      expect(state1).not.toBe(state2);
    });
  });

  describe('buildAuthUrl', () => {
    it('should build a valid Google OAuth URL with all required parameters', () => {
      const codeChallenge = 'test-challenge-123';
      const state = 'test-state-456';

      const buildAuthUrl = (service as any).buildAuthUrl.bind(service);
      const url = buildAuthUrl(codeChallenge, state);

      // Should start with Google's OAuth endpoint
      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      
      // Should include client_id
      expect(url).toContain('client_id=test-client-id');
      
      // Should include redirect_uri (URL encoded)
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('itimeditapp');
      
      // Should include response_type=code
      expect(url).toContain('response_type=code');
      
      // Should include scopes
      expect(url).toContain('scope=');
      expect(url).toContain('openid');
      expect(url).toContain('profile');
      expect(url).toContain('email');
      
      // Should include PKCE parameters
      expect(url).toContain(`code_challenge=${codeChallenge}`);
      expect(url).toContain('code_challenge_method=S256');
      
      // Should include state
      expect(url).toContain(`state=${state}`);
      
      // Should include access_type and prompt for refresh token
      expect(url).toContain('access_type=offline');
      expect(url).toContain('prompt=consent');
    });

    it('should properly encode URL parameters', () => {
      const serviceWithSpecialChars = new GoogleAuthService({
        clientId: 'test-client-id',
        redirectUri: 'itimeditapp://auth/callback?test=value',
        scopes: ['openid', 'profile', 'email'],
        convexSignIn: mockConvexSignIn,
      });

      const codeChallenge = 'challenge-with-special_chars';
      const state = 'state-123';

      const buildAuthUrl = (serviceWithSpecialChars as any).buildAuthUrl.bind(serviceWithSpecialChars);
      const url = buildAuthUrl(codeChallenge, state);

      // URL should be properly encoded
      expect(url).toContain('redirect_uri=');
      
      // Should not contain unencoded special characters in parameters
      const urlObj = new URL(url);
      expect(urlObj.searchParams.get('redirect_uri')).toBe('itimeditapp://auth/callback?test=value');
    });

    it('should handle multiple scopes correctly', () => {
      const serviceWithManyScopes = new GoogleAuthService({
        clientId: 'test-client-id',
        redirectUri: 'itimeditapp://auth/callback',
        scopes: ['openid', 'profile', 'email', 'https://www.googleapis.com/auth/userinfo.profile'],
        convexSignIn: mockConvexSignIn,
      });

      const codeChallenge = 'test-challenge';
      const state = 'test-state';

      const buildAuthUrl = (serviceWithManyScopes as any).buildAuthUrl.bind(serviceWithManyScopes);
      const url = buildAuthUrl(codeChallenge, state);

      // Should include all scopes space-separated
      const urlObj = new URL(url);
      const scopeParam = urlObj.searchParams.get('scope');
      
      expect(scopeParam).toContain('openid');
      expect(scopeParam).toContain('profile');
      expect(scopeParam).toContain('email');
      expect(scopeParam).toContain('https://www.googleapis.com/auth/userinfo.profile');
    });

    it('should create a valid URL that can be parsed', () => {
      const codeChallenge = 'valid-challenge';
      const state = 'valid-state';

      const buildAuthUrl = (service as any).buildAuthUrl.bind(service);
      const url = buildAuthUrl(codeChallenge, state);

      // Should be a valid URL
      expect(() => new URL(url)).not.toThrow();
      
      const urlObj = new URL(url);
      
      // Should have correct protocol and host
      expect(urlObj.protocol).toBe('https:');
      expect(urlObj.hostname).toBe('accounts.google.com');
      
      // Should have all required parameters
      expect(urlObj.searchParams.has('client_id')).toBe(true);
      expect(urlObj.searchParams.has('redirect_uri')).toBe(true);
      expect(urlObj.searchParams.has('response_type')).toBe(true);
      expect(urlObj.searchParams.has('scope')).toBe(true);
      expect(urlObj.searchParams.has('code_challenge')).toBe(true);
      expect(urlObj.searchParams.has('code_challenge_method')).toBe(true);
      expect(urlObj.searchParams.has('state')).toBe(true);
    });
  });

  describe('signIn - OAuth Flow Initiation', () => {
    beforeEach(() => {
      // Setup default mocks for PKCE generation
      const mockBytes = new Uint8Array(32).fill(1);
      const mockHash = 'mockHash123==';
      (Crypto.getRandomBytes as jest.Mock).mockReturnValue(mockBytes);
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(mockHash);
    });

    it('should successfully complete OAuth flow and return authorization code', async () => {
      // Mock successful OAuth flow
      const mockCode = 'test-auth-code-123';
      
      // Mock consistent byte generation for both verifier and state
      (Crypto.getRandomBytes as jest.Mock).mockReturnValue(new Uint8Array(32).fill(1));
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue('mockHash123==');

      // Capture the state that will be generated during signIn
      let capturedState: string | null = null;
      
      // Mock WebBrowser to capture and use the actual state
      (WebBrowser.openAuthSessionAsync as jest.Mock).mockImplementation(async (url: string) => {
        // Extract state from the URL
        const urlObj = new URL(url);
        capturedState = urlObj.searchParams.get('state');
        
        return {
          type: 'success',
          url: `itimeditapp://auth/callback?code=${mockCode}&state=${capturedState}`,
        };
      });

      const result = await service.signIn();

      // Should call maybeCompleteAuthSession
      expect(WebBrowser.maybeCompleteAuthSession).toHaveBeenCalled();

      // Should call openAuthSessionAsync with correct parameters
      expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
        expect.stringContaining('https://accounts.google.com/o/oauth2/v2/auth'),
        'itimeditapp://auth/callback'
      );

      // Should return success with authorization code
      expect(result.type).toBe('success');
      expect(result.code).toBe(mockCode);
      expect(result.codeVerifier).toBeDefined();
      expect(typeof result.codeVerifier).toBe('string');
    });

    it('should handle user cancellation gracefully', async () => {
      // Mock user cancelling the OAuth flow
      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'cancel',
      });

      const result = await service.signIn();

      expect(result.type).toBe('cancel');
      expect(result.error).toBeDefined();
      expect(result.code).toBeUndefined();
    });

    it('should handle user dismissing the browser', async () => {
      // Mock user dismissing the browser
      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'dismiss',
      });

      const result = await service.signIn();

      expect(result.type).toBe('cancel');
      expect(result.error).toBeDefined();
    });

    it('should handle locked session error', async () => {
      // Mock locked session (another auth in progress)
      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'locked',
      });

      const result = await service.signIn();

      expect(result.type).toBe('error');
      expect(result.error).toContain('already in progress');
    });

    it('should handle OAuth errors from Google', async () => {
      const mockState = 'test-state';
      
      // Mock state generation
      (Crypto.getRandomBytes as jest.Mock).mockImplementation((size: number) => {
        if (size === 16) {
          return new Uint8Array(16).fill(1);
        }
        return new Uint8Array(32).fill(1);
      });

      const tempService = new GoogleAuthService({
        clientId: 'test-client-id',
        redirectUri: 'itimeditapp://auth/callback',
        scopes: ['openid', 'profile', 'email'],
        convexSignIn: mockConvexSignIn,
      });
      const actualState = (tempService as any).generateState();

      // Mock OAuth error response
      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'success',
        url: `itimeditapp://auth/callback?error=access_denied&error_description=User+denied+access&state=${actualState}`,
      });

      const result = await service.signIn();

      expect(result.type).toBe('error');
      expect(result.error).toBeDefined();
      expect(result.error).toContain('denied');
    });

    it('should detect state parameter mismatch (CSRF protection)', async () => {
      const mockCode = 'test-auth-code';
      const wrongState = 'wrong-state-value';

      // Mock successful response but with wrong state
      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'success',
        url: `itimeditapp://auth/callback?code=${mockCode}&state=${wrongState}`,
      });

      const result = await service.signIn();

      expect(result.type).toBe('error');
      expect(result.error).toContain('State parameter mismatch');
      expect(result.error).toContain('CSRF');
    });

    it('should handle missing authorization code', async () => {
      // Mock state generation
      (Crypto.getRandomBytes as jest.Mock).mockImplementation((size: number) => {
        if (size === 16) {
          return new Uint8Array(16).fill(1);
        }
        return new Uint8Array(32).fill(1);
      });

      const tempService = new GoogleAuthService({
        clientId: 'test-client-id',
        redirectUri: 'itimeditapp://auth/callback',
        scopes: ['openid', 'profile', 'email'],
        convexSignIn: mockConvexSignIn,
      });
      const actualState = (tempService as any).generateState();

      // Mock response without code
      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'success',
        url: `itimeditapp://auth/callback?state=${actualState}`,
      });

      const result = await service.signIn();

      expect(result.type).toBe('error');
      expect(result.error).toContain('No authorization code');
    });

    it('should handle network errors', async () => {
      // Mock network error
      (WebBrowser.openAuthSessionAsync as jest.Mock).mockRejectedValue(
        new Error('Network request failed')
      );

      const result = await service.signIn();

      expect(result.type).toBe('error');
      expect(result.error).toBeDefined();
    });

    it('should handle unexpected errors gracefully', async () => {
      // Mock unexpected error
      (WebBrowser.openAuthSessionAsync as jest.Mock).mockRejectedValue(
        new Error('Unexpected error occurred')
      );

      const result = await service.signIn();

      expect(result.type).toBe('error');
      expect(result.error).toContain('error');
    });

    it('should include PKCE parameters in the authorization URL', async () => {
      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'cancel',
      });

      await service.signIn();

      // Get the URL that was passed to openAuthSessionAsync
      const callArgs = (WebBrowser.openAuthSessionAsync as jest.Mock).mock.calls[0];
      const authUrl = callArgs[0];

      // Verify PKCE parameters are included
      expect(authUrl).toContain('code_challenge=');
      expect(authUrl).toContain('code_challenge_method=S256');
    });
  });

  describe('exchangeCodeForToken - Token Exchange with Convex', () => {
    let mockConvexSignIn: jest.Mock;
    let serviceWithConvex: GoogleAuthService;

    beforeEach(() => {
      mockConvexSignIn = jest.fn().mockResolvedValue(undefined);
      serviceWithConvex = new GoogleAuthService({
        clientId: 'test-client-id',
        redirectUri: 'itimeditapp://auth/callback',
        scopes: ['openid', 'profile', 'email'],
        convexSignIn: mockConvexSignIn,
      });
    });

    it('should successfully exchange authorization code for token', async () => {
      const code = 'test-auth-code-123';
      const codeVerifier = 'test-code-verifier-456';

      await serviceWithConvex.exchangeCodeForToken(code, codeVerifier);

      // Should call convexSignIn with correct parameters
      expect(mockConvexSignIn).toHaveBeenCalledWith('google', expect.any(FormData));

      // Verify FormData contains correct values
      const formData = mockConvexSignIn.mock.calls[0][1] as FormData;
      expect(formData.get('code')).toBe(code);
      expect(formData.get('codeVerifier')).toBe(codeVerifier);
      expect(formData.get('redirectUri')).toBe('itimeditapp://auth/callback');
    });

    it('should handle invalid authorization code error', async () => {
      mockConvexSignIn.mockRejectedValue(
        new Error('Invalid authorization code')
      );

      const code = 'invalid-code';
      const codeVerifier = 'test-verifier';

      await expect(
        serviceWithConvex.exchangeCodeForToken(code, codeVerifier)
      ).rejects.toThrow('authorization code is invalid or has expired');
    });

    it('should handle network errors during token exchange', async () => {
      mockConvexSignIn.mockRejectedValue(
        new Error('Network error: Failed to fetch')
      );

      const code = 'test-code';
      const codeVerifier = 'test-verifier';

      await expect(
        serviceWithConvex.exchangeCodeForToken(code, codeVerifier)
      ).rejects.toThrow('Network error during authentication');
    });

    it('should handle generic Convex errors', async () => {
      mockConvexSignIn.mockRejectedValue(
        new Error('Convex authentication failed')
      );

      const code = 'test-code';
      const codeVerifier = 'test-verifier';

      await expect(
        serviceWithConvex.exchangeCodeForToken(code, codeVerifier)
      ).rejects.toThrow('Convex authentication failed');
    });

    it('should handle errors without message', async () => {
      mockConvexSignIn.mockRejectedValue(new Error());

      const code = 'test-code';
      const codeVerifier = 'test-verifier';

      await expect(
        serviceWithConvex.exchangeCodeForToken(code, codeVerifier)
      ).rejects.toThrow();
    });

    it('should pass redirect URI to Convex', async () => {
      const customService = new GoogleAuthService({
        clientId: 'test-client-id',
        redirectUri: 'custom://redirect/uri',
        scopes: ['openid'],
        convexSignIn: mockConvexSignIn,
      });

      const code = 'test-code';
      const codeVerifier = 'test-verifier';

      await customService.exchangeCodeForToken(code, codeVerifier);

      const formData = mockConvexSignIn.mock.calls[0][1] as FormData;
      expect(formData.get('redirectUri')).toBe('custom://redirect/uri');
    });
  });

  describe('Error Handling - Comprehensive Error Categorization', () => {
    let mockConvexSignIn: jest.Mock;
    let serviceWithErrors: GoogleAuthService;

    beforeEach(() => {
      mockConvexSignIn = jest.fn().mockResolvedValue(undefined);
      serviceWithErrors = new GoogleAuthService({
        clientId: 'test-client-id',
        redirectUri: 'itimeditapp://auth/callback',
        scopes: ['openid', 'profile', 'email'],
        convexSignIn: mockConvexSignIn,
      });

      // Setup default mocks
      const mockBytes = new Uint8Array(32).fill(1);
      const mockHash = 'mockHash123==';
      (Crypto.getRandomBytes as jest.Mock).mockReturnValue(mockBytes);
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(mockHash);
    });

    describe('User Cancellation Errors', () => {
      it('should return structured error for user cancellation', async () => {
        (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
          type: 'cancel',
        });

        const result = await serviceWithErrors.signIn();

        expect(result.type).toBe('cancel');
        expect(result.authError).toBeDefined();
        expect(result.authError?.category).toBe(ErrorCategory.USER_CANCELLATION);
        expect(result.authError?.recoverable).toBe(true);
        expect(result.authError?.retryable).toBe(false);
      });

      it('should return structured error for browser dismissal', async () => {
        (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
          type: 'dismiss',
        });

        const result = await serviceWithErrors.signIn();

        expect(result.type).toBe('cancel');
        expect(result.authError).toBeDefined();
        expect(result.authError?.category).toBe(ErrorCategory.USER_CANCELLATION);
      });
    });

    describe('OAuth Errors', () => {
      it('should return structured error for locked session', async () => {
        (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
          type: 'locked',
        });

        const result = await serviceWithErrors.signIn();

        expect(result.type).toBe('error');
        expect(result.authError).toBeDefined();
        expect(result.authError?.category).toBe(ErrorCategory.OAUTH);
        expect(result.authError?.userMessage).toContain('already in progress');
      });

      it('should return structured error for OAuth access denied', async () => {
        (Crypto.getRandomBytes as jest.Mock).mockImplementation((size: number) => {
          return new Uint8Array(size).fill(1);
        });

        const tempService = new GoogleAuthService({
          clientId: 'test-client-id',
          redirectUri: 'itimeditapp://auth/callback',
          scopes: ['openid', 'profile', 'email'],
          convexSignIn: mockConvexSignIn,
        });
        const actualState = (tempService as any).generateState();

        (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
          type: 'success',
          url: `itimeditapp://auth/callback?error=access_denied&error_description=User+denied+access&state=${actualState}`,
        });

        const result = await serviceWithErrors.signIn();

        expect(result.type).toBe('error');
        expect(result.authError).toBeDefined();
        expect(result.authError?.category).toBe(ErrorCategory.OAUTH);
        expect(result.error).toContain('denied');
      });

      it('should return structured error for state mismatch', async () => {
        const mockCode = 'test-code';
        const wrongState = 'wrong-state';

        (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
          type: 'success',
          url: `itimeditapp://auth/callback?code=${mockCode}&state=${wrongState}`,
        });

        const result = await serviceWithErrors.signIn();

        expect(result.type).toBe('error');
        expect(result.authError).toBeDefined();
        expect(result.authError?.category).toBe(ErrorCategory.OAUTH);
        expect(result.error).toContain('State parameter mismatch');
      });

      it('should return structured error for missing authorization code', async () => {
        (Crypto.getRandomBytes as jest.Mock).mockImplementation((size: number) => {
          return new Uint8Array(size).fill(1);
        });

        const tempService = new GoogleAuthService({
          clientId: 'test-client-id',
          redirectUri: 'itimeditapp://auth/callback',
          scopes: ['openid', 'profile', 'email'],
          convexSignIn: mockConvexSignIn,
        });
        const actualState = (tempService as any).generateState();

        (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
          type: 'success',
          url: `itimeditapp://auth/callback?state=${actualState}`,
        });

        const result = await serviceWithErrors.signIn();

        expect(result.type).toBe('error');
        expect(result.authError).toBeDefined();
        expect(result.authError?.category).toBe(ErrorCategory.OAUTH);
        expect(result.error).toContain('No authorization code');
      });
    });

    describe('Network Errors', () => {
      it('should categorize network errors correctly', async () => {
        (WebBrowser.openAuthSessionAsync as jest.Mock).mockRejectedValue(
          new Error('Network request failed')
        );

        const result = await serviceWithErrors.signIn();

        expect(result.type).toBe('error');
        expect(result.authError).toBeDefined();
        expect(result.authError?.category).toBe(ErrorCategory.NETWORK);
        expect(result.authError?.retryable).toBe(true);
      });

      it('should handle timeout errors', async () => {
        (WebBrowser.openAuthSessionAsync as jest.Mock).mockRejectedValue(
          new Error('Request timeout')
        );

        const result = await serviceWithErrors.signIn();

        expect(result.type).toBe('error');
        expect(result.authError).toBeDefined();
        expect(result.authError?.category).toBe(ErrorCategory.NETWORK);
      });
    });

    describe('Token Exchange Errors', () => {
      it('should throw OAuth error for invalid authorization code', async () => {
        mockConvexSignIn.mockRejectedValue(
          new Error('Invalid authorization code')
        );

        try {
          await serviceWithErrors.exchangeCodeForToken('invalid-code', 'verifier');
          fail('Should have thrown an error');
        } catch (error: any) {
          expect(error.category).toBe(ErrorCategory.OAUTH);
          expect(error.userMessage).toContain('invalid or has expired');
          expect(error.recoverable).toBe(true);
          expect(error.retryable).toBe(true);
        }
      });

      it('should throw OAuth error for expired code', async () => {
        mockConvexSignIn.mockRejectedValue(
          new Error('Code has expired')
        );

        try {
          await serviceWithErrors.exchangeCodeForToken('expired-code', 'verifier');
          fail('Should have thrown an error');
        } catch (error: any) {
          expect(error.category).toBe(ErrorCategory.OAUTH);
          expect(error.userMessage).toContain('invalid or has expired');
        }
      });

      it('should throw network error for connection issues', async () => {
        mockConvexSignIn.mockRejectedValue(
          new Error('Network timeout occurred')
        );

        try {
          await serviceWithErrors.exchangeCodeForToken('code', 'verifier');
          fail('Should have thrown an error');
        } catch (error: any) {
          expect(error.category).toBe(ErrorCategory.NETWORK);
          expect(error.userMessage).toContain('check your connection');
          expect(error.retryable).toBe(true);
        }
      });

      it('should throw configuration error for redirect_uri mismatch', async () => {
        mockConvexSignIn.mockRejectedValue(
          new Error('redirect_uri mismatch')
        );

        try {
          await serviceWithErrors.exchangeCodeForToken('code', 'verifier');
          fail('Should have thrown an error');
        } catch (error: any) {
          expect(error.category).toBe(ErrorCategory.CONFIGURATION);
          expect(error.userMessage).toContain('temporarily unavailable');
          expect(error.recoverable).toBe(false);
          expect(error.retryable).toBe(false);
        }
      });

      it('should throw Convex error for generic server errors', async () => {
        mockConvexSignIn.mockRejectedValue(
          new Error('Internal server error')
        );

        try {
          await serviceWithErrors.exchangeCodeForToken('code', 'verifier');
          fail('Should have thrown an error');
        } catch (error: any) {
          expect(error.category).toBe(ErrorCategory.CONVEX);
          expect(error.userMessage).toContain('server');
          expect(error.retryable).toBe(true);
        }
      });
    });

    describe('Edge Cases', () => {
      it('should handle app backgrounding during OAuth flow', async () => {
        (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
          type: 'dismiss',
        });

        const result = await serviceWithErrors.signIn();

        expect(result.type).toBe('cancel');
        expect(result.authError?.category).toBe(ErrorCategory.USER_CANCELLATION);
      });

      it('should handle unexpected error types', async () => {
        (WebBrowser.openAuthSessionAsync as jest.Mock).mockRejectedValue(
          { message: 'Unexpected error', code: 'UNKNOWN_ERROR' }
        );

        const result = await serviceWithErrors.signIn();

        expect(result.type).toBe('error');
        expect(result.authError).toBeDefined();
        expect(result.authError?.timestamp).toBeDefined();
      });

      it('should handle errors without any properties', async () => {
        (WebBrowser.openAuthSessionAsync as jest.Mock).mockRejectedValue({});

        const result = await serviceWithErrors.signIn();

        expect(result.type).toBe('error');
        expect(result.authError).toBeDefined();
        expect(result.authError?.category).toBe(ErrorCategory.UNKNOWN);
      });

      it('should include timestamp in all errors', async () => {
        (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
          type: 'cancel',
        });

        const result = await serviceWithErrors.signIn();

        expect(result.authError?.timestamp).toBeDefined();
        expect(typeof result.authError?.timestamp).toBe('number');
        expect(result.authError?.timestamp).toBeLessThanOrEqual(Date.now());
      });
    });
  });
});
