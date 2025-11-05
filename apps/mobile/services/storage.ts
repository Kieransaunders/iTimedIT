import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Secure storage for sensitive data (tokens)
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    return await SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },
};

// Async storage for non-sensitive data
export const storage = {
  async getItem(key: string): Promise<string | null> {
    return await AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },
};

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
  REFRESH_TOKEN: "refresh_token",
  SELECTED_WORKSPACE: "selected_workspace",
} as const;
