/**
 * src/components/ui/SyncStatusBadge.tsx
 *
 * Visual feedback component for offline queue and sync status.
 * Shows users when data is being saved offline or synced on reconnection.
 *
 * States:
 *   - Offline + queue > 0: "Saving offline — 3 pending" (amber)
 *   - Online + syncing: "Syncing..." (blue, animated spinner)
 *   - Online + queue empty: hidden
 *
 * Accessibility:
 *   - Live region with "polite" assertiveness for status updates
 *   - accessibilityRole="status" for screen readers
 */

import { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Network from 'expo-network';

import { useOfflineQueue } from '@/src/store/useOfflineQueue';
import { useAppTheme } from '@/src/context/ThemeContext';

type NetworkState = 'online' | 'offline' | 'unknown';

export function SyncStatusBadge() {
  const { pendingCount, isSyncing } = useOfflineQueue();
  const { theme, isDark } = useAppTheme();
  const [networkState, setNetworkState] = useState<NetworkState>('unknown');
  const animatedTranslateY = useSharedValue(-100);
  const prevStateRef = useRef<{
    isVisible: boolean;
    networkState: NetworkState;
    pendingCount: number;
    isSyncing: boolean;
  }>({
    isVisible: false,
    networkState: 'unknown',
    pendingCount: 0,
    isSyncing: false,
  });

  // ─── Initialize network state ──────────────────────────────────────────
  useEffect(() => {
    const initializeNetworkState = async () => {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Network state timeout')), 3000);
        });

        const networkPromise = Network.getNetworkStateAsync();
        const state = await Promise.race([networkPromise, timeoutPromise]);

        const isOnline = Boolean(state.isConnected && state.isInternetReachable);
        setNetworkState(isOnline ? 'online' : 'offline');
      } catch (error) {
        console.warn('[SyncStatusBadge] Failed to get initial network state:', error);
        setNetworkState('offline');
      }
    };

    initializeNetworkState();

    const subscription = Network.addNetworkStateListener((state) => {
      const isOnline = Boolean(state.isConnected && state.isInternetReachable);
      setNetworkState(isOnline ? 'online' : 'offline');
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // ─── Determine visibility and content ──────────────────────────────────
  const isVisible =
    (networkState === 'offline' && pendingCount > 0) || isSyncing;
  const statusText =
    isSyncing
      ? 'Syncing...'
      : networkState === 'offline' && pendingCount > 0
        ? `Saving offline — ${pendingCount} pending`
        : '';

  // ─── Animate in/out on state change ────────────────────────────────────
  useEffect(() => {
    const prevState = prevStateRef.current;

    // Detect visibility change
    if (isVisible !== prevState.isVisible) {
      const targetTranslateY = isVisible ? 0 : -100;
      animatedTranslateY.value = withTiming(targetTranslateY, {
        duration: 300,
      });
      prevStateRef.current.isVisible = isVisible;
    }

    // Update ref state for next render
    prevStateRef.current = {
      isVisible,
      networkState,
      pendingCount,
      isSyncing,
    };
  }, [isVisible, networkState, pendingCount, isSyncing, animatedTranslateY]);

  // ─── Animated style ───────────────────────────────────────────────────
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: animatedTranslateY.value }],
  }));

  // ─── Theme-based colors ───────────────────────────────────────────────
  const colors = {
    cream: {
      offline: '#FFA500', // Amber
      syncing: '#4DA6FF', // Blue
      bg: '#FFF5E6',
      text: '#8B5A00',
    },
    midnight: {
      offline: '#FFA500', // Amber
      syncing: '#60A5FA', // Sky blue
      bg: 'rgba(255, 165, 0, 0.15)',
      text: '#FFA500',
    },
    lavender: {
      offline: '#F59E0B', // Amber
      syncing: '#818CF8', // Indigo
      bg: 'rgba(129, 140, 248, 0.1)',
      text: '#4C1D95',
    },
  };

  const themeColors = colors[theme as keyof typeof colors] || colors.cream;
  const iconColor = isSyncing ? themeColors.syncing : themeColors.offline;

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      style={[animatedStyle]}
      accessibilityRole="status"
      accessibilityLiveRegion="polite"
      accessibilityLabel={statusText}
    >
      <View
        style={{
          backgroundColor: themeColors.bg,
          paddingVertical: 8,
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderBottomWidth: 1,
          borderBottomColor: iconColor,
        }}
      >
        {isSyncing ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: iconColor,
            }}
          />
        )}

        <Text
          style={{
            fontSize: 12,
            fontWeight: '500',
            color: themeColors.text,
            textAlign: 'center',
          }}
        >
          {statusText}
        </Text>
      </View>
    </Animated.View>
  );
}
