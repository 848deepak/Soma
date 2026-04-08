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
    // Add timeout protection to prevent blocking
    const initializeNetworkState = async () => {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Network state timeout")), 5000);
        });

        const networkPromise = Network.getNetworkStateAsync();

        const state = await Promise.race([networkPromise, timeoutPromise]);
        wasConnectedRef.current = Boolean(
          state.isConnected && state.isInternetReachable,
        );
      } catch (error) {
        console.warn(
          "[NetworkSync] Failed to get initial network state:",
          error,
        );
        wasConnectedRef.current = false; // Assume offline on error
      }
    };

    initializeNetworkState();

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
