jest.mock('expo-notifications');

import * as Notifications from 'expo-notifications';

import {
  initializeNotificationHandler,
  startNotificationListeners,
} from '@/src/services/notificationService/handler';

const mockSetHandler = Notifications.setNotificationHandler as jest.Mock;
const mockAddOpenListener = Notifications.addNotificationResponseReceivedListener as jest.Mock;
const mockAddReceivedListener = Notifications.addNotificationReceivedListener as jest.Mock;

describe('notification handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetHandler.mockImplementation(() => undefined);
    mockAddOpenListener.mockReturnValue({ remove: jest.fn() });
    mockAddReceivedListener.mockReturnValue({ remove: jest.fn() });
  });

  it('initializes foreground notification handler', async () => {
    initializeNotificationHandler();
    await Promise.resolve();
    expect(mockSetHandler).toHaveBeenCalledTimes(1);
  });

  it('registers listeners and returns cleanup function', async () => {
    const cleanup = await startNotificationListeners();

    expect(mockAddOpenListener).toHaveBeenCalledTimes(1);
    expect(mockAddReceivedListener).toHaveBeenCalledTimes(1);
    expect(typeof cleanup).toBe('function');

    cleanup();
  });
});
