/**
 * hooks/useSharedData.ts
 * Fetches role-filtered shared data from a Care Circle connection.
 * Lazy load + polling fallback (similar to usePartnerLogs pattern).
 */
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as careCircleService from '@/src/services/careCircleService';
import type { SharedDataLog } from '@/types/database';

export const SHARED_DATA_KEY = (partnerId: string) => ['shared-data', partnerId] as const;

/**
 * Fetch shared data from a Care Circle connection.
 * @param partnerId – the data-sharer's user ID
 * @param enabled – lazy load flag (default: true)
 * @param limit – max rows (default: 7)
 * @returns Query result with shared data
 *
 * Realtime: listens to daily_logs updates with user filter + polling fallback.
 */
export function useSharedData(
  partnerId: string | null,
  enabled: boolean = true,
  limit: number = 7,
) {
  const queryClient = useQueryClient();

  // ── Realtime subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !partnerId) return;

    const channel = supabase
      .channel(`shared-data-${partnerId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_logs', filter: `user_id=eq.${partnerId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: SHARED_DATA_KEY(partnerId) });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, partnerId, queryClient]);

  // ── Query ──────────────────────────────────────────────────────────────
  return useQuery<SharedDataLog[]>({
    queryKey: SHARED_DATA_KEY(partnerId || ''),
    enabled: enabled && !!partnerId,
    refetchInterval: 30 * 1000, // 30-second polling fallback
    queryFn: () => careCircleService.getSharedData(partnerId!, limit),
  });
}
