import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { TokenStorage } from "@convex-dev/auth/react";

// Keys for storage
const AUTH_TOKEN_KEY = "auth_token";
const USER_SETTINGS_KEY = "user_settings";

/**
 * Secure storage for authentication tokens using Expo SecureStore
 * This provides hardware-backed encryption on both iOS and Android
 */
export const secureStorage = {
  async storeAuthToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  },

  async getAuthToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  },

  async clearAuthToken(): Promise<void> {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  },
};

/**
 * Token storage implementation for Convex Auth
 * Uses SecureStore for secure token storage in React Native
 */
export const tokenStorage: TokenStorage = {
  async getItem(key: string) {
    return await SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string) {
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string) {
    await SecureStore.deleteItemAsync(key);
  },
};

/**
 * General storage for non-sensitive data using AsyncStorage
 */
export const storage = {
  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  },

  async getItem(key: string): Promise<string | null> {
    return await AsyncStorage.getItem(key);
  },

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },

  async setObject<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },

  async getObject<T>(key: string): Promise<T | null> {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  },

  async clear(): Promise<void> {
    await AsyncStorage.clear();
  },
};
