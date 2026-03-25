jest.mock('expo-haptics');

jest.mock('@/src/services/analytics', () => ({
  trackEvent: jest.fn(),
}));

import * as ExpoHaptics from 'expo-haptics';

import { HapticsService } from '@/src/services/haptics/HapticsService';

const mockSelectionAsync = ExpoHaptics.selectionAsync as jest.Mock;
const mockImpactAsync = ExpoHaptics.impactAsync as jest.Mock;
const mockNotificationAsync = ExpoHaptics.notificationAsync as jest.Mock;

describe('HapticsService', () => {
  let now = 1_000_000;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockImplementation(() => {
      now += 500;
      return now;
    });
    mockSelectionAsync.mockResolvedValue(undefined);
    mockImpactAsync.mockResolvedValue(undefined);
    mockNotificationAsync.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('triggers selection haptic', async () => {
    await HapticsService.selection();
    expect(mockSelectionAsync).toHaveBeenCalledTimes(1);
  });

  it('triggers medium impact haptic for impactMedium()', async () => {
    await HapticsService.impactMedium();
    expect(mockImpactAsync).toHaveBeenCalledWith(ExpoHaptics.ImpactFeedbackStyle.Medium);
  });

  it('triggers success and error notification haptics', async () => {
    await HapticsService.success();
    await HapticsService.error();

    expect(mockNotificationAsync).toHaveBeenNthCalledWith(
      1,
      ExpoHaptics.NotificationFeedbackType.Success,
    );
    expect(mockNotificationAsync).toHaveBeenNthCalledWith(
      2,
      ExpoHaptics.NotificationFeedbackType.Error,
    );
  });

  it('uses medium impact for menstrual logging', async () => {
    await HapticsService.phaseAwareFeedback('menstrual', 'log');
    expect(mockImpactAsync).toHaveBeenCalledWith(ExpoHaptics.ImpactFeedbackStyle.Medium);
  });

  it('swallows haptics errors without throwing', async () => {
    mockSelectionAsync.mockRejectedValueOnce(new Error('unsupported'));
    await expect(HapticsService.selection()).resolves.toBeUndefined();
  });
});
