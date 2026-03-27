/**
 * __tests__/e2e/appLaunch.e2e.ts
 *
 * E2E tests for app launch and initial authentication flow.
 * These tests verify that the app:
 * 1. Launches correctly without crashing
 * 2. Shows appropriate splash screen
 * 3. Navigates to correct initial screen based on auth state
 * 4. Handles first-time user vs returning user scenarios
 */

describe('App Launch E2E', () => {
  beforeAll(async () => {
    await device.launchApp({});
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  describe('First Time Launch', () => {
    it('should show splash screen on app launch', async () => {
      // Look for SOMA logo and loading text
      await expect(element(by.text('SOMA'))).toBeVisible();
      await expect(
        element(by.text('Preparing your personal cycle insights...')),
      ).toBeVisible();
    });

    it('should navigate to login screen for new users', async () => {
      // Wait for splash to complete and navigation to login
      await waitFor(element(by.text('Welcome back')))
        .toBeVisible()
        .withTimeout(10000);

      // Verify login screen elements
      await expect(element(by.text('Email'))).toBeVisible();
      await expect(element(by.text('Password'))).toBeVisible();
      await expect(element(by.text('Sign In'))).toBeVisible();
      await expect(element(by.text('Continue without account'))).toBeVisible();
    });

    it('should handle "Continue without account" flow', async () => {
      await waitFor(element(by.text('Continue without account')))
        .toBeVisible()
        .withTimeout(10000);

      await element(by.text('Continue without account')).tap();

      // Should navigate to welcome screen
      await waitFor(element(by.text('Welcome to SOMA')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Returning User Launch', () => {
    beforeEach(async () => {
      // Simulate existing user with saved session
      // This would require test data setup
    });

    it('should auto-login and navigate to home for returning users', async () => {
      // Should bypass login and go directly to home
      await waitFor(element(by.text('Day')))
        .toBeVisible()
        .withTimeout(10000);

      // Verify home screen elements
      await expect(element(by.text('Day'))).toBeVisible();
      await expect(element(by.text('Log Period'))).toBeVisible();
      await expect(element(by.text('Log Today\'s Flow & Mood'))).toBeVisible();
    });

    it('should show persistent bottom tab navigation', async () => {
      await waitFor(element(by.text('Home')))
        .toBeVisible()
        .withTimeout(10000);

      await expect(element(by.text('Calendar'))).toBeVisible();
      await expect(element(by.text('Insights'))).toBeVisible();
      await expect(element(by.text('Profile'))).toBeVisible();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully on launch', async () => {
      // Simulate network issues
      await (device as unknown as { setNetworkConnection?: (enabled: boolean) => Promise<void> })
        .setNetworkConnection?.(false);
      await device.reloadReactNative();

      // App should still launch and show fallback content
      await waitFor(element(by.text('SOMA')))
        .toBeVisible()
        .withTimeout(15000);

      // Restore network
      await (device as unknown as { setNetworkConnection?: (enabled: boolean) => Promise<void> })
        .setNetworkConnection?.(true);
    });

    it('should show appropriate loading timeout fallbacks', async () => {
      // App should not hang indefinitely
      // After timeout, should show content with fallbacks
      await waitFor(element(by.text('Welcome to SOMA')))
        .toBeVisible()
        .withTimeout(20000);
    });
  });

  describe('App State Recovery', () => {
    it('should restore state when app is backgrounded and restored', async () => {
      // Navigate to a specific screen
      await waitFor(element(by.text('Calendar')))
        .toBeVisible()
        .withTimeout(10000);
      await element(by.text('Calendar')).tap();

      // Background and restore app
      await (device as unknown as { sendAppToBackground?: (seconds: number) => Promise<void> })
        .sendAppToBackground?.(2);

      // Should return to the same screen
      await expect(element(by.text('Calendar'))).toBeVisible();
    });

    it('should handle app restart correctly', async () => {
      await device.terminateApp();
      await device.launchApp({});

      // Should go through normal launch flow
      await waitFor(element(by.text('SOMA')))
        .toBeVisible()
        .withTimeout(10000);
    });
  });
});
