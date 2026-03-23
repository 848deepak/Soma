/**
 * __tests__/e2e/teardown.js
 * Global teardown for E2E tests
 */

const { device } = require("detox");

module.exports = async () => {
  console.log("E2E Global Teardown: Cleaning up Detox environment...");

  try {
    await device.terminateApp();
    await detox.cleanup();
  } catch (error) {
    console.error("E2E Teardown failed:", error);
  }
};
