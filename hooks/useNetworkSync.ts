/**
 * hooks/useNetworkSync.ts
 *
 * Monitors network connectivity and automatically flushes the offline sync
 * queue whenever the device transitions from offline → online.
 *
 * Mount this hook once at the app root (e.g., inside AuthBootstrap) so it
 * stays active for the entire session.
 */
import * as Network from "expo-network";
import { useEffect, useRef } from "react";

import { flushOfflineQueue } from "@/src/services/OfflineSyncService";
import { captureException } from "@/src/services/errorTracking";

export function useNetworkSync(): void {
  // Track previously-known connectivity so we only flush on transitions,
  // not on every state update that happens to be "connected".
  const wasConnectedRef = useRef<boolean | null>(null);

  useEffect(() => {
    // Seed the initial connectivity state without triggering a flush.
    Network.getNetworkStateAsync()
      .then((state) => {
        wasConnectedRef.current = Boolean(
          state.isConnected && state.isInternetReachable,
        );
      })
      .catch(() => {
        wasConnectedRef.current = false;
      });

    const subscription = Network.addNetworkStateListener((state) => {
      const isNowConnected = Boolean(
        state.isConnected && state.isInternetReachable,
      );
      const wasConnected = wasConnectedRef.current;

      // Only flush on a genuine offline → online transition.
      if (!wasConnected && isNowConnected) {
        flushOfflineQueue().catch((err: unknown) => {
          captureException(err instanceof Error ? err : new Error(String(err)));
        });
      }

      wasConnectedRef.current = isNowConnected;
    });

    return () => {
      subscription.remove();
    };
  }, []);
}
