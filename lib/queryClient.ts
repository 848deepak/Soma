/**
 * lib/queryClient.ts
 *
 * Singleton TanStack Query client with persistence layer (AsyncStorage).
 * Hydrates from cache on cold start, then syncs real-time changes.
 *
 * Cache strategy:
 *  - Persist via AsyncStorage: profile, currentCycle, dailyLogs (high reuse)
 *  - Skip: smart_events, cycleHistory, partner data (low reuse on cold start)
 *  - TTL: 24 hours
 *  - Stale time: 5 minutes (refetch if older)
 */

import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

const CACHE_SCHEMA_VERSION = 1;

// Create a custom persister using AsyncStorage (simpler than MMKV for this use case)
const createAsyncStoragePersister = (): Persister => {
  const prefix = 'REACT_QUERY_OFFLINE_CACHE';

  return {
    persistClient: async (client: PersistedClient) => {
      try {
        await AsyncStorage.setItem(
          prefix,
          JSON.stringify({
            ...client,
            cacheVersion: CACHE_SCHEMA_VERSION,
          }),
        );
      } catch (error) {
        console.warn('[QueryClient] Failed to persist cache to AsyncStorage:', error);
      }
    },
    restoreClient: async () => {
      try {
        const stored = await AsyncStorage.getItem(prefix);
        if (!stored) return undefined;
        const parsed = JSON.parse(stored) as Record<string, unknown> | null;

        if (!parsed || typeof parsed !== 'object') {
          await AsyncStorage.removeItem(prefix);
          return undefined;
        }

        if ('cacheVersion' in parsed && parsed.cacheVersion !== CACHE_SCHEMA_VERSION) {
          console.warn('[QueryClient] Cache version mismatch, discarding persisted cache');
          await AsyncStorage.removeItem(prefix);
          return undefined;
        }

        if (!parsed.clientState || !parsed.cacheState) {
          console.warn('[QueryClient] Stale/invalid cache schema, discarding');
          await AsyncStorage.removeItem(prefix);
          return undefined;
        }

        return parsed as unknown as PersistedClient;
      } catch (error) {
        console.warn('[QueryClient] Failed to restore cache from AsyncStorage:', error);
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await AsyncStorage.removeItem(prefix);
      } catch (error) {
        console.warn('[QueryClient] Failed to remove persisted cache:', error);
      }
    },
  };
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Fast cold start: use 24h persisted cache even if stale
      gcTime: 1000 * 60 * 60 * 24, // 24 hours (was cacheTime)
      staleTime: 1000 * 60 * 5,     // 5 minutes
      retry: 2,
      // Prevent exponential backoff on transient failures
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    },
  },
});

/**
 * Persist query cache for fast cold start.
 * Keep profile + currentCycle + dailyLogs hot, skip expensive queries.
 */
persistQueryClient({
  queryClient,
  persister: createAsyncStoragePersister(),
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
  dehydrateOptions: {
    // Only persist small, frequently-accessed queries
    shouldDehydrateQuery: (query: any): boolean => {
      const key = query.queryKey[0];
      const persistedKeys = ['profile', 'current-cycle', 'daily-logs', 'daily-log'];
      return persistedKeys.includes(String(key));
    },
  },
});

export default queryClient;

