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
import { enqueueSync } from "@/src/database/localDB";
import { trackEvent } from "@/src/services/analytics";
import { encryptionService } from "@/src/services/encryptionService";
import type { DailyLogRow, LogPayload } from "@/types/database";

function isLikelyNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  return (
    normalized.includes("network") ||
    normalized.includes("fetch") ||
    normalized.includes("offline") ||
    normalized.includes("timed out") ||
    normalized.includes("timeout")
  );
}

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

      // Prefer server cycle context to reduce stale cache races when users log
      // quickly after period start/end actions.
      const cachedCycleData = queryClient.getQueryData<DerivedCycleData | null>(
        CURRENT_CYCLE_KEY,
      );

      const { data: activeCycle, error: activeCycleError } = await supabase
        .from("cycles")
        .select("id,start_date")
        .eq("user_id", user.id)
        .is("end_date", null)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeCycleError && !isLikelyNetworkError(activeCycleError)) {
        throw activeCycleError;
      }

      const resolvedCycle =
        activeCycle ??
        (cachedCycleData?.cycle
          ? {
              id: cachedCycleData.cycle.id,
              start_date: cachedCycleData.cycle.start_date,
            }
          : null);

      const cycleId = resolvedCycle?.id ?? null;
      const cycleDay = resolvedCycle?.start_date
        ? computeCycleDay(resolvedCycle.start_date)
        : null;

      const upsertPayload = {
        user_id: user.id,
        date: today,
        cycle_id: cycleId,
        cycle_day: cycleDay,
        ...payload,
      };

      const { data, error } = await supabase
        .from("daily_logs")
        .upsert(upsertPayload, { onConflict: "user_id,date" })
        .select()
        .single();

      if (error) {
        if (!isLikelyNetworkError(error)) throw error;

        const encryptedPayload = await encryptionService.encrypt(
          JSON.stringify(upsertPayload),
        );

        await enqueueSync(
          "daily_logs",
          `daily-log:${user.id}:${today}`,
          "upsert",
          encryptedPayload,
        );

        const queuedAt = new Date().toISOString();
        return {
          id: `queued-${today}`,
          user_id: user.id,
          date: today,
          cycle_day: cycleDay,
          cycle_id: cycleId,
          flow_level: payload.flow_level ?? null,
          mood: payload.mood ?? null,
          energy_level: payload.energy_level ?? null,
          symptoms: payload.symptoms ?? [],
          notes: payload.notes ?? null,
          hydration_glasses: payload.hydration_glasses ?? null,
          sleep_hours: payload.sleep_hours ?? null,
          partner_alert: payload.partner_alert ?? false,
          created_at: queuedAt,
          updated_at: queuedAt,
        } as DailyLogRow;
      }

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

    onSuccess: (saved, payload) => {
      const queuedForSync = saved.id.startsWith("queued-");
      if ((payload.symptoms?.length ?? 0) > 0) {
        trackEvent("symptom_logged", {
          symptom_count: payload.symptoms?.length ?? 0,
          queued_for_sync: queuedForSync,
        });
      }
      if ((payload.flow_level ?? 0) > 0) {
        trackEvent("period_logged", {
          source: "daily_log",
          queued_for_sync: queuedForSync,
        });
      }
      trackEvent("log_saved", { queued_for_sync: queuedForSync });
    },

    // ─── Re-sync with server ───────────────────────────────────────────────
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TODAY_LOG_KEY() });
      // Also invalidate recent logs so Insights stays up to date
      queryClient.invalidateQueries({ queryKey: DAILY_LOGS_KEY(90) });
    },
  });
}
