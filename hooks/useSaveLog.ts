/**
 * hooks/useSaveLog.ts
 * Mutation hook for upserting a daily_logs row.
 *
 * Implements optimistic updates so the Dashboard updates instantly:
 *
 *   1. onMutate  → snapshot current cache, apply optimistic update
 *   2. mutationFn → Supabase upsert (ON CONFLICT user_id,date DO UPDATE)
 *   3. onError   → rollback to snapshot
 *   4. onSettled → invalidate to pull confirmed server state
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { DerivedCycleData } from "@/hooks/useCurrentCycle";
import { CURRENT_CYCLE_KEY, computeCycleDay } from "@/hooks/useCurrentCycle";
import { DAILY_LOGS_KEY, TODAY_LOG_KEY, todayIso } from "@/hooks/useDailyLogs";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/src/services/analytics";
import type { DailyLogRow, LogPayload } from "@/types/database";

export function useSaveLog() {
  const queryClient = useQueryClient();

  return useMutation<
    DailyLogRow,
    Error,
    LogPayload,
    { previousLog: DailyLogRow | null | undefined }
  >({
    // ─── Actual Supabase write ─────────────────────────────────────────────
    mutationFn: async (payload) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const today = todayIso();

      // Derive cycle context from the cached query so we don't need a round-trip
      const cycleData = queryClient.getQueryData<DerivedCycleData | null>(
        CURRENT_CYCLE_KEY,
      );
      const cycleId = cycleData?.cycle?.id ?? null;
      const cycleDay = cycleData?.cycle?.start_date
        ? computeCycleDay(cycleData.cycle.start_date)
        : null;

      const { data, error } = await supabase
        .from("daily_logs")
        .upsert(
          {
            user_id: user.id,
            date: today,
            cycle_id: cycleId,
            cycle_day: cycleDay,
            ...payload,
          },
          { onConflict: "user_id,date" },
        )
        .select()
        .single();

      if (error) throw error;
      return data as unknown as DailyLogRow;
    },

    // ─── Optimistic update ─────────────────────────────────────────────────
    onMutate: async (payload) => {
      const todayKey = TODAY_LOG_KEY();
      await queryClient.cancelQueries({ queryKey: todayKey });

      const previousLog = queryClient.getQueryData<DailyLogRow | null>(
        todayKey,
      );

      // Merge incoming payload with whatever we already have cached today
      queryClient.setQueryData<DailyLogRow | null>(
        todayKey,
        (old) =>
          ({
            ...(old ?? {
              id: "optimistic",
              user_id: "",
              date: todayIso(),
              cycle_day: null,
              cycle_id: null,
              symptoms: [],
              partner_alert: false,
              created_at: new Date().toISOString(),
            }),
            ...payload,
            updated_at: new Date().toISOString(),
          }) as DailyLogRow,
      );

      return { previousLog };
    },

    // ─── Rollback on error ─────────────────────────────────────────────────
    onError: (_error, _payload, context) => {
      if (context?.previousLog !== undefined) {
        queryClient.setQueryData(TODAY_LOG_KEY(), context.previousLog);
      }
    },

    onSuccess: (_saved, payload) => {
      if ((payload.symptoms?.length ?? 0) > 0) {
        trackEvent("symptom_logged", {
          symptom_count: payload.symptoms?.length ?? 0,
        });
      }
      if ((payload.flow_level ?? 0) > 0) {
        trackEvent("period_logged", { source: "daily_log" });
      }
      trackEvent("log_saved");
    },

    // ─── Re-sync with server ───────────────────────────────────────────────
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TODAY_LOG_KEY() });
      // Also invalidate recent logs so Insights stays up to date
      queryClient.invalidateQueries({ queryKey: DAILY_LOGS_KEY(90) });
    },
  });
}
