/**
 * src/database/localDB/index.ts
 *
 * SQLite-backed local database layer.
 * All writes persist immediately to the device; writes also enqueue a
 * sync_queue entry so OfflineSyncService can push changes to Supabase
 * when connectivity is available.
 */
import * as SQLite from 'expo-sqlite';

import { runMigrations } from '@/src/database/migrations/init';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SymptomLogInput = {
  mood?: string;
  energy?: string;
  tags?: string[];
  notes?: string;
};

export type SymptomLog = {
  id: string;
  loggedAt: string;
  mood?: string;
  energy?: string;
  tags: string[];
  notes?: string;
};

export type CycleEntryInput = {
  startDate: string;
  endDate?: string;
  cycleDay: number;
  phase: 'menstrual' | 'follicular' | 'ovulation' | 'luteal';
};

export type CycleEntry = {
  id: string;
  startDate: string;
  endDate: string | null;
  cycleDay: number;
  phase: string;
  createdAt: string;
  updatedAt: string;
};

export type SyncQueueItem = {
  id: string;
  entityType: string;
  entityId: string;
  operation: 'upsert' | 'delete';
  encryptedPayload: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

// ─── DB singleton ─────────────────────────────────────────────────────────────

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('women-health.db');
  }
  return dbPromise;
}

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await getDatabase();
  await runMigrations(db);
  return db;
}

// ─── Symptom Logs ─────────────────────────────────────────────────────────────

export async function saveSymptomLog(input: SymptomLogInput): Promise<SymptomLog> {
  const db = await initDatabase();
  const id = createId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO symptom_logs (id, logged_at, mood, energy, tags, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, now, input.mood ?? null, input.energy ?? null, JSON.stringify(input.tags ?? []), input.notes ?? null, now, now],
  );

  return {
    id,
    loggedAt: now,
    mood: input.mood,
    energy: input.energy,
    tags: input.tags ?? [],
    notes: input.notes,
  };
}

export async function getLatestSymptomLog(): Promise<SymptomLog | null> {
  const db = await initDatabase();
  const row = await db.getFirstAsync<{
    id: string;
    logged_at: string;
    mood: string | null;
    energy: string | null;
    tags: string | null;
    notes: string | null;
  }>('SELECT id, logged_at, mood, energy, tags, notes FROM symptom_logs ORDER BY logged_at DESC LIMIT 1');

  if (!row) return null;

  return {
    id: row.id,
    loggedAt: row.logged_at,
    mood: row.mood ?? undefined,
    energy: row.energy ?? undefined,
    tags: row.tags ? (JSON.parse(row.tags) as string[]) : [],
    notes: row.notes ?? undefined,
  };
}

/**
 * Returns the most recent symptom log for the given UTC date (YYYY-MM-DD).
 * Uses a range query so SQLite can leverage an index on logged_at.
 */
export async function getSymptomLogForDate(date: string): Promise<SymptomLog | null> {
  const startOfDay = `${date}T00:00:00.000Z`;
  const nextDate = new Date(startOfDay);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const startOfNextDay = nextDate.toISOString();

  const db = await initDatabase();
  const row = await db.getFirstAsync<{
    id: string;
    logged_at: string;
    mood: string | null;
    energy: string | null;
    tags: string | null;
    notes: string | null;
  }>(
    `SELECT id, logged_at, mood, energy, tags, notes
     FROM symptom_logs
     WHERE logged_at >= ? AND logged_at < ?
     ORDER BY logged_at DESC
     LIMIT 1`,
    [startOfDay, startOfNextDay],
  );

  if (!row) return null;

  return {
    id: row.id,
    loggedAt: row.logged_at,
    mood: row.mood ?? undefined,
    energy: row.energy ?? undefined,
    tags: row.tags ? (JSON.parse(row.tags) as string[]) : [],
    notes: row.notes ?? undefined,
  };
}

// ─── Cycle Entries ────────────────────────────────────────────────────────────

export async function saveCycleEntry(input: CycleEntryInput): Promise<CycleEntry> {
  const db = await initDatabase();
  const id = createId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO cycle_entries (id, start_date, end_date, cycle_day, phase, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.startDate, input.endDate ?? null, input.cycleDay, input.phase, now, now],
  );

  return {
    id,
    startDate: input.startDate,
    endDate: input.endDate ?? null,
    cycleDay: input.cycleDay,
    phase: input.phase,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getLatestCycleEntry(): Promise<CycleEntry | null> {
  const db = await initDatabase();
  const row = await db.getFirstAsync<{
    id: string;
    start_date: string;
    end_date: string | null;
    cycle_day: number;
    phase: string;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, start_date, end_date, cycle_day, phase, created_at, updated_at
     FROM cycle_entries
     ORDER BY start_date DESC
     LIMIT 1`,
  );

  if (!row) return null;

  return {
    id: row.id,
    startDate: row.start_date,
    endDate: row.end_date,
    cycleDay: row.cycle_day,
    phase: row.phase,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Sync Queue ───────────────────────────────────────────────────────────────

/**
 * Enqueues a record for deferred sync to Supabase.
 * The caller is responsible for encrypting the payload before passing it here.
 */
export async function enqueueSync(
  entityType: string,
  entityId: string,
  operation: 'upsert' | 'delete',
  encryptedPayload: string,
): Promise<void> {
  const db = await initDatabase();
  const id = createId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO sync_queue (id, entity_type, entity_id, operation, encrypted_payload, attempts, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    [id, entityType, entityId, operation, encryptedPayload, now, now],
  );
}

/**
 * Returns all sync_queue items whose attempt count is below maxAttempts,
 * ordered FIFO (oldest first) so stale records aren't endlessly re-queued ahead
 * of newer ones.
 */
export async function getPendingSyncItems(maxAttempts: number): Promise<SyncQueueItem[]> {
  const db = await initDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    entity_type: string;
    entity_id: string;
    operation: string;
    encrypted_payload: string;
    attempts: number;
    last_error: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, entity_type, entity_id, operation, encrypted_payload, attempts, last_error, created_at, updated_at
     FROM sync_queue
     WHERE attempts < ?
     ORDER BY created_at ASC`,
    [maxAttempts],
  );

  return rows.map((row) => ({
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    operation: row.operation as 'upsert' | 'delete',
    encryptedPayload: row.encrypted_payload,
    attempts: row.attempts,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/** Removes a successfully synced item from the queue. */
export async function removeSyncItem(id: string): Promise<void> {
  const db = await initDatabase();
  await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
}

/** Increments the attempt counter and records the latest error message. */
export async function updateSyncItemAttempt(id: string, error: string): Promise<void> {
  const db = await initDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE sync_queue
     SET attempts = attempts + 1,
         last_error = ?,
         updated_at = ?
     WHERE id = ?`,
    [error, now, id],
  );
}
