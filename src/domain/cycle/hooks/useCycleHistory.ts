/**
 * hooks/useCycleHistory.ts
 * Fetches completed (closed) cycle rows for trend analysis in InsightsScreen.
 *
 * Only cycles that have both end_date and cycle_length recorded are fetched –
 * the active (open) cycle is excluded because its length is unknown.
 */
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { logDataAccess } from '@/src/services/auditService';
import type { CompletedCycle } from '@/types/database';

export const CYCLE_HISTORY_KEY = (limit: number) => ['cycle-history', limit] as const;

/**
 * Returns up to `limit` most recently completed cycles sorted newest-first.
 * The CycleIntelligence service re-sorts them oldest-first internally.
 */
export function useCycleHistory(limit: number = 6) {
  return useQuery<CompletedCycle[]>({
    queryKey: CYCLE_HISTORY_KEY(limit),
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('cycles')
        .select('*')
        .eq('user_id', user.id)
        .not('end_date', 'is', null)
        .not('cycle_length', 'is', null)
        .order('start_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      const rows = (data ?? []) as unknown as CompletedCycle[];
      void logDataAccess('cycle_data', 'view', {
        source: 'useCycleHistory',
        resultCount: rows.length,
        limit,
      });
      return rows;
    },
    // Completed cycles never change – cache aggressively
    staleTime: 10 * 60 * 1000,
  });
}
