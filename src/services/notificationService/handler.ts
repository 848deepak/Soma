/**
 * src/services/notificationService/handler.ts
 *
 * Platform-aware notification handler setup.
 * Safely initializes notification handlers only on supported platforms.
 */
import { Platform } from 'react-native';

import { trackEvent } from '@/src/services/analytics';

type NotificationData = {
  route?: string;
  source?: string;
  [key: string]: unknown;
};

type NotificationOpenCallback = (data: NotificationData) => void;

let responseSubscription: { remove: () => void } | null = null;
let receivedSubscription: { remove: () => void } | null = null;

function getNotificationsModule(): typeof import('expo-notifications') | null {
  if (!(Platform.OS === 'ios' || Platform.OS === 'android')) {
    return null;
  }

  try {
    return require('expo-notifications');
  } catch {
    return null;
  }
}

/**
 * Initializes the foreground notification handler.
 * Safe to call on all platforms - automatically guards against web SSR.
 */
export function initializeNotificationHandler(): void {
  // Only initialize on native platforms
  // Web doesn't support push notifications in the same way
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    const Notifications = getNotificationsModule();
    if (!Notifications) return;

    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch (error) {
      console.warn('[Notifications] Failed to initialize handler:', error);
    }
  }
}

export async function startNotificationListeners(
  onNotificationOpen?: NotificationOpenCallback,
): Promise<() => void> {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    return () => undefined;
  }

  try {
    responseSubscription?.remove();
    receivedSubscription?.remove();

    receivedSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = (notification.request.content.data ?? {}) as NotificationData;
        trackEvent('notification_received', {
          source: data.source ?? 'unknown',
          route: typeof data.route === 'string' ? data.route : 'none',
        });
      },
    );

    responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = (response.notification.request.content.data ?? {}) as NotificationData;
        trackEvent('notification_opened', {
          source: data.source ?? 'unknown',
          route: typeof data.route === 'string' ? data.route : 'none',
        });
        onNotificationOpen?.(data);
      });

    return () => {
      responseSubscription?.remove();
      receivedSubscription?.remove();
      responseSubscription = null;
      receivedSubscription = null;
    };
  } catch (error) {
    console.warn('[Notifications] Failed to start listeners:', error);
    return () => undefined;
  }
}
