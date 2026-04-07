/**
 * hooks/useRealtimeSync.ts
 *
 * Subscribes to Supabase real-time changes for the authenticated user's
 * daily_logs and cycles tables. When the server sends a change event,
 * the corresponding TanStack Query caches are invalidated with SCOPED keys
 * to minimize unnecessary refetches.
 *
 * Optimizations:
 * - Only invalidate the specific query keys affected by the change (not all queries)
 * - For daily_logs: only invalidate the specific date, plus the range query
 * - For cycles: only invalidate current-cycle and cycle-history, not profile
 * - Skip invalidating expensive queries like smart_events
 *
 * Usage: call this hook once near the top of the app (e.g. in HomeScreen
 * or in a layout component). It is safe to mount multiple times because
 * each channel is uniquely named and cleaned up on unmount.
 */
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { supabase } from "@/lib/supabase";
import { todayLocal } from "@/src/domain/utils/dateUtils";

export function useRealtimeSync(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    // ─── Subscribe to daily_logs changes ───────────────────────────────────
    // When a log is inserted/updated, only invalidate that specific date's cache
    // plus the general daily-logs queries.
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
        (payload: any) => {
          // Extract the date from the payload to update targeted caches
          const changedDate = (payload.new?.date as string | undefined) || (payload.old?.date as string | undefined);

          if (changedDate && typeof changedDate === 'string') {
            // Invalidate today's log specifically
            if (changedDate === todayLocal()) {
              void queryClient.invalidateQueries({
                queryKey: ["daily-log", changedDate],
                exact: true,
              });
            }

            // Invalidate date-range queries that contain this date
            void queryClient.invalidateQueries({
              queryKey: ["daily-logs-range"],
              predicate: (query) => {
                // Only invalidate range queries that could contain this date
                const [, fromDate, toDate] = query.queryKey as any[];
                return (
                  typeof fromDate === "string" &&
                  typeof toDate === "string" &&
                  changedDate >= fromDate &&
                  changedDate <= toDate
                );
              },
            });
          }

          // Always invalidate the generic daily-logs list (used by insights)
          void queryClient.invalidateQueries({
            queryKey: ["daily-logs"],
            predicate: (query) => {
              // Match all daily-logs queries (e.g., ['daily-logs', 90])
              return (
                Array.isArray(query.queryKey) &&
                query.queryKey[0] === "daily-logs" &&
                query.queryKey.length === 2
              );
            },
          });
        },
      )
      .subscribe();

    // ─── Subscribe to cycles changes ──────────────────────────────────────
    // When a cycle is inserted/updated, only invalidate cycle-related caches,
    // NOT profile or unrelated data.
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
          // Invalidate current cycle (matches ['current-cycle'])
          void queryClient.invalidateQueries({
            queryKey: ["current-cycle"],
            exact: true,
          });

          // Invalidate cycle history list (matches ['cycle-history', limit])
          void queryClient.invalidateQueries({
            queryKey: ["cycle-history"],
            predicate: (query) => {
              return (
                Array.isArray(query.queryKey) &&
                query.queryKey[0] === "cycle-history" &&
                query.queryKey.length === 2
              );
            },
          });

          // Do NOT invalidate profile, smart_events, or partner data
          // to minimize cascade re-renders and network requests
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(logsChannel);
      void supabase.removeChannel(cyclesChannel);
    };
  }, [userId, queryClient]);
}

