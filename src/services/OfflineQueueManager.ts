/**
 * src/services/OfflineQueueManager.ts
 *
 * Manages an offline queue with idempotency and dead-letter handling.
 *
 * Key improvements over basic sync:
 * - Each operation has a unique UUID (idempotency token)
 * - Operations are idempotent: 409 Conflict = success (already applied)
 * - On failure: exponential backoff retry (1s, 4s, 16s)
 * - After max retries: moves to dead-letter queue
 * - Dead-letter queue persists errors for later inspection/replay
 * - Partial queue flush does NOT cause duplicates on app restart
 *
 * Design philosophy:
 * - Never silently discard failed writes (user must know)
 * - Process FIFO to maintain mutation ordering
 * - Deduplicate by operation UUID (not entity)
 * - On reconnect: process dead-letter after main queue
 */

import { v4 as uuid } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logDataEvent, logError, logWarn } from '@/platform/monitoring/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface QueuedOperation {
  /** Unique operation ID - persists across retries for idempotency */
  requestId: string;
  /** Timestamp operation was enqueued (ISO string) */
  enqueuedAt: string;
  /** Table name (e.g., 'daily_logs', 'profiles', 'cycles') */
  table: string;
  /** Operation type: 'insert', 'update', 'upsert', 'delete' */
  operation: 'insert' | 'update' | 'upsert' | 'delete';
  /** The data payload to send to Supabase */
  payload: Record<string, unknown>;
  /** Row ID (used for delete/update operations) */
  rowId?: string;
  /** Number of failed attempts so far */
  attemptCount: number;
  /** Maximum attempts before moving to dead-letter (default: 3) */
  maxAttempts: number;
  /** Last error message (if any) */
  lastError?: string;
  /** Timestamp of last retry (ISO string) */
  lastAttemptAt?: string;
}

export interface DeadLetterEntry {
  /** Reference to original queued operation */
  requestId: string;
  /** Why it failed after all retries */
  failureReason: string;
  /** Final error message */
  errorMessage: string;
  /** When it was moved to dead-letter (ISO string) */
  movedAt: string;
  /** The operation data for potential replay */
  operation: QueuedOperation;
}

export interface FlushResult {
  /** Operations successfully synced in this pass */
  synced: number;
  /** Operations that failed (incremented attemptCount) */
  failed: number;
  /** Operations moved to dead-letter queue */
  deadLettered: number;
  /** True when offline - no operations processed */
  skipped: boolean;
  /** Errors encountered during flush */
  errors: Array<{ requestId: string; reason: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage Keys
// ─────────────────────────────────────────────────────────────────────────────

const QUEUE_STORAGE_KEY = '@soma/offline_queue:main';
const DEAD_LETTER_STORAGE_KEY = '@soma/offline_queue:dead_letter';
const QUEUE_STATE_KEY = '@soma/offline_queue:state';

// ─────────────────────────────────────────────────────────────────────────────
// Queue Manager
// ─────────────────────────────────────────────────────────────────────────────

export class OfflineQueueManager {
  /**
   * Enqueue an operation for later sync.
   * Returns a requestId that can be used to track the operation.
   */
  static async enqueue(
    table: string,
    operation: 'insert' | 'update' | 'upsert' | 'delete',
    payload: Record<string, unknown>,
    options?: {
      rowId?: string;
      maxAttempts?: number;
    },
  ): Promise<string> {
    const requestId = uuid();
    const now = new Date().toISOString();

    const queued: QueuedOperation = {
      requestId,
      enqueuedAt: now,
      table,
      operation,
      payload,
      rowId: options?.rowId,
      attemptCount: 0,
      maxAttempts: options?.maxAttempts ?? 3,
    };

    try {
      const existing = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      const queue: QueuedOperation[] = existing ? JSON.parse(existing) : [];
      queue.push(queued);
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));

      logDataEvent('offline_queue_enqueue', { requestId, table });
    } catch (err) {
      logError('data', 'offline_queue_enqueue_failed', {
        requestId,
        table,
        error: err instanceof Error ? err.message : String(err),
      });
      throw new Error(`Failed to enqueue offline operation: ${err instanceof Error ? err.message : String(err)}`);
    }

    return requestId;
  }

