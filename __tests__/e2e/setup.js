/**
 * __tests__/e2e/setup.js
 * Global setup for E2E tests
 */

const { device } = require("detox");

module.exports = async () => {
  console.log("E2E Global Setup: Initializing Detox environment...");

  try {
    await detox.init();
    await device.launchApp();
  } catch (error) {
    console.error("E2E Setup failed:", error);
    throw error;
  }
};
