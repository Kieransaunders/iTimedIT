module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'convex/**/*.ts',
    '!convex/_generated/**',
    '!**/*.d.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@convex-dev/auth/server$': '<rootDir>/tests/mocks/convexAuthServer.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  watchman: false,
  verbose: true,
};
