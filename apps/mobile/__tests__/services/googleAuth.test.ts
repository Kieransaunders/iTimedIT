import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import * as Crypto from 'expo-crypto';
import { GoogleAuthService } from '../../services/googleAuth';

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

  beforeEach(() => {
    service = new GoogleAuthService({
      clientId: 'test-client-id',
      redirectUri: 'itimeditapp://auth/callback',
      scopes: ['openid', 'profile', 'email'],
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
});
