/**
 * __tests__/unit/notificationService.test.ts
 *
 * Unit tests for the notification service.
 * All expo-notifications functions are mocked via __mocks__/expo-notifications.ts.
 */

jest.mock('expo-notifications');

import * as Notifications from 'expo-notifications';
import {
  requestPermissions,
  scheduleDailyLogReminder,
  cancelDailyLogReminder,
  schedulePeriodAlert,
  cancelPeriodAlert,
  scheduleFertileWindowAlert,
  cancelFertileWindowAlert,
  cancelAllNotifications,
  _resetRegistry,
} from '@/src/services/notificationService';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock;
const mockCancel = Notifications.cancelScheduledNotificationAsync as jest.Mock;
const mockCancelAll = Notifications.cancelAllScheduledNotificationsAsync as jest.Mock;
const mockRequestPerms = Notifications.requestPermissionsAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  _resetRegistry();
  // Restore default return values after clearAllMocks
  mockSchedule.mockResolvedValue('mock-notification-id');
  mockCancel.mockResolvedValue(undefined);
  mockCancelAll.mockResolvedValue(undefined);
  mockRequestPerms.mockResolvedValue({ granted: true, canAskAgain: true, status: 'granted' });
});

// ─── requestPermissions ───────────────────────────────────────────────────────

describe('requestPermissions', () => {
  it('returns granted: true when permissions are granted', async () => {
    const result = await requestPermissions();
    expect(result).toEqual({ granted: true });
  });

  it('returns granted: false when permissions are denied', async () => {
    mockRequestPerms.mockResolvedValueOnce({ granted: false, canAskAgain: false, status: 'denied' });
    const result = await requestPermissions();
    expect(result).toEqual({ granted: false });
  });

  it('calls requestPermissionsAsync with ios alert/badge/sound options', async () => {
    await requestPermissions();
    expect(mockRequestPerms).toHaveBeenCalledWith({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
  });
});

// ─── scheduleDailyLogReminder ─────────────────────────────────────────────────

describe('scheduleDailyLogReminder', () => {
  it('returns the notification id from scheduleNotificationAsync', async () => {
    mockSchedule.mockResolvedValueOnce('daily-id-1');
    const id = await scheduleDailyLogReminder(20, 0);
    expect(id).toBe('daily-id-1');
  });

  it('schedules with a DAILY trigger at the specified hour and minute', async () => {
    await scheduleDailyLogReminder(20, 30);
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 20,
          minute: 30,
        }),
      }),
    );
  });

  it('sets the correct notification title and body', async () => {
    await scheduleDailyLogReminder(20, 0);
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: 'Log Today',
          body: "Don't forget to log how you're feeling today.",
        }),
      }),
    );
  });

  it('cancels the previous daily reminder before scheduling a new one', async () => {
    mockSchedule
      .mockResolvedValueOnce('daily-id-1')
      .mockResolvedValueOnce('daily-id-2');

    await scheduleDailyLogReminder(20, 0);
    await scheduleDailyLogReminder(21, 0);

    // Second call should have cancelled the first id
    expect(mockCancel).toHaveBeenCalledWith('daily-id-1');
    expect(mockSchedule).toHaveBeenCalledTimes(2);
  });

  it('does not call cancelScheduledNotificationAsync on the first schedule', async () => {
    await scheduleDailyLogReminder(20, 0);
    expect(mockCancel).not.toHaveBeenCalled();
  });
});

// ─── cancelDailyLogReminder ───────────────────────────────────────────────────

