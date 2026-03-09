/**
 * hooks/useDailyLogs.ts
 * Queries daily_logs from Supabase.
 *
 * Two exports:
 *   useDailyLogs(limit)  – recent N logs (used by Insights / Calendar)
 *   useTodayLog()        – today's single log (used by Dashboard widgets + log screens)
 */
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { DailyLogRow } from '@/types/database';

export const DAILY_LOGS_KEY = (limit: number) => ['daily-logs', limit] as const;
export const todayIso = () => new Date().toISOString().split('T')[0]!;
export const TODAY_LOG_KEY = () => ['daily-log', todayIso()] as const;

/**
 * Fetches the N most recent daily log rows for the signed-in user.
 * Used by the Insights screen and the CycleIntelligence service (Phase 3).
 */
export function useDailyLogs(limit: number = 90) {
  return useQuery<DailyLogRow[]>({
    queryKey: DAILY_LOGS_KEY(limit),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .order('date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as unknown as DailyLogRow[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetches today's log row (or null if the user hasn't logged today).
 * Used by the Dashboard to populate the mood/energy/flow widgets.
 */
export function useTodayLog() {
  return useQuery<DailyLogRow | null>({
    queryKey: TODAY_LOG_KEY(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('date', todayIso())
        .maybeSingle();

      if (error) throw error;
      return data as unknown as DailyLogRow | null;
    },
    // Today's log changes when the user logs – keep stale time short
    staleTime: 60 * 1000,
  });
}
