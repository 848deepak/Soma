/**
 * hooks/useRealtimeSync.ts
 *
 * Subscribes to Supabase real-time changes for the authenticated user's
 * daily_logs and cycles tables. When the server sends a change event,
 * the corresponding TanStack Query caches are invalidated so every
 * screen that consumes these queries refreshes automatically.
 *
 * Usage: call this hook once near the top of the app (e.g. in HomeScreen
 * or in a layout component). It is safe to mount multiple times because
 * each channel is uniquely named and cleaned up on unmount.
 */
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { supabase } from "@/lib/supabase";

export function useRealtimeSync(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    // Subscribe to daily_logs inserts/updates for this user.
    // Invalidates both the daily-logs list and daily-log (today) queries.
    const logsChannel = supabase
      .channel(`rt-daily-logs-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_logs",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // 'daily-logs' matches useDailyLogs cache keys: ['daily-logs', limit]
          void queryClient.invalidateQueries({ queryKey: ["daily-logs"] });
          // 'daily-log' matches useTodayLog cache key: ['daily-log', today]
          void queryClient.invalidateQueries({ queryKey: ["daily-log"] });
        },
      )
      .subscribe();

    // Subscribe to cycles inserts/updates for this user.
    // Invalidates both the active cycle and cycle history queries.
    const cyclesChannel = supabase
      .channel(`rt-cycles-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cycles",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // 'current-cycle' matches useCurrentCycle cache key: ['current-cycle']
          void queryClient.invalidateQueries({ queryKey: ["current-cycle"] });
          // 'cycle-history' matches useCycleHistory cache key: ['cycle-history', limit]
          void queryClient.invalidateQueries({ queryKey: ["cycle-history"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(logsChannel);
      void supabase.removeChannel(cyclesChannel);
    };
  }, [userId, queryClient]);
}

