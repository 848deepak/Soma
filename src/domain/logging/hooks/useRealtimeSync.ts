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
import { useEffect, useRef } from "react";

import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/src/lib/queryKeys";
import { todayLocal } from "@/src/domain/utils/dateUtils";

export function useRealtimeSync(userId: string | undefined) {
  const queryClient = useQueryClient();
  const channelsRef = useRef<{
    logs: ReturnType<typeof supabase.channel>;
    cycles: ReturnType<typeof supabase.channel>;
  } | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Always clean up previous subscriptions first before resubscribing.
    // This is critical for handling anonymous → email upgrade transitions
    // where userId changes and we need to subscribe to a different user's channel.
    const cleanup = () => {
      if (channelsRef.current) {
        const { logs, cycles } = channelsRef.current;

        if (logs) {
          supabase.removeChannel(logs).catch((e) => {
            console.warn('[RealtimeSync] Failed to remove logsChannel:', e);
          });
        }

        if (cycles) {
          supabase.removeChannel(cycles).catch((e) => {
            console.warn('[RealtimeSync] Failed to remove cyclesChannel:', e);
          });
        }

        channelsRef.current = null;
      }
    };

    // Remove old channels before subscribing to new ones
    cleanup();

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
                queryKey: QUERY_KEYS.dailyLog(changedDate),
                exact: true,
              });
            }

            // Invalidate date-range queries that contain this date
            void queryClient.invalidateQueries({
              queryKey: ["daily-logs-range"], // Matches all range queries
              predicate: (query) => {
                // Only invalidate range queries that could contain this date
                const [key, fromDate, toDate] = query.queryKey as any[];
                return (
                  key === "daily-logs-range" &&
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
          // Invalidate current cycle
          void queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.currentCycle(),
            exact: true,
          });

          // Invalidate cycle history list
          void queryClient.invalidateQueries({
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

    // Store channels for cleanup
    channelsRef.current = { logs: logsChannel, cycles: cyclesChannel };

    if (__DEV__) {
      console.log('[RealtimeSync] Subscribed for userId:', userId);
    }

    // ─── Cleanup: remove channels on unmount or userId change ────────────────
    return cleanup;
  }, [userId, queryClient]);
}

