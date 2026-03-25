/**
 * __mocks__/expo-notifications.ts
 *
 * Manual Jest mock for expo-notifications.
 * Activated automatically via moduleNameMapper / moduleDirectories.
 * Tests that need fine-grained control can override individual fns with
 * (scheduleNotificationAsync as jest.Mock).mockResolvedValueOnce(…).
 */

export enum SchedulableTriggerInputTypes {
  CALENDAR = 'calendar',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  DATE = 'date',
  TIME_INTERVAL = 'timeInterval',
}

// ─── Scheduling ──────────────────────────────────────────────────────────────

export const scheduleNotificationAsync = jest.fn().mockResolvedValue('mock-notification-id');

export const cancelScheduledNotificationAsync = jest.fn().mockResolvedValue(undefined);

export const cancelAllScheduledNotificationsAsync = jest.fn().mockResolvedValue(undefined);

export const getAllScheduledNotificationsAsync = jest.fn().mockResolvedValue([]);

// ─── Permissions ─────────────────────────────────────────────────────────────

export const requestPermissionsAsync = jest
  .fn()
  .mockResolvedValue({ granted: true, canAskAgain: true, status: 'granted' });

export const getPermissionsAsync = jest
  .fn()
  .mockResolvedValue({ granted: true, canAskAgain: true, status: 'granted' });

export const getDevicePushTokenAsync = jest
  .fn()
  .mockResolvedValue({ type: 'fcm', data: 'mock-device-token' });

// ─── Handler ─────────────────────────────────────────────────────────────────

export const setNotificationHandler = jest.fn();

export const addNotificationResponseReceivedListener = jest.fn(() => ({
  remove: jest.fn(),
}));

export const addNotificationReceivedListener = jest.fn(() => ({
  remove: jest.fn(),
}));

// ─── Badge ───────────────────────────────────────────────────────────────────

export const getBadgeCountAsync = jest.fn().mockResolvedValue(0);

export const setBadgeCountAsync = jest.fn().mockResolvedValue(true);

export default {
  SchedulableTriggerInputTypes,
  scheduleNotificationAsync,
  cancelScheduledNotificationAsync,
  cancelAllScheduledNotificationsAsync,
  getAllScheduledNotificationsAsync,
  requestPermissionsAsync,
  getPermissionsAsync,
  getDevicePushTokenAsync,
  setNotificationHandler,
  addNotificationResponseReceivedListener,
  addNotificationReceivedListener,
  getBadgeCountAsync,
  setBadgeCountAsync,
};
