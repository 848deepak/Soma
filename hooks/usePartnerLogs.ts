/**
 * hooks/usePartnerLogs.ts
 * Fetches the 7 most recent rows from the partner_visible_logs VIEW.
 *
 * The VIEW applies RLS automatically: it only returns rows for the partner whose
 * user_id matches the active partners.user_id where partners.partner_user_id = me.
 * Privacy filters (mood, symptoms, fertility) are enforced in the VIEW definition.
 *
 * Realtime strategy:
 *   – Supabase Realtime channel subscribed to partner_visible_logs changes.
 *   – 30-second polling via refetchInterval as a guaranteed fallback (VIEW-level
 *     Realtime requires the publication to include the view; polling ensures
 *     the UI stays fresh regardless of publication config).
 */
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { logDataAccess } from '@/src/services/auditService';
import type { PartnerVisibleLog } from '@/types/database';

export const PARTNER_LOGS_KEY = ['partner-logs'] as const;

export function usePartnerLogs(enabled: boolean = true) {
  const queryClient = useQueryClient();

  // ── Realtime subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('partner-visible-logs-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'partner_visible_logs' },
        () => {
          queryClient.invalidateQueries({ queryKey: PARTNER_LOGS_KEY });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);

  // ── Query ────────────────────────────────────────────────────────────────
  return useQuery<PartnerVisibleLog[]>({
    queryKey: PARTNER_LOGS_KEY,
    enabled,
    // 30-second polling: fallback if Realtime subscription misses an event.
    refetchInterval: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_visible_logs')
        .select('*')
        .order('date', { ascending: false })
        .limit(7);

      if (error) throw error;
      const rows = (data ?? []) as unknown as PartnerVisibleLog[];
      void logDataAccess('partner_data', 'view', {
        source: 'usePartnerLogs',
        resultCount: rows.length,
        limit: 7,
      });
      return rows;
    },
  });
}
