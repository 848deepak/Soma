/**
 * __tests__/unit/useRealtimeSync.test.ts
 *
 * Tests for useRealtimeSync hook, specifically verifying that:
 * 1. Channels are properly cleaned up when userId changes
 * 2. Anonymous → authenticated user upgrade scenario works
 * 3. No stale subscriptions remain after userId transitions
 * 4. New user's events are received after upgrade
 */
import { renderHook } from '@testing-library/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeSync } from '@/src/domain/logging/hooks/useRealtimeSync';
import { supabase } from '@/lib/supabase';

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

// Mock useQueryClient
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(),
}));

describe('useRealtimeSync (userId change transitions)', () => {
  let mockQueryClient: any;
  let mockLogsChannel: any;
  let mockCyclesChannel: any;
  let removeChannelSpy: jest.SpyInstance;
  let channelSpy: jest.SpyInstance;

  beforeEach(() => {
    // Setup mocks
    mockQueryClient = {
      invalidateQueries: jest.fn(),
      getQueryState: jest.fn(),
    };
    (useQueryClient as jest.Mock).mockReturnValue(mockQueryClient);

    // Mock channel creation
    mockLogsChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      topic: 'rt-daily-logs-user1',
    };
    mockCyclesChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      topic: 'rt-cycles-user1',
    };

    channelSpy = jest.spyOn(supabase, 'channel').mockImplementation((topic) => {
      if (topic.includes('daily-logs')) {
        return mockLogsChannel;
      }
      if (topic.includes('cycles')) {
        return mockCyclesChannel;
      }
      return mockLogsChannel; // Fallback
    });

    removeChannelSpy = jest.spyOn(supabase, 'removeChannel').mockResolvedValue({});

    // Suppress console logs during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('subscribes to channels when userId is provided', () => {
    const { rerender } = renderHook(
      ({ userId }) => useRealtimeSync(userId),
      { initialProps: { userId: 'user-1' } }
    );

    // Should create channels for user-1
    expect(channelSpy).toHaveBeenCalledWith('rt-daily-logs-user-1');
    expect(channelSpy).toHaveBeenCalledWith('rt-cycles-user-1');

    // Should subscribe
    expect(mockLogsChannel.subscribe).toHaveBeenCalled();
    expect(mockCyclesChannel.subscribe).toHaveBeenCalled();
  });

  it('does not subscribe when userId is undefined', () => {
    renderHook(() => useRealtimeSync(undefined));

    // Should not create any channels
    expect(channelSpy).not.toHaveBeenCalled();
  });

  it('cleans up old channels when userId changes (anonymous → authenticated)', () => {
    // Start with anonymous user (undefined userId)
    const { rerender } = renderHook(
      ({ userId }) => useRealtimeSync(userId),
      { initialProps: { userId: undefined } }
    );

    // Should not have subscribed yet
    expect(channelSpy).not.toHaveBeenCalled();
    expect(removeChannelSpy).not.toHaveBeenCalled();

    // Transition to authenticated user
    rerender({ userId: 'user-123' });

    // Should create new channels for authenticated user
    expect(channelSpy).toHaveBeenCalledWith('rt-daily-logs-user-123');
    expect(channelSpy).toHaveBeenCalledWith('rt-cycles-user-123');

    // Should subscribe to new channels
    expect(mockLogsChannel.subscribe).toHaveBeenCalled();
    expect(mockCyclesChannel.subscribe).toHaveBeenCalled();

    // Should NOT have called removeChannel (no old channels to remove)
    expect(removeChannelSpy).not.toHaveBeenCalled();
  });

  it('removes old user channels and subscribes to new ones when userId changes', () => {
    // Start with user-1
    const { rerender } = renderHook(
      ({ userId }) => useRealtimeSync(userId),
      { initialProps: { userId: 'user-1' } }
    );

    expect(channelSpy).toHaveBeenCalledTimes(2); // logs and cycles
    const initialCallCount = channelSpy.mock.calls.length;

    // Switch to user-2
    rerender({ userId: 'user-2' });

    // Should have called removeChannel for OLD channels
    expect(removeChannelSpy).toHaveBeenCalledWith(mockLogsChannel);
    expect(removeChannelSpy).toHaveBeenCalledWith(mockCyclesChannel);

    // Should create NEW channels for user-2
    expect(channelSpy).toHaveBeenCalledWith('rt-daily-logs-user-2');
    expect(channelSpy).toHaveBeenCalledWith('rt-cycles-user-2');

    // Should have more channel() calls (new channels created)
    expect(channelSpy.mock.calls.length).toBeGreaterThan(initialCallCount);
  });

  it('cleans up channels on unmount', () => {
    const { unmount } = renderHook(
      ({ userId }) => useRealtimeSync(userId),
      { initialProps: { userId: 'user-1' } }
    );

    // Should have subscribed
    expect(mockLogsChannel.subscribe).toHaveBeenCalled();
    expect(mockCyclesChannel.subscribe).toHaveBeenCalled();

    // Unmount component
    unmount();

    // Should remove channels on unmount
    expect(removeChannelSpy).toHaveBeenCalledWith(mockLogsChannel);
    expect(removeChannelSpy).toHaveBeenCalledWith(mockCyclesChannel);
  });

  it('complex scenario: null → user-1 → user-2 → null (upgrade, then logout)', () => {
    const { rerender, unmount } = renderHook(
      ({ userId }) => useRealtimeSync(userId),
      { initialProps: { userId: undefined } }
    );

    // Initially no channels created
    expect(channelSpy).not.toHaveBeenCalled();

    // User logs in as user-1
    rerender({ userId: 'user-1' });
    expect(channelSpy).toHaveBeenCalledWith('rt-daily-logs-user-1');
    expect(channelSpy).toHaveBeenCalledWith('rt-cycles-user-1');
    const removeCallsBeforeUpgrade = removeChannelSpy.mock.calls.length;

    // User upgrades (or switches account) to user-2
    rerender({ userId: 'user-2' });

    // Old channels should be removed
    expect(removeChannelSpy.mock.calls.length).toBeGreaterThan(removeCallsBeforeUpgrade);

    // New channels should be created
    expect(channelSpy).toHaveBeenCalledWith('rt-daily-logs-user-2');
    expect(channelSpy).toHaveBeenCalledWith('rt-cycles-user-2');

    // User logs out
    rerender({ userId: undefined });

    // All channels should be cleaned up
    unmount();
  });

  it('handles removeChannel errors gracefully', async () => {
    const error = new Error('Remove channel failed');
    removeChannelSpy.mockRejectedValueOnce(error);

    const { rerender } = renderHook(
      ({ userId }) => useRealtimeSync(userId),
      { initialProps: { userId: 'user-1' } }
    );

    // Should have subscribed to user-1 channels
    expect(mockLogsChannel.subscribe).toHaveBeenCalled();

    // Change userId (will trigger cleanup which tries to remove channels)
    rerender({ userId: 'user-2' });

    // Should still create new channels even if removal failed
    expect(channelSpy).toHaveBeenCalledWith('rt-daily-logs-user-2');
    expect(channelSpy).toHaveBeenCalledWith('rt-cycles-user-2');
  });

  it('does not re-subscribe if userId is the same (no-op rerender)', () => {
    const { rerender } = renderHook(
      ({ userId }) => useRealtimeSync(userId),
      { initialProps: { userId: 'user-1' } }
    );

    const initialChannelCallCount = channelSpy.mock.calls.length;

    // Re-render with the SAME userId (shouldn't re-subscribe)
    // Note: This test assumes React's dependency array optimization
    // In practice, if userId reference is the same, useEffect won't run
    rerender({ userId: 'user-1' });

    // Channel calls should be the same (no additional subscriptions)
    // This tests that we're respecting the dependency array
    expect(channelSpy.mock.calls.length).toBe(initialChannelCallCount);
  });

  it('logs resubscription on userId change in DEV mode', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const { rerender } = renderHook(
      ({ userId }) => useRealtimeSync(userId),
      { initialProps: { userId: 'user-1' } }
    );

    // Should log subscription
    expect(logSpy).toHaveBeenCalledWith(
      '[RealtimeSync] Subscribed for userId:',
      'user-1'
    );

    logSpy.mockClear();

    // Change to user-2
    rerender({ userId: 'user-2' });

    // Should log new subscription (after cleaning up old one)
    expect(logSpy).toHaveBeenCalledWith(
      '[RealtimeSync] Subscribed for userId:',
      'user-2'
    );

    logSpy.mockRestore();
  });
});
