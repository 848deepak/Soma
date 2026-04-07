/**
 * src/services/supabaseService/index.ts
 *
 * Low-level adapter that pushes decrypted payloads to Supabase.
 * The decryption boundary lives upstream in OfflineSyncService – by the time
 * data reaches here it is a plain JS object ready for the wire.
 *
 * Last-write-wins conflict resolution is achieved via upsert with
 * onConflict: 'id'. Supabase executes
 *   INSERT … ON CONFLICT (id) DO UPDATE SET <all columns>
 * meaning whichever device syncs last overwrites the server row unconditionally.
 */
import { supabase } from '@/lib/supabase';

function conflictTargetForTable(table: string): string {
  if (table === 'daily_logs') return 'user_id,date';
  if (table === 'cycles') return 'user_id,start_date';
  return 'id';
}

function parseIsoTimestamp(value: unknown): number | null {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isConflictSensitiveTable(table: string): boolean {
  return table === 'daily_logs' || table === 'cycles';
}

async function hasNewerServerRecord(
  table: string,
  payload: Record<string, unknown>,
): Promise<{ stale: boolean; error?: string }> {
  const incomingUpdatedAt = parseIsoTimestamp(payload.updated_at);
  if (!incomingUpdatedAt) return { stale: false };

  let query = supabase.from(table).select('updated_at').limit(1);

  if (table === 'daily_logs') {
    const userId = payload.user_id;
    const date = payload.date;
    if (typeof userId !== 'string' || typeof date !== 'string') {
      return { stale: false };
    }
    query = query.eq('user_id', userId).eq('date', date);
  } else if (table === 'cycles') {
    const userId = payload.user_id;
    const startDate = payload.start_date;
    if (typeof userId !== 'string' || typeof startDate !== 'string') {
      return { stale: false };
    }
    query = query.eq('user_id', userId).eq('start_date', startDate);
  } else {
    return { stale: false };
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    return { stale: false, error: error.message };
  }

  const serverUpdatedAt = parseIsoTimestamp((data as { updated_at?: unknown } | null)?.updated_at);
  if (!serverUpdatedAt) return { stale: false };

  return { stale: serverUpdatedAt > incomingUpdatedAt };
}

export type SupabaseSyncPayload = {
  /** The Supabase table name (e.g. 'symptom_logs', 'cycle_entries'). */
  table: string;
  operation: 'upsert' | 'delete';
  /** The fully-decrypted record object for upsert; ignored for delete. */
  payload: Record<string, unknown>;
  /** The entity id used as the WHERE clause target for delete operations. */
  entityId: string;
};

export type PushResult = {
  ok: boolean;
  error?: string;
};

export const supabaseService = {
  push: async ({ table, operation, payload, entityId }: SupabaseSyncPayload): Promise<PushResult> => {
    if (operation === 'upsert') {
      if (isConflictSensitiveTable(table)) {
        const conflictCheck = await hasNewerServerRecord(table, payload);
        if (conflictCheck.error) return { ok: false, error: conflictCheck.error };
        if (conflictCheck.stale) {
          return {
            ok: false,
            error: 'Stale payload rejected: server already has newer data',
          };
        }
      }

      const onConflict = conflictTargetForTable(table);
      const { error } = await supabase
        .from(table)
        .upsert(payload, { onConflict });

      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (operation === 'delete') {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', entityId);

      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    return { ok: false, error: `Unhandled operation: ${String(operation)}` };
  },
};