  /**
   * Get the current queue length (for UI feedback).
   */
  static async getQueueLength(): Promise<number> {
    try {
      const data = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (!data) return 0;
      const queue: QueuedOperation[] = JSON.parse(data);
      return queue.length;
    } catch (err) {
      logError('data', 'offline_queue_length_read_failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return 0;
    }
  }

  /**
   * Get the dead-letter queue (for support/debugging).
   */
  static async getDeadLetterQueue(): Promise<DeadLetterEntry[]> {
    try {
      const data = await AsyncStorage.getItem(DEAD_LETTER_STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch (err) {
      logError('data', 'offline_queue_deadletter_read_failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  }

  /**
   * Process the queue (called when network is restored).
   *
   * @param syncFn - Async function that performs the actual sync.
   *                 Should throw on network error, return { ok: true/false } on result.
   * @returns FlushResult with counts and any errors that occurred.
   */
  static async flushQueue(
    syncFn: (op: QueuedOperation) => Promise<{ ok: boolean; error?: string }>,
  ): Promise<FlushResult> {
    const result: FlushResult = {
      synced: 0,
      failed: 0,
      deadLettered: 0,
      skipped: false,
      errors: [],
    };

    try {
      // Step 1: Process main queue
      const queueData = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (!queueData) {
        // Try dead-letter queue
        return await this.processDeadLetterQueue(syncFn, result);
      }

      const queue: QueuedOperation[] = JSON.parse(queueData);
      const updatedQueue: QueuedOperation[] = [];
      const deadLetterEntries: DeadLetterEntry[] = await this.getDeadLetterQueue();

      logDataEvent('offline_queue_flush_start', { queueLength: queue.length });

      for (const op of queue) {
        try {
          // Calculate exponential backoff delay before retry
          const delaySec =
            op.attemptCount === 0 ? 0 : Math.pow(4, op.attemptCount - 1); // 1s, 4s, 16s
          if (op.lastAttemptAt && delaySec > 0) {
            const elapsed = (Date.now() - new Date(op.lastAttemptAt).getTime()) / 1000;
            if (elapsed < delaySec) {
              logDataEvent('offline_queue_operation_delayed', {
                requestId: op.requestId,
                secondsRemaining: Math.ceil(delaySec - elapsed),
              });
              updatedQueue.push(op);
              continue;
            }
          }

          // Attempt to sync
          const syncResult = await syncFn(op);

          if (syncResult.ok) {
            // Success: operation applied
            logDataEvent('offline_queue_operation_synced', { requestId: op.requestId });
            result.synced++;
            // Do NOT add to updatedQueue (effectively dequeuing)
          } else if (syncResult.error?.includes('409') || syncResult.error?.includes('duplicate')) {
            // 409 Conflict: operation was already applied (idempotent success)
            logDataEvent('offline_queue_operation_idempotent_success', {
              requestId: op.requestId,
              error: syncResult.error,
            });
            result.synced++;
            // Do NOT add to updatedQueue
          } else {
            // Transient error: retry later
            op.attemptCount++;
            op.lastAttemptAt = new Date().toISOString();
            op.lastError = syncResult.error;

            if (op.attemptCount >= op.maxAttempts) {
              // Move to dead-letter
              logWarn('offline_queue', 'offline_queue_operation_deadlettered', {
                requestId: op.requestId,
                attempts: op.attemptCount,
                error: syncResult.error,
              });
              deadLetterEntries.push({
                requestId: op.requestId,
                failureReason: 'max_retries_exceeded',
                errorMessage: syncResult.error || 'Unknown error',
                movedAt: new Date().toISOString(),
                operation: op,
              });
              result.deadLettered++;
            } else {
              // Keep in queue for next flush
              logDataEvent('offline_queue_operation_retry_scheduled', {
                requestId: op.requestId,
                attempt: op.attemptCount,
                maxAttempts: op.maxAttempts,
              });
              updatedQueue.push(op);
              result.failed++;
            }
          }
        } catch (err) {
          // Network or sync function error: keep in queue
          const opError = err instanceof Error ? err.message : String(err);
          logError('data', 'offline_queue_operation_sync_error', {
            requestId: op.requestId,
            error: opError,
          });

          op.attemptCount++;
          op.lastAttemptAt = new Date().toISOString();
          op.lastError = opError;

          if (op.attemptCount >= op.maxAttempts) {
            deadLetterEntries.push({
              requestId: op.requestId,
              failureReason: 'sync_error',
              errorMessage: opError,
              movedAt: new Date().toISOString(),
              operation: op,
            });
            result.deadLettered++;
          } else {
            updatedQueue.push(op);
            result.failed++;
          }

          result.errors.push({
            requestId: op.requestId,
            reason: opError,
          });
        }
      }

      // Step 2: Persist updated state
      if (updatedQueue.length > 0) {
        await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updatedQueue));
      } else {
        await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
      }

      if (deadLetterEntries.length > 0) {
        await AsyncStorage.setItem(DEAD_LETTER_STORAGE_KEY, JSON.stringify(deadLetterEntries));
      }

      logDataEvent('offline_queue_flush_complete', {
        synced: result.synced,
        failed: result.failed,
        deadLettered: result.deadLettered,
      });
      return result;
    } catch (err) {
      logError('data', 'offline_queue_flush_fatal_error', {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Clear all queued operations (emergency only).
   * Call this when user manually requests a "discard unsaved changes" action.
   */
  static async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
      logDataEvent('offline_queue_cleared', {});
    } catch (err) {
      logError('data', 'offline_queue_clear_failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Clear dead-letter queue (after user reviews and manually resolves).
   */
  static async clearDeadLetter(): Promise<void> {
    try {
      await AsyncStorage.removeItem(DEAD_LETTER_STORAGE_KEY);
      logDataEvent('offline_queue_deadletter_cleared', {});
    } catch (err) {
      logError('data', 'offline_queue_deadletter_clear_failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Replay a dead-letter entry (called by support or user action).
   * Moves operation back to main queue with attemptCount reset.
   */
  static async replayDeadLetter(requestId: string): Promise<void> {
    try {
      const deadLetters = await this.getDeadLetterQueue();
      const index = deadLetters.findIndex((e) => e.requestId === requestId);

      if (index === -1) {
        throw new Error(`Dead-letter entry not found: ${requestId}`);
      }

      const entry = deadLetters[index];
      entry.operation.attemptCount = 0;
      entry.operation.lastError = undefined;
      entry.operation.lastAttemptAt = undefined;

      // Re-enqueue
      const queueData = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      const queue: QueuedOperation[] = queueData ? JSON.parse(queueData) : [];
      queue.push(entry.operation);
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));

      // Remove from dead-letter
      deadLetters.splice(index, 1);
      if (deadLetters.length > 0) {
        await AsyncStorage.setItem(DEAD_LETTER_STORAGE_KEY, JSON.stringify(deadLetters));
      } else {
        await AsyncStorage.removeItem(DEAD_LETTER_STORAGE_KEY);
      }

      logDataEvent('offline_queue_deadletter_replayed', { requestId });
    } catch (err) {
      logError('data', 'offline_queue_deadletter_replay_failed', {
        requestId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  private static async processDeadLetterQueue(
    syncFn: (op: QueuedOperation) => Promise<{ ok: boolean; error?: string }>,
    result: FlushResult,
  ): Promise<FlushResult> {
    const deadLetters = await this.getDeadLetterQueue();
    if (deadLetters.length === 0) {
      return result;
    }

    logDataEvent('offline_queue_deadletter_processing', { count: deadLetters.length });

    const remainingDeadLetters: DeadLetterEntry[] = [];

    for (const entry of deadLetters) {
      try {
        const syncResult = await syncFn(entry.operation);
        if (syncResult.ok) {
          logDataEvent('offline_queue_deadletter_recovered', { requestId: entry.requestId });
          result.synced++;
          // Dequeue from dead-letter
        } else {
          // Still failing; keep in dead-letter
          remainingDeadLetters.push(entry);
        }
      } catch (err) {
        // Keep trying later
        remainingDeadLetters.push(entry);
      }
    }

    if (remainingDeadLetters.length > 0) {
      await AsyncStorage.setItem(DEAD_LETTER_STORAGE_KEY, JSON.stringify(remainingDeadLetters));
    } else {
      await AsyncStorage.removeItem(DEAD_LETTER_STORAGE_KEY);
    }

    return result;
  }
}
