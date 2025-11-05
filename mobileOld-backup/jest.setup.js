// Setup file for Jest tests

// Mock Expo import.meta registry (required for Expo SDK 54+)
global.__ExpoImportMetaRegistry = {
  register: jest.fn(),
  get: jest.fn(),
};

// Mock structuredClone if not available (required for Expo SDK 54+)
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
  },
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-crypto
jest.mock('expo-crypto');

// Mock expo-web-browser
jest.mock('expo-web-browser');

// Mock expo-auth-session
jest.mock('expo-auth-session');

// Mock @convex-dev/auth/react
jest.mock('@convex-dev/auth/react', () => ({
  useAuthActions: jest.fn(),
}));

// Mock convex/react
jest.mock('convex/react', () => ({
  useConvexAuth: jest.fn(),
  useQuery: jest.fn(),
}));
