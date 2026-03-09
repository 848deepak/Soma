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
      const { error } = await supabase
        .from(table)
        .upsert(payload, { onConflict: 'id' });

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
