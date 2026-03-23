/**
 * __tests__/e2e/jest.config.js
 * Jest configuration specific to E2E tests
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: '\\.e2e\\.(js|ts)$',
  testTimeout: 120000,
  verbose: true,
  maxWorkers: 1, // Run E2E tests serially to avoid conflicts
  globalSetup: './setup.js',
  globalTeardown: './teardown.js',
};
