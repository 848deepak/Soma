/**
 * __tests__/e2e/jest.config.js
 * Jest configuration specific to E2E tests
 */
module.exports = {
  transform: {
    '^.+\\.(js|ts)$': 'babel-jest',
  },
  testEnvironment: 'node',
  testRegex: '\\.e2e\\.(js|ts)$',
  testTimeout: 120000,
  verbose: true,
  maxWorkers: 1, // Run E2E tests serially to avoid conflicts
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  setupFilesAfterEnv: ['detox/runners/jest/setup'],
};
