/**
 * src/services/notificationService/index.ts
 *
 * Notification scheduling for the women's health app.
 *
 * Responsibilities:
 *   - Request user permission for local notifications.
 *   - Schedule a daily log-reminder at a user-configured time.
 *   - Schedule a one-time period-start alert the day before the predicted date.
 *   - Schedule a one-time fertile-window alert on the opening day of the window.
 *   - Cancel individual or all scheduled notifications.
 *
 * The module keeps an in-memory registry of notification IDs so that
 * re-scheduling cancels the previous instance first (preventing duplicates).
 * This is intentionally not persisted – the worst case on app-restart is a
 * harmless duplicate notification that is superseded on the next schedule call.
 *
 * Platform Support:
 *   - iOS/Android: Full support for local notifications
 *   - Web: Gracefully disabled (methods return no-op promises)
 */
import { Platform } from 'react-native';

// Conditional import for native platforms only
let Notifications: typeof import('expo-notifications') | null = null;

if (Platform.OS === 'ios' || Platform.OS === 'android') {
  // Dynamic import is handled at runtime, preventing SSR issues
  Notifications = require('expo-notifications');
}

// ─── Identifier keys ──────────────────────────────────────────────────────────

const DAILY_KEY = "daily-log-reminder";
const PERIOD_KEY = "period-alert";
const FERTILE_KEY = "fertile-window-alert";

// ─── In-memory registry ───────────────────────────────────────────────────────

/** Maps a local notification key → the Expo notification identifier string. */
const scheduledIds = new Map<string, string>();

/**
 * Resets the in-memory registry.
 * Exported for unit-test isolation only – do not call in production code.
 */
export function _resetRegistry(): void {
  scheduledIds.clear();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Cancels a previously scheduled notification identified by `key` (if any)
 * and removes it from the registry.
 */
async function cancelIfScheduled(key: string): Promise<void> {
  if (!Notifications) return;

  const id = scheduledIds.get(key);
  if (id) {
    await Notifications.cancelScheduledNotificationAsync(id);
    scheduledIds.delete(key);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type PermissionResult = { granted: boolean };

/**
 * Prompts the user to allow alerts, badge updates, and sounds.
 * Safe to call multiple times – iOS will only show the system dialog once.
 */
export async function requestPermissions(): Promise<PermissionResult> {
  if (!Notifications) {
    console.warn('[Notifications] Not available on this platform');
    return { granted: false };
  }

  const result = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return { granted: result.granted };
}

/**
 * Schedules a repeating daily local notification at `hour`:`minute` (local time)
 * reminding the user to log their daily symptoms.
 *
 * Cancels any previously registered daily reminder before scheduling.
 * @returns The Expo notification identifier for the scheduled notification.
 */
export async function scheduleDailyLogReminder(
  hour: number,
  minute: number,
): Promise<string> {
  if (!Notifications) {
    console.warn('[Notifications] Not available on this platform');
    return '';
  }

  await cancelIfScheduled(DAILY_KEY);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Log Today",
      body: "Don't forget to log how you're feeling today.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  scheduledIds.set(DAILY_KEY, id);
  return id;
}

/** Cancels the active daily log reminder (no-op if none is scheduled). */
export async function cancelDailyLogReminder(): Promise<void> {
  await cancelIfScheduled(DAILY_KEY);
}

/**
 * Schedules a one-time notification at 09:00 local time on the day **before**
 * `predictedDate` (YYYY-MM-DD) to alert the user that their period is imminent.
 *
 * Cancels any previously registered period alert before scheduling.
 * @returns The Expo notification identifier.
 */
export async function schedulePeriodAlert(
  predictedDate: string,
): Promise<string> {
  if (!Notifications) {
    console.warn('[Notifications] Not available on this platform');
    return '';
  }

  await cancelIfScheduled(PERIOD_KEY);

  const [year, month, day] = predictedDate.split("-").map(Number);
  // Day before at 09:00 local time
  const alertDate = new Date(year, month - 1, day - 1, 9, 0, 0);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Period Soon",
      body: "Your period is predicted to start tomorrow.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: alertDate,
    },
  });

  scheduledIds.set(PERIOD_KEY, id);
  return id;
}

/** Cancels the active period alert (no-op if none is scheduled). */
export async function cancelPeriodAlert(): Promise<void> {
  await cancelIfScheduled(PERIOD_KEY);
}

/**
 * Schedules a one-time notification at 08:00 local time on `windowStart`
 * (YYYY-MM-DD) to alert the user that their fertile window has begun.
 *
 * Cancels any previously registered fertile-window alert before scheduling.
 * @returns The Expo notification identifier.
 */
export async function scheduleFertileWindowAlert(
  windowStart: string,
): Promise<string> {
  if (!Notifications) {
    console.warn('[Notifications] Not available on this platform');
    return '';
  }

  await cancelIfScheduled(FERTILE_KEY);

  const [year, month, day] = windowStart.split("-").map(Number);
  const alertDate = new Date(year, month - 1, day, 8, 0, 0);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Fertile Window",
      body: "Your fertile window begins today.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: alertDate,
    },
  });

  scheduledIds.set(FERTILE_KEY, id);
  return id;
}

/** Cancels the active fertile-window alert (no-op if none is scheduled). */
export async function cancelFertileWindowAlert(): Promise<void> {
  await cancelIfScheduled(FERTILE_KEY);
}

/**
 * Cancels **all** scheduled notifications across the app and clears the
 * in-memory registry. Useful when the user disables notifications globally.
 */
export async function cancelAllNotifications(): Promise<void> {
  if (!Notifications) return;

  await Notifications.cancelAllScheduledNotificationsAsync();
  scheduledIds.clear();
}
