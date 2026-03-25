import { Platform } from 'react-native';

import { trackEvent } from '@/src/services/analytics';

type HapticIntent =
  | 'selection'
  | 'impact_light'
  | 'impact_medium'
  | 'success'
  | 'error'
  | 'gesture_tick';

type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

let Haptics: typeof import('expo-haptics') | null = null;

if (Platform.OS === 'ios' || Platform.OS === 'android') {
  Haptics = require('expo-haptics');
}

const THROTTLE_MS = 120;
const lastTriggeredAt = new Map<HapticIntent, number>();

function canTrigger(intent: HapticIntent, throttleMs = THROTTLE_MS): boolean {
  const now = Date.now();
  const last = lastTriggeredAt.get(intent) ?? 0;
  if (now - last < throttleMs) {
    return false;
  }
  lastTriggeredAt.set(intent, now);
  return true;
}

function trackHaptic(intent: HapticIntent): void {
  trackEvent('haptic_triggered', {
    intent,
    platform: Platform.OS,
  });
}

async function safeRun(intent: HapticIntent, op: () => Promise<void>): Promise<void> {
  if (!Haptics) return;
  if (!canTrigger(intent)) return;

  try {
    await op();
    trackHaptic(intent);
  } catch {
    // Haptics should never block user actions.
  }
}

export const HapticsService = {
  selection(): Promise<void> {
    return safeRun('selection', async () => {
      await Haptics?.selectionAsync();
    });
  },

  impactLight(): Promise<void> {
    return safeRun('impact_light', async () => {
      await Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });
  },

  impactMedium(): Promise<void> {
    return safeRun('impact_medium', async () => {
      await Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    });
  },

  success(): Promise<void> {
    return safeRun('success', async () => {
      await Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
  },

  error(): Promise<void> {
    return safeRun('error', async () => {
      await Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Error);
    });
  },

  gestureTick(): Promise<void> {
    return safeRun('gesture_tick', async () => {
      await Haptics?.selectionAsync();
    });
  },

  phaseAwareFeedback(phase: CyclePhase, action: 'log' | 'navigate'): Promise<void> {
    if (action === 'navigate') {
      return this.selection();
    }

    if (phase === 'menstrual' || phase === 'ovulation') {
      return this.impactMedium();
    }

    return this.impactLight();
  },
};
