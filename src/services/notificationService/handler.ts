/**
 * src/services/notificationService/handler.ts
 *
 * Platform-aware notification handler setup.
 * Safely initializes notification handlers only on supported platforms.
 */
import { Platform } from 'react-native';

/**
 * Initializes the foreground notification handler.
 * Safe to call on all platforms - automatically guards against web SSR.
 */
export function initializeNotificationHandler(): void {
  // Only initialize on native platforms
  // Web doesn't support push notifications in the same way
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    // Dynamic import to prevent SSR issues
    import('expo-notifications').then((Notifications) => {
      Notifications.default.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }).catch((error) => {
      console.warn('[Notifications] Failed to initialize handler:', error);
    });
  }
}
