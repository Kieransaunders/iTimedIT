// Mock MMKV for Expo Go compatibility
// This provides a fallback using AsyncStorage when MMKV isn't available

import AsyncStorage from '@react-native-async-storage/async-storage';

class MMKVMock {
  private cache: Map<string, string> = new Map();
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    
    try {
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);
      items.forEach(([key, value]) => {
        if (value) this.cache.set(key, value);
      });
      this.initialized = true;
    } catch (error) {
      console.warn('Failed to initialize MMKV mock:', error);
    }
  }

  getString(key: string): string | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: string | number | boolean) {
    const stringValue = String(value);
    this.cache.set(key, stringValue);
    AsyncStorage.setItem(key, stringValue).catch(console.warn);
  }

  delete(key: string) {
    this.cache.delete(key);
    AsyncStorage.removeItem(key).catch(console.warn);
  }

  clearAll() {
    this.cache.clear();
    AsyncStorage.clear().catch(console.warn);
  }
}

export const storage = new MMKVMock();

// Initialize on import
storage.initialize();

export function useMMKVString(key: string): [string | undefined, (value: string) => void] {
  const value = storage.getString(key);
  const setValue = (newValue: string) => storage.set(key, newValue);
  return [value, setValue];
}
