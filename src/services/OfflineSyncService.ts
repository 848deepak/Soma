/**
 * src/services/OfflineSyncService.ts
 *
 * Orchestrates draining the local SQLite sync_queue to Supabase.
 *
 * Design decisions:
 * - canSync() (from syncService) is called first; if offline the function
 *   returns immediately with skipped: true and touches no data.
 * - Items are processed FIFO; all items are attempted in a single pass.
 * - OfflineSyncService owns the decryption boundary: it calls
 *   encryptionService.decrypt() before forwarding to supabaseService.
 * - On remote rejection (ok: false) or thrown exception the item's attempt
 *   counter is incremented. Items reaching MAX_ATTEMPTS are excluded from
 *   future getPendingSyncItems queries.
 * - Processing continues past individual item failures so a single bad record
 *   does not block the entire queue.
 */
import { encryptionService } from '@/src/services/encryptionService';
import { supabaseService } from '@/src/services/supabaseService';
import { canSync } from '@/src/services/syncService';
import {
  getPendingSyncItems,
  removeSyncItem,
  updateSyncItemAttempt,
} from '@/src/database/localDB';

export const MAX_ATTEMPTS = 3;

export type FlushResult = {
  /** Number of items successfully synced and removed from the queue. */
  synced: number;
  /** Number of items that failed in this pass (attempts incremented). */
  failed: number;
  /** True when the device had no network connectivity; no data was touched. */
  skipped: boolean;
};

/**
 * Drains all eligible sync_queue entries to Supabase.
 * Returns a FlushResult describing the outcome of the pass.
 */
export async function flushOfflineQueue(): Promise<FlushResult> {
  if (!(await canSync())) {
    return { synced: 0, failed: 0, skipped: true };
  }

  const items = await getPendingSyncItems(MAX_ATTEMPTS);
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      // Decryption boundary: unwrap AES envelope when encryption is real.
      // With the pass-through stub this is a no-op.
      const decryptedText = await encryptionService.decrypt(item.encryptedPayload);
      const payload = JSON.parse(decryptedText) as Record<string, unknown>;

      const result = await supabaseService.push({
        table: item.entityType,
        operation: item.operation,
        payload,
        entityId: item.entityId,
      });

      if (result.ok) {
        await removeSyncItem(item.id);
        synced++;
      } else {
        await updateSyncItemAttempt(item.id, result.error ?? 'Remote rejected the payload');
        failed++;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await updateSyncItemAttempt(item.id, message);
      failed++;
    }
  }

  return { synced, failed, skipped: false };
}
