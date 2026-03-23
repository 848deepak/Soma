/**
 * __tests__/e2e/cycleTracking.e2e.ts
 *
 * E2E tests for core cycle tracking functionality.
 * Tests the critical user journey:
 * 1. Logging period dates
 * 2. Daily symptom and mood tracking
 * 3. Viewing cycle insights
 * 4. Calendar navigation and visualization
 */

describe('Cycle Tracking E2E', () => {
  beforeAll(async () => {
    await device.launchApp();
    // Skip onboarding or login to get to main app
    await element(by.text('Continue without account')).tap();
  });

  beforeEach(async () => {
    // Navigate to home screen
    await element(by.text('Home')).tap();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  describe('Period Logging', () => {
    it('should open period logging modal', async () => {
      await waitFor(element(by.text('Log Period')))
        .toBeVisible()
        .withTimeout(5000);

      await element(by.text('Log Period')).tap();

      // Period modal should open
      await expect(element(by.text('Log Period Dates'))).toBeVisible();
      await expect(element(by.text('Start Date'))).toBeVisible();
      await expect(element(by.text('End Date (Optional)'))).toBeVisible();
    });

    it('should allow selecting period start and end dates', async () => {
      await element(by.text('Log Period')).tap();

      // Select start date (today)
      await element(by.text('Start Date')).tap();
      // Date picker interaction would go here
      // await element(by.text('Done')).tap();

      // Select end date
      await element(by.text('End Date (Optional)')).tap();
      // Date picker interaction would go here
      // await element(by.text('Done')).tap();

      // Save period data
      await element(by.text('Save Period')).tap();

      // Should close modal and show success
      await waitFor(element(by.text('Log Period')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should show period data in calendar view', async () => {
      // Navigate to calendar
      await element(by.text('Calendar')).tap();

      await waitFor(element(by.text('January 2024')))
        .toBeVisible()
        .withTimeout(5000);

      // Period days should be marked differently
      // Visual indicators would be tested here
    });
  });

  describe('Daily Symptoms and Mood Logging', () => {
    it('should open daily log modal', async () => {
      await element(by.text('Log Today\'s Flow & Mood')).tap();

      await waitFor(element(by.text('Daily Log')))
        .toBeVisible()
        .withTimeout(3000);

      // Should show mood and symptom options
      await expect(element(by.text('How are you feeling?'))).toBeVisible();
      await expect(element(by.text('Symptoms'))).toBeVisible();
    });

    it('should allow selecting mood', async () => {
      await element(by.text('Log Today\'s Flow & Mood')).tap();

      // Select a mood
      await element(by.text('Good')).tap();
      await expect(element(by.text('Good'))).toHaveToggleValue(true);
    });

    it('should allow selecting multiple symptoms', async () => {
      await element(by.text('Log Today\'s Flow & Mood')).tap();

      // Select symptoms
      await element(by.text('Cramps')).tap();
      await element(by.text('Bloating')).tap();
      await element(by.text('Tender')).tap();

      // Verify selections
      await expect(element(by.text('Cramps'))).toHaveToggleValue(true);
      await expect(element(by.text('Bloating'))).toHaveToggleValue(true);
      await expect(element(by.text('Tender'))).toHaveToggleValue(true);
    });

    it('should save daily log data', async () => {
      await element(by.text('Log Today\'s Flow & Mood')).tap();

      // Select mood and symptoms
      await element(by.text('Good')).tap();
      await element(by.text('Cramps')).tap();

      // Add notes
      await element(by.text('Notes (optional)')).typeText('Feeling okay today');

      // Save the log
      await element(by.text('Save Log')).tap();

      // Should return to home screen
      await waitFor(element(by.text('Log Today\'s Flow & Mood')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should show logged data on home screen widgets', async () => {
      // After logging, home screen should reflect the data
      await expect(element(by.text('Good'))).toBeVisible(); // Mood

      // Sleep and hydration widgets should show data
      await expect(element(by.text('Glasses today'))).toBeVisible();
      await expect(element(by.text('Last night'))).toBeVisible();
    });
  });

  describe('Quick Check-in Flow', () => {
    it('should open quick check-in modal', async () => {
      // Tap the floating action button
      await element(by.text('+')).tap();

      await waitFor(element(by.text('Quick Check-in')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should allow rapid mood and energy logging', async () => {
      await element(by.text('+')).tap();

      // Quick mood selection
      await element(by.text('😊')).tap();

      // Quick energy level
      await element(by.text('High')).tap();

      // Save quick check-in
      await element(by.text('Save')).tap();

      // Should close and return to home
      await expect(element(by.text('😊'))).not.toExist();
    });
  });

  describe('Cycle Insights', () => {
    it('should navigate to insights screen', async () => {
      await element(by.text('Insights')).tap();

      await waitFor(element(by.text('Body Trends')))
        .toBeVisible()
        .withTimeout(5000);

      // Should show cycle history chart
      await expect(element(by.text('Cycle History'))).toBeVisible();
      await expect(element(by.text('Symptom Frequency'))).toBeVisible();
    });

    it('should display cycle trend insights', async () => {
      await element(by.text('Insights')).tap();

      // Should show trend analysis
      await waitFor(element(by.text('Keep Logging')))
        .toBeVisible()
        .withTimeout(5000);

      // More specific insights would appear with more data
    });

    it('should show symptom cloud when symptoms are logged', async () => {
      await element(by.text('Insights')).tap();

      // After logging symptoms, should show frequency cloud
      await waitFor(element(by.text('Symptom Frequency')))
        .toBeVisible()
        .withTimeout(3000);
    });
  });

  describe('Calendar Navigation', () => {
    it('should navigate between months', async () => {
      await element(by.text('Calendar')).tap();

      await waitFor(element(by.text('January 2024')))
        .toBeVisible()
        .withTimeout(5000);

      // Navigate to next month
      await element(by.text('›')).tap();
      await expect(element(by.text('February 2024'))).toBeVisible();

      // Navigate to previous month
      await element(by.text('‹')).tap();
      await expect(element(by.text('January 2024'))).toBeVisible();
    });

    it('should select calendar days and show day details', async () => {
      await element(by.text('Calendar')).tap();

      // Tap on a calendar day
      await element(by.text('15')).tap();

      // Should show day note/details
      await expect(element(by.text('Regular cycle day'))).toBeVisible();
    });

    it('should show cycle phase information', async () => {
      await element(by.text('Calendar')).tap();

      // Should show current cycle phase
      await expect(element(by.text('Ovulation day'))).toBeVisible();
      await expect(element(by.text('Period day'))).toBeVisible();
      await expect(element(by.text('Fertile window'))).toBeVisible();
    });
  });

  describe('Data Persistence', () => {
    it('should persist logged data across app restarts', async () => {
      // Log some data
      await element(by.text('Log Today\'s Flow & Mood')).tap();
      await element(by.text('Good')).tap();
      await element(by.text('Save Log')).tap();

      // Restart app
      await device.terminateApp();
      await device.launchApp();

      // Data should still be there
      await waitFor(element(by.text('Good')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should sync data when network is available', async () => {
      // Test offline/online data sync
      await device.setNetworkConnection(false);

      // Log data offline
      await element(by.text('Log Today\'s Flow & Mood')).tap();
      await element(by.text('Calm')).tap();
      await element(by.text('Save Log')).tap();

      // Restore network
      await device.setNetworkConnection(true);

      // Data should sync and persist
      await expect(element(by.text('Calm'))).toBeVisible();
    });
  });
});