describe('cancelDailyLogReminder', () => {
  it('cancels the scheduled daily reminder using its stored id', async () => {
    mockSchedule.mockResolvedValueOnce('daily-id-abc');
    await scheduleDailyLogReminder(20, 0);
    await cancelDailyLogReminder();
    expect(mockCancel).toHaveBeenCalledWith('daily-id-abc');
  });

  it('is a no-op when no daily reminder is scheduled', async () => {
    await cancelDailyLogReminder();
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it('does not cancel again after the first cancel', async () => {
    mockSchedule.mockResolvedValueOnce('daily-id-xyz');
    await scheduleDailyLogReminder(20, 0);
    await cancelDailyLogReminder();
    await cancelDailyLogReminder(); // second cancel should be no-op
    expect(mockCancel).toHaveBeenCalledTimes(1);
  });
});

// ─── schedulePeriodAlert ──────────────────────────────────────────────────────

describe('schedulePeriodAlert', () => {
  it('returns the notification id from scheduleNotificationAsync', async () => {
    mockSchedule.mockResolvedValueOnce('period-id-1');
    const id = await schedulePeriodAlert('2024-02-15');
    expect(id).toBe('period-id-1');
  });

  it('schedules with a DATE trigger for the day before the predicted date at 09:00', async () => {
    await schedulePeriodAlert('2024-02-15');
    const call = mockSchedule.mock.calls[0][0] as {
      trigger: { type: string; date: Date };
    };
    expect(call.trigger.type).toBe(Notifications.SchedulableTriggerInputTypes.DATE);
    const alertDate: Date = call.trigger.date;
    expect(alertDate.getFullYear()).toBe(2024);
    expect(alertDate.getMonth()).toBe(1); // February = 1
    expect(alertDate.getDate()).toBe(14); // day before the 15th
    expect(alertDate.getHours()).toBe(9);
    expect(alertDate.getMinutes()).toBe(0);
  });

  it('sets the correct notification title and body', async () => {
    await schedulePeriodAlert('2024-02-15');
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: 'Period Soon',
          body: 'Your period is predicted to start tomorrow.',
        }),
      }),
    );
  });

  it('cancels a previous period alert before scheduling a new one', async () => {
    mockSchedule
      .mockResolvedValueOnce('period-id-old')
      .mockResolvedValueOnce('period-id-new');

    await schedulePeriodAlert('2024-02-15');
    await schedulePeriodAlert('2024-03-20');

    expect(mockCancel).toHaveBeenCalledWith('period-id-old');
    expect(mockSchedule).toHaveBeenCalledTimes(2);
  });
});

// ─── cancelPeriodAlert ────────────────────────────────────────────────────────

describe('cancelPeriodAlert', () => {
  it('cancels the scheduled period alert using its stored id', async () => {
    mockSchedule.mockResolvedValueOnce('period-id-abc');
    await schedulePeriodAlert('2024-02-15');
    await cancelPeriodAlert();
    expect(mockCancel).toHaveBeenCalledWith('period-id-abc');
  });

  it('is a no-op when no period alert is scheduled', async () => {
    await cancelPeriodAlert();
    expect(mockCancel).not.toHaveBeenCalled();
  });
});

// ─── scheduleFertileWindowAlert ───────────────────────────────────────────────

describe('scheduleFertileWindowAlert', () => {
  it('returns the notification id from scheduleNotificationAsync', async () => {
    mockSchedule.mockResolvedValueOnce('fertile-id-1');
    const id = await scheduleFertileWindowAlert('2024-01-09');
    expect(id).toBe('fertile-id-1');
  });

  it('schedules with a DATE trigger on windowStart at 08:00', async () => {
    await scheduleFertileWindowAlert('2024-01-09');
    const call = mockSchedule.mock.calls[0][0] as {
      trigger: { type: string; date: Date };
    };
    expect(call.trigger.type).toBe(Notifications.SchedulableTriggerInputTypes.DATE);
    const alertDate: Date = call.trigger.date;
    expect(alertDate.getFullYear()).toBe(2024);
    expect(alertDate.getMonth()).toBe(0); // January = 0
    expect(alertDate.getDate()).toBe(9);
    expect(alertDate.getHours()).toBe(8);
    expect(alertDate.getMinutes()).toBe(0);
  });

  it('sets the correct notification title and body', async () => {
    await scheduleFertileWindowAlert('2024-01-09');
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: 'Fertile Window',
          body: 'Your fertile window begins today.',
        }),
      }),
    );
  });

  it('cancels a previous fertile-window alert before scheduling a new one', async () => {
    mockSchedule
      .mockResolvedValueOnce('fertile-old')
      .mockResolvedValueOnce('fertile-new');

    await scheduleFertileWindowAlert('2024-01-09');
    await scheduleFertileWindowAlert('2024-02-05');

    expect(mockCancel).toHaveBeenCalledWith('fertile-old');
    expect(mockSchedule).toHaveBeenCalledTimes(2);
  });
});

