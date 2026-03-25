jest.mock('expo-notifications');

import * as Notifications from 'expo-notifications';

import {
  requestPermissions,
  scheduleDailyLogReminder,
  cancelAllNotifications,
  _resetRegistry,
} from '@/src/services/notificationService';

const mockRequestPerms = Notifications.requestPermissionsAsync as jest.Mock;
const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock;
const mockCancelAll = Notifications.cancelAllScheduledNotificationsAsync as jest.Mock;

describe('notification lifecycle integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetRegistry();
    mockRequestPerms.mockResolvedValue({ granted: true, canAskAgain: true, status: 'granted' });
    mockSchedule.mockResolvedValue('integration-notification-id');
    mockCancelAll.mockResolvedValue(undefined);
  });

  it('requests permission, schedules a reminder, and cancels all notifications', async () => {
    const permission = await requestPermissions();
    const notificationId = await scheduleDailyLogReminder(20, 15);
    await cancelAllNotifications();

    expect(permission.granted).toBe(true);
    expect(notificationId).toBe('integration-notification-id');
    expect(mockCancelAll).toHaveBeenCalledTimes(1);
  });
});
