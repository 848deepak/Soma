/**
 * __tests__/unit/offlineSync.test.ts
 *
 * Unit tests for OfflineSyncService (flushOfflineQueue).
 * All dependencies are mocked; this suite isolates the flush loop
 * and conflict-resolution logic.
 */

// ─── Module mocks (must be hoisted before any imports) ───────────────────────

jest.mock('@/src/database/localDB', () => ({
  getPendingSyncItems: jest.fn(),
  removeSyncItem: jest.fn().mockResolvedValue(undefined),
  updateSyncItemAttempt: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/src/services/encryptionService', () => ({
  encryptionService: {
    encrypt: jest.fn().mockImplementation((s: string) => Promise.resolve(s)),
    decrypt: jest.fn().mockImplementation((s: string) => Promise.resolve(s)),
  },
}));

jest.mock('@/src/services/supabaseService', () => ({
  supabaseService: {
    push: jest.fn().mockResolvedValue({ ok: true }),
  },
}));

jest.mock('@/src/services/syncService', () => ({
  canSync: jest.fn().mockResolvedValue(true),
  flushSyncQueue: jest.fn().mockResolvedValue({ synced: 0, skipped: false }),
}));

// ─── Imports (after jest.mock) ────────────────────────────────────────────────

import { flushOfflineQueue, MAX_ATTEMPTS } from '@/src/services/OfflineSyncService';
import {
  getPendingSyncItems,
  removeSyncItem,
  updateSyncItemAttempt,
} from '@/src/database/localDB';
import { supabaseService } from '@/src/services/supabaseService';
import { canSync } from '@/src/services/syncService';
import type { SyncQueueItem } from '@/src/database/localDB';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSyncItem(overrides: Partial<SyncQueueItem> = {}): SyncQueueItem {
  return {
    id: 'item-1',
    entityType: 'symptom_logs',
    entityId: 'entity-abc',
    operation: 'upsert',
    encryptedPayload: JSON.stringify({ id: 'entity-abc', mood: 'happy' }),
    attempts: 0,
    lastError: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OfflineSyncService – flushOfflineQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: online, queue returns empty array
    (canSync as jest.Mock).mockResolvedValue(true);
    (getPendingSyncItems as jest.Mock).mockResolvedValue([]);
    (supabaseService.push as jest.Mock).mockResolvedValue({ ok: true });
  });

  // ── MAX_ATTEMPTS constant ──────────────────────────────────────────────────

  describe('MAX_ATTEMPTS constant', () => {
    it('is 3', () => {
      expect(MAX_ATTEMPTS).toBe(3);
    });

    it('passes MAX_ATTEMPTS to getPendingSyncItems', async () => {
      await flushOfflineQueue();
      expect(getPendingSyncItems).toHaveBeenCalledWith(MAX_ATTEMPTS);
    });
  });

  // ── Empty queue ────────────────────────────────────────────────────────────

  describe('empty queue', () => {
    it('returns zeros when queue is empty', async () => {
      const result = await flushOfflineQueue();
      expect(result).toEqual({ synced: 0, failed: 0, skipped: false });
    });

    it('does not call removeSyncItem or updateSyncItemAttempt when empty', async () => {
      await flushOfflineQueue();
      expect(removeSyncItem).not.toHaveBeenCalled();
      expect(updateSyncItemAttempt).not.toHaveBeenCalled();
    });

    it('does not call supabaseService.push when queue is empty', async () => {
      await flushOfflineQueue();
      expect(supabaseService.push).not.toHaveBeenCalled();
    });
  });

  // ── Successful flush ───────────────────────────────────────────────────────

  describe('successful flush', () => {
    it('removes the sync item after a successful push', async () => {
      const item = makeSyncItem();
      (getPendingSyncItems as jest.Mock).mockResolvedValue([item]);

      const result = await flushOfflineQueue();

      expect(removeSyncItem).toHaveBeenCalledWith(item.id);
      expect(updateSyncItemAttempt).not.toHaveBeenCalled();
      expect(result).toEqual({ synced: 1, failed: 0, skipped: false });
    });

    it('passes the correct table and operation to supabaseService', async () => {
      const item = makeSyncItem({ entityType: 'cycle_entries', operation: 'upsert', entityId: 'cycle-1' });
      (getPendingSyncItems as jest.Mock).mockResolvedValue([item]);

      await flushOfflineQueue();

      expect(supabaseService.push).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'cycle_entries',
          operation: 'upsert',
          entityId: 'cycle-1',
        }),
      );
    });

    it('counts all synced items correctly for multiple successes', async () => {
      const items = [
        makeSyncItem({ id: 'a' }),
        makeSyncItem({ id: 'b' }),
        makeSyncItem({ id: 'c' }),
      ];
      (getPendingSyncItems as jest.Mock).mockResolvedValue(items);

      const result = await flushOfflineQueue();

      expect(result.synced).toBe(3);
      expect(result.failed).toBe(0);
      expect(removeSyncItem).toHaveBeenCalledTimes(3);
    });

    it('calls removeSyncItem with each item id', async () => {
      const items = [makeSyncItem({ id: 'x1' }), makeSyncItem({ id: 'x2' })];
      (getPendingSyncItems as jest.Mock).mockResolvedValue(items);

      await flushOfflineQueue();

      expect(removeSyncItem).toHaveBeenCalledWith('x1');
      expect(removeSyncItem).toHaveBeenCalledWith('x2');
    });
  });

  // ── Retry counting ─────────────────────────────────────────────────────────

  describe('retry counting on failure', () => {
    it('increments attempts when push returns ok: false', async () => {
      const item = makeSyncItem({ attempts: 0 });
      (getPendingSyncItems as jest.Mock).mockResolvedValue([item]);
      (supabaseService.push as jest.Mock).mockResolvedValue({ ok: false, error: 'Network timeout' });

      const result = await flushOfflineQueue();

      expect(updateSyncItemAttempt).toHaveBeenCalledWith(item.id, 'Network timeout');
      expect(removeSyncItem).not.toHaveBeenCalled();
      expect(result).toEqual({ synced: 0, failed: 1, skipped: false });
    });

    it('increments attempts when push throws an Error', async () => {
      const item = makeSyncItem({ attempts: 1 });
      (getPendingSyncItems as jest.Mock).mockResolvedValue([item]);
      (supabaseService.push as jest.Mock).mockRejectedValue(new Error('Connection refused'));

      const result = await flushOfflineQueue();

      expect(updateSyncItemAttempt).toHaveBeenCalledWith(item.id, 'Connection refused');
      expect(result.failed).toBe(1);
    });

    it('converts non-Error thrown values to string for the error log', async () => {
      const item = makeSyncItem();
      (getPendingSyncItems as jest.Mock).mockResolvedValue([item]);
      (supabaseService.push as jest.Mock).mockRejectedValue('raw string error');

      await flushOfflineQueue();

      expect(updateSyncItemAttempt).toHaveBeenCalledWith(item.id, 'raw string error');
    });

    it('uses a fallback message when push returns ok:false with no error string', async () => {
      const item = makeSyncItem();
      (getPendingSyncItems as jest.Mock).mockResolvedValue([item]);
      (supabaseService.push as jest.Mock).mockResolvedValue({ ok: false });

      await flushOfflineQueue();

      expect(updateSyncItemAttempt).toHaveBeenCalledWith(item.id, 'Remote rejected the payload');
    });

    it('continues processing remaining items after a single item fails', async () => {
      const failItem = makeSyncItem({ id: 'fail' });
      const successItem = makeSyncItem({ id: 'success' });
      (getPendingSyncItems as jest.Mock).mockResolvedValue([failItem, successItem]);
      (supabaseService.push as jest.Mock)
        .mockResolvedValueOnce({ ok: false, error: 'Rejected' })
        .mockResolvedValueOnce({ ok: true });

      const result = await flushOfflineQueue();

      expect(result).toEqual({ synced: 1, failed: 1, skipped: false });
      expect(removeSyncItem).toHaveBeenCalledWith(successItem.id);
      expect(updateSyncItemAttempt).toHaveBeenCalledWith(failItem.id, 'Rejected');
    });

    it('processes item with attempts = MAX_ATTEMPTS - 1 (last eligible attempt)', async () => {
      const item = makeSyncItem({ attempts: MAX_ATTEMPTS - 1 });
      (getPendingSyncItems as jest.Mock).mockResolvedValue([item]);

      const result = await flushOfflineQueue();

      expect(result.synced).toBe(1);
    });
  });

  // ── Conflict resolution via upsert ────────────────────────────────────────

  describe('conflict resolution – last-write-wins via upsert', () => {
    it('forwards operation: upsert so Supabase overwrites existing rows', async () => {
      const item = makeSyncItem({ operation: 'upsert' });
      (getPendingSyncItems as jest.Mock).mockResolvedValue([item]);

      await flushOfflineQueue();

      expect(supabaseService.push).toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'upsert' }),
      );
    });

    it('forwards operation: delete with entityId so Supabase deletes the row', async () => {
      const item = makeSyncItem({ operation: 'delete', entityId: 'deleted-id' });
      (getPendingSyncItems as jest.Mock).mockResolvedValue([item]);

      await flushOfflineQueue();

      expect(supabaseService.push).toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'delete', entityId: 'deleted-id' }),
      );
    });

    it('passes the decrypted and parsed payload object (not a string) to supabaseService', async () => {
      const rawPayload = { id: 'entity-abc', mood: 'tired', energy: 'low' };
      const item = makeSyncItem({ encryptedPayload: JSON.stringify(rawPayload) });
      (getPendingSyncItems as jest.Mock).mockResolvedValue([item]);

      await flushOfflineQueue();

      expect(supabaseService.push).toHaveBeenCalledWith(
        expect.objectContaining({ payload: rawPayload }),
      );
    });

    it('decrypts the payload before forwarding (encryption boundary is here)', async () => {
      const { encryptionService } = jest.requireMock('@/src/services/encryptionService') as {
        encryptionService: { decrypt: jest.Mock };
      };
      const item = makeSyncItem();
      (getPendingSyncItems as jest.Mock).mockResolvedValue([item]);

      await flushOfflineQueue();

      expect(encryptionService.decrypt).toHaveBeenCalledWith(item.encryptedPayload);
    });
  });

  // ── Offline / skip behaviour ───────────────────────────────────────────────

  describe('offline / skip behaviour', () => {
    it('returns skipped: true and does not touch DB when device is offline', async () => {
      (canSync as jest.Mock).mockResolvedValue(false);

      const result = await flushOfflineQueue();

      expect(result).toEqual({ synced: 0, failed: 0, skipped: true });
      expect(getPendingSyncItems).not.toHaveBeenCalled();
      expect(supabaseService.push).not.toHaveBeenCalled();
      expect(removeSyncItem).not.toHaveBeenCalled();
      expect(updateSyncItemAttempt).not.toHaveBeenCalled();
    });

    it('proceeds normally when canSync returns true', async () => {
      (canSync as jest.Mock).mockResolvedValue(true);

      const result = await flushOfflineQueue();

      expect(result.skipped).toBe(false);
      expect(getPendingSyncItems).toHaveBeenCalledTimes(1);
    });
  });

  // ── Mixed success/failure counts ───────────────────────────────────────────

  describe('mixed results', () => {
    it('returns correct synced and failed counts for a mixed queue', async () => {
      const items = [
        makeSyncItem({ id: '1' }),
        makeSyncItem({ id: '2' }),
        makeSyncItem({ id: '3' }),
        makeSyncItem({ id: '4' }),
      ];
      (getPendingSyncItems as jest.Mock).mockResolvedValue(items);
      (supabaseService.push as jest.Mock)
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: false, error: 'Err' })
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: false, error: 'Err2' });

      const result = await flushOfflineQueue();

      expect(result).toEqual({ synced: 2, failed: 2, skipped: false });
    });
  });
});
