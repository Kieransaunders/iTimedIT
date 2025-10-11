// Setup file for Jest tests
import 'react-native-gesture-handler/jestSetup';

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

// Silence the warning: Animated: `useNativeDriver` is not supported
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
