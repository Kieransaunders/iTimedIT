import * as SecureStore from "expo-secure-store"
import type { TokenStorage } from "@convex-dev/auth/react"

// Keys for storage
const AUTH_TOKEN_KEY = "auth_token"

/**
 * Secure storage for authentication tokens using Expo SecureStore
 * This provides hardware-backed encryption on both iOS and Android
 */
export const secureStorage = {
  async storeAuthToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token)
  },

  async getAuthToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY)
  },

  async clearAuthToken(): Promise<void> {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY)
  },
}

/**
 * Token storage implementation for Convex Auth
 * Uses SecureStore for secure token storage in React Native
 */
export const convexTokenStorage: TokenStorage = {
  async getItem(key: string) {
    return await SecureStore.getItemAsync(key)
  },
  async setItem(key: string, value: string) {
    await SecureStore.setItemAsync(key, value)
  },
  async removeItem(key: string) {
    await SecureStore.deleteItemAsync(key)
  },
}
