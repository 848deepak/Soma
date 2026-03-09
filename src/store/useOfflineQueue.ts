/**
 * src/store/useOfflineQueue.ts
 *
 * React hook that exposes the state of the local SQLite sync_queue to UI
 * components.  It is intentionally a plain hook (not a Zustand store) because
 * the pending count is derived database state, not cross-component shared
 * application state.
 *
 * Usage:
 *   const { pendingCount, isSyncing, flush } = useOfflineQueue();
 */
import { useCallback, useEffect, useState } from 'react';

import { getPendingSyncItems } from '@/src/database/localDB';
import { MAX_ATTEMPTS, flushOfflineQueue } from '@/src/services/OfflineSyncService';

export type OfflineQueueState = {
  /** Number of items in the queue that have not yet exhausted their attempts. */
  pendingCount: number;
  /** True while a flush pass is in progress. */
  isSyncing: boolean;
  /** Trigger a full flush of the queue. Resolves when the pass is complete. */
  flush: () => Promise<void>;
};

export function useOfflineQueue(): OfflineQueueState {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const loadCount = useCallback(async (): Promise<void> => {
    const items = await getPendingSyncItems(MAX_ATTEMPTS);
    setPendingCount(items.length);
  }, []);

  // Populate count on mount
  useEffect(() => {
    void loadCount();
  }, [loadCount]);

  const flush = useCallback(async (): Promise<void> => {
    // Prevent concurrent invocations (e.g. rapid button taps)
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await flushOfflineQueue();
    } finally {
      // Refresh count regardless of success or partial failure
      await loadCount();
      setIsSyncing(false);
    }
  }, [isSyncing, loadCount]);

  return { pendingCount, isSyncing, flush };
}
