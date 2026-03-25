import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { trackEvent } from '@/src/services/analytics';

import { requestPermissions } from './index';

const DEVICE_PUSH_TOKEN_KEY = '@notifications/devicePushToken';

type DevicePushToken = {
  type?: string;
  data?: string;
};

function isNativePlatform(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

async function getNotificationsModule(): Promise<typeof import('expo-notifications') | null> {
  if (!isNativePlatform()) return null;
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

function resolveDeviceType(): 'ios' | 'android' | 'web' {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

export async function requestAndSyncPushToken(userId: string): Promise<string | null> {
  if (!isNativePlatform()) return null;

  const permission = await requestPermissions();
  if (!permission.granted) {
    trackEvent('notification_permission_denied', { platform: Platform.OS });
    return null;
  }

  const Notifications = await getNotificationsModule();
  if (!Notifications) return null;

  const tokenResponse = (await Notifications.getDevicePushTokenAsync()) as DevicePushToken;
  const token = tokenResponse?.data;

  if (!token) {
    return null;
  }

  await AsyncStorage.setItem(DEVICE_PUSH_TOKEN_KEY, token);

  const payload = {
    user_id: userId,
    token,
    device_type: resolveDeviceType(),
    token_type: tokenResponse.type ?? Platform.OS,
    timezone: getTimezone(),
    last_seen_at: new Date().toISOString(),
    revoked_at: null,
  };

  const { error } = await supabase
    .from('push_tokens' as never)
    .upsert(payload as never, { onConflict: 'token' });

  if (error) {
    trackEvent('notification_token_sync_failed', {
      platform: Platform.OS,
      error: error.message,
    });
    return null;
  }

  trackEvent('notification_token_synced', {
    platform: Platform.OS,
    token_type: payload.token_type,
  });

  return token;
}

export async function revokePushToken(userId: string): Promise<void> {
  const token = await AsyncStorage.getItem(DEVICE_PUSH_TOKEN_KEY);
  if (!token) return;

  await supabase
    .from('push_tokens' as never)
    .update({ revoked_at: new Date().toISOString() } as never)
    .eq('user_id', userId)
    .eq('token', token);

  await AsyncStorage.removeItem(DEVICE_PUSH_TOKEN_KEY);
  trackEvent('notification_token_revoked', { platform: Platform.OS });
}