// ─── cancelFertileWindowAlert ─────────────────────────────────────────────────

describe('cancelFertileWindowAlert', () => {
  it('cancels the scheduled fertile-window alert using its stored id', async () => {
    mockSchedule.mockResolvedValueOnce('fertile-id-abc');
    await scheduleFertileWindowAlert('2024-01-09');
    await cancelFertileWindowAlert();
    expect(mockCancel).toHaveBeenCalledWith('fertile-id-abc');
  });

  it('is a no-op when no fertile-window alert is scheduled', async () => {
    await cancelFertileWindowAlert();
    expect(mockCancel).not.toHaveBeenCalled();
  });
});

// ─── cancelAllNotifications ───────────────────────────────────────────────────

describe('cancelAllNotifications', () => {
  it('calls cancelAllScheduledNotificationsAsync', async () => {
    await cancelAllNotifications();
    expect(mockCancelAll).toHaveBeenCalledTimes(1);
  });

  it('clears the registry so subsequent cancels are no-ops', async () => {
    mockSchedule
      .mockResolvedValueOnce('daily-id')
      .mockResolvedValueOnce('period-id')
      .mockResolvedValueOnce('fertile-id');

    await scheduleDailyLogReminder(20, 0);
    await schedulePeriodAlert('2024-02-15');
    await scheduleFertileWindowAlert('2024-01-09');

    await cancelAllNotifications();
    jest.clearAllMocks(); // reset call counts
    mockCancel.mockResolvedValue(undefined);

    // After cancelAll, individual cancels should be no-ops
    await cancelDailyLogReminder();
    await cancelPeriodAlert();
    await cancelFertileWindowAlert();

    expect(mockCancel).not.toHaveBeenCalled();
  });

  it('works correctly even when no notifications have been scheduled', async () => {
    await expect(cancelAllNotifications()).resolves.toBeUndefined();
    expect(mockCancelAll).toHaveBeenCalledTimes(1);
  });
});

// ─── Registry isolation across notification types ─────────────────────────────

describe('registry isolation', () => {
  it('cancelling the daily reminder does not affect the period alert', async () => {
    mockSchedule
      .mockResolvedValueOnce('daily-id')
      .mockResolvedValueOnce('period-id');

    await scheduleDailyLogReminder(20, 0);
    await schedulePeriodAlert('2024-02-15');
    await cancelDailyLogReminder();

    // Only daily was cancelled
    expect(mockCancel).toHaveBeenCalledWith('daily-id');
    expect(mockCancel).not.toHaveBeenCalledWith('period-id');
  });

  it('each notification type maintains its own id independently', async () => {
    mockSchedule
      .mockResolvedValueOnce('id-daily')
      .mockResolvedValueOnce('id-period')
      .mockResolvedValueOnce('id-fertile');

    const dailyId = await scheduleDailyLogReminder(20, 0);
    const periodId = await schedulePeriodAlert('2024-02-15');
    const fertileId = await scheduleFertileWindowAlert('2024-01-09');

    expect(dailyId).toBe('id-daily');
    expect(periodId).toBe('id-period');
    expect(fertileId).toBe('id-fertile');
  });
});
