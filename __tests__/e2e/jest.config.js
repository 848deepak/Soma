/**
 * __tests__/e2e/jest.config.js
 * Jest configuration specific to E2E tests
 */
module.exports = {
  transform: {
    '^.+\\.(js|ts)$': 'babel-jest',
  },
  testEnvironment: 'detox/runners/jest/testEnvironment',
  testRegex: '\\.e2e\\.(js|ts)$',
  testTimeout: 240000,
  verbose: true,
  maxWorkers: 1, // Run E2E tests serially to avoid conflicts
  globalSetup: '<rootDir>/globalSetup.js',
  globalTeardown: '<rootDir>/globalTeardown.js',
  reporters: ['detox/runners/jest/reporter'],
};
