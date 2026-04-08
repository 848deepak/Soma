/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["./jest.setup.ts"],
  testEnvironment: "node",
  moduleNameMapper: {
    // Always mock Supabase client and auth in tests (avoids env var requirement)
    "^@/lib/supabase$": "<rootDir>/lib/__mocks__/supabase.ts",
    "^@/lib/auth$": "<rootDir>/lib/__mocks__/auth.ts",
    // Path alias (must come after more-specific matchers)
    "^@/(.*)$": "<rootDir>/$1",
    "react-native-svg": "<rootDir>/__mocks__/react-native-svg.tsx",
    "^react-native-reanimated$":
      "<rootDir>/__mocks__/react-native-reanimated.ts",
    "^react-native-safe-area-context$":
      "<rootDir>/__mocks__/react-native-safe-area-context.ts",
  },
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind)",
  ],
  testMatch: [
    "**/__tests__/**/*.[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)",
    "!**/__tests__/e2e/**",
    "!**/__tests__/testUtils.*",
  ],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "hooks/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
};
