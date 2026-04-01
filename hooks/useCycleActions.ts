import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { DerivedCycleData } from "@/hooks/useCurrentCycle";
import { CURRENT_CYCLE_KEY } from "@/hooks/useCurrentCycle";
import { supabase } from "@/lib/supabase";
import { enqueueSync } from "@/src/database/localDB";
import { trackEvent } from "@/src/services/analytics";
import { encryptionService } from "@/src/services/encryptionService";

function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export type PeriodRangeInput = { startDate: string; endDate?: string };
type PeriodRangeInputWithFallback = PeriodRangeInput & {
  fallbackActiveCycle?: ActiveCycleLike | null;
};

export async function logPeriodRangeAction({
  startDate,
  endDate,
  fallbackActiveCycle,
}: PeriodRangeInputWithFallback): Promise<{ hasEndDate: boolean }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  if (!isIsoDate(startDate)) {
    throw new Error("Start date must be in YYYY-MM-DD format.");
  }

  if (endDate && !isIsoDate(endDate)) {
    throw new Error("End date must be in YYYY-MM-DD format.");
  }

  if (endDate && endDate < startDate) {
    throw new Error("End date cannot be before start date.");
  }

  const { data: activeCycle, error: activeError } = await supabase
    .from("cycles")
    .select("id,start_date")
    .eq("user_id", user.id)
    .is("end_date", null)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  let resolvedActiveCycle = activeCycle as ActiveCycleLike | null;
  if (activeError) {
    if (!fallbackActiveCycle || !isLikelyNetworkError(activeError)) {
      throw activeError;
    }
    resolvedActiveCycle = fallbackActiveCycle;
  }

  let queuedForSync = false;

  if (resolvedActiveCycle) {
    if (!endDate) {
      throw new Error(
        "You already have an active period. Add an end date or end the current period first.",
      );
    }

    const cycleLength = diffDaysInclusive(resolvedActiveCycle.start_date, endDate);

    const { error: updateError } = await supabase
      .from("cycles")
      .update({ end_date: endDate, cycle_length: cycleLength })
      .eq("id", resolvedActiveCycle.id)
      .eq("user_id", user.id);

    if (updateError) {
      if (!isLikelyNetworkError(updateError)) throw updateError;

      const encryptedPayload = await encryptionService.encrypt(
        JSON.stringify({
          id: resolvedActiveCycle.id,
          user_id: user.id,
          start_date: resolvedActiveCycle.start_date,
          end_date: endDate,
          cycle_length: cycleLength,
        }),
      );

      await enqueueSync("cycles", resolvedActiveCycle.id, "upsert", encryptedPayload);
      queuedForSync = true;
    }
  } else {
    const payload: {
      user_id: string;
      start_date: string;
      current_phase: "menstrual";
      end_date?: string;
      cycle_length?: number;
    } = {
      user_id: user.id,
      start_date: startDate,
      current_phase: "menstrual",
    };

    if (endDate) {
      payload.end_date = endDate;
      payload.cycle_length = diffDaysInclusive(startDate, endDate);
    }

    const { error: insertError } = await supabase
      .from("cycles")
      .insert(payload);
    if (insertError) {
      if (!isLikelyNetworkError(insertError)) throw insertError;

      const encryptedPayload = await encryptionService.encrypt(
        JSON.stringify(payload),
      );

      await enqueueSync(
        "cycles",
        `cycle:${user.id}:${startDate}`,
        "upsert",
        encryptedPayload,
      );
      queuedForSync = true;
    }
  }

  trackEvent("period_logged", {
    source: "period_modal",
    has_end_date: Boolean(endDate),
    queued_for_sync: queuedForSync,
  });

  return { hasEndDate: Boolean(endDate) };
}

function diffDaysInclusive(startIso: string, endIso: string): number {
  const start = new Date(startIso);
  const end = new Date(endIso);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diff = Math.floor(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(1, diff + 1);
}

type ActiveCycleLike = { id: string; start_date: string };

export type ResetPredictionsInput = {
  cycleLength: number;
  periodLength: number;
};

type EndCurrentPeriodInput = {
  userId: string;
  endDate?: string;
  fallbackCycle?: ActiveCycleLike | null;
};

const END_PERIOD_FETCH_RETRIES = 2;
const END_PERIOD_FETCH_RETRY_DELAY_MS = 120;

export type EndCurrentPeriodResult = {
  cycleId: string;
  startDate: string;
  endDate: string;
  cycleLength: number;
  queued: boolean;
};

function isLikelyNetworkError(error: unknown): boolean {
  const baseMessage = error instanceof Error ? error.message : String(error);
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: number }).status)
      : null;
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: string }).code ?? "")
      : "";
  const message = `${baseMessage} ${code}`;
  const normalized = message.toLowerCase();

  if (status != null && (status === 408 || status === 429 || status >= 500)) {
    return true;
  }

  return (
    normalized.includes("network") ||
    normalized.includes("fetch") ||
    normalized.includes("offline") ||
    normalized.includes("timed out") ||
    normalized.includes("timeout") ||
    normalized.includes("connection") ||
    normalized.includes("ecconn") ||
    normalized.includes("temporar")
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const value = String((error as { message?: string }).message ?? "").trim();
    if (value) {
      return value;
    }
  }

  return fallback;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchActiveCycleForEnd(userId: string): Promise<{
  data: ActiveCycleLike | null;
  error: unknown;
}> {
  let lastData: ActiveCycleLike | null = null;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= END_PERIOD_FETCH_RETRIES; attempt += 1) {
    const { data, error } = await supabase
      .from("cycles")
      .select("id,start_date")
      .eq("user_id", userId)
      .is("end_date", null)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    lastData = (data as ActiveCycleLike | null) ?? null;
    lastError = error;

    if (!error) {
      return { data: lastData, error: null };
    }

    if (!isLikelyNetworkError(error) || attempt >= END_PERIOD_FETCH_RETRIES) {
      return { data: lastData, error };
    }

    await delay(END_PERIOD_FETCH_RETRY_DELAY_MS);
  }

  return { data: lastData, error: lastError };
}

function addDaysIso(startIso: string, days: number): string {
  const [year, month, day] = startIso
    .split("-")
    .map(Number) as [number, number, number];
  const start = new Date(year, month - 1, day);
  start.setDate(start.getDate() + days);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
}

function computePredictions(
  startDateIso: string,
  cycleLength: number,
  periodLength: number,
): { predicted_ovulation: string; predicted_next_cycle: string } {
  const ovulationDay = Math.max(periodLength + 2, cycleLength - 14);
  return {
    predicted_ovulation: addDaysIso(startDateIso, ovulationDay - 1),
    predicted_next_cycle: addDaysIso(startDateIso, cycleLength),
  };
}

export async function endCurrentPeriod({
  userId,
  endDate,
  fallbackCycle,
}: EndCurrentPeriodInput): Promise<EndCurrentPeriodResult> {
  // Always fetch fresh cycle data from backend with bounded retry for
  // transient network blips before relying on local fallback.
  const { data: activeCycle, error: fetchError } =
    await fetchActiveCycleForEnd(userId);

  // IMPROVED: Better error handling with detailed logging
  if (fetchError) {
    if (__DEV__) {
      console.error("[EndCycle] Fetch error:", {
        message: getErrorMessage(fetchError, "unknown fetch error"),
        code: (fetchError as any).code,
        status: (fetchError as any).status,
      });
    }
    if (!fallbackCycle || !isLikelyNetworkError(fetchError)) {
      throw new Error(
        `Database error: ${getErrorMessage(fetchError, "Could not fetch active period")}`,
      );
    }
  }

  // FIX: Use fetched cycle if available, otherwise fallback
  const resolvedCycle = activeCycle ?? fallbackCycle ?? null;

  if (!resolvedCycle) {
    const errorMsg =
      "No active period to end. Start a new period first, or check if your period is already ended.";
    if (__DEV__) {
      console.error("[EndCycle]", {
        fetchedCycle: Boolean(activeCycle),
        fallbackCycle: Boolean(fallbackCycle),
        error: errorMsg,
      });
    }
    throw new Error(errorMsg);
  }

  // SAFETY: Basic validation of resolved cycle
  if (!resolvedCycle.id || !resolvedCycle.start_date) {
    throw new Error(
      "Invalid cycle data: missing id or start_date. Please restart your period.",
    );
  }

  // IMPROVED: Validate start_date format and value
  if (!isIsoDate(resolvedCycle.start_date)) {
    throw new Error(
      `Invalid start date format: "${resolvedCycle.start_date}". Expected YYYY-MM-DD.`,
    );
  }

  const resolvedEndDate = endDate ?? todayIso();

  // IMPROVED: Better end date validation with helpful error
  if (!isIsoDate(resolvedEndDate)) {
    throw new Error(
      `Invalid end date format: "${resolvedEndDate}". Expected YYYY-MM-DD.`,
    );
  }

  if (resolvedEndDate < resolvedCycle.start_date) {
    throw new Error(
      `Cannot end period on ${resolvedEndDate} because it started on ${resolvedCycle.start_date}. End date must be on or after the start date.`,
    );
  }

  const cycleLength = diffDaysInclusive(
    resolvedCycle.start_date,
    resolvedEndDate,
  );

  // Developer logging for debugging
  if (__DEV__) {
    console.log("[EndCycle] Attempting to end period:", {
      cycleId: resolvedCycle.id,
      startDate: resolvedCycle.start_date,
      endDate: resolvedEndDate,
      cycleLength,
    });
  }

  const { error: updateError } = await supabase
    .from("cycles")
    .update({
      end_date: resolvedEndDate,
      cycle_length: cycleLength,
    })
    .eq("id", resolvedCycle.id)
    .eq("user_id", userId);

  if (updateError) {
    if (__DEV__) {
      console.error("[EndCycle] Update error:", {
        message: updateError.message,
        code: (updateError as any).code,
        status: (updateError as any).status,
      });
    }

    if (!isLikelyNetworkError(updateError)) {
      throw new Error(
        `Failed to save: ${updateError.message || "Database error"}`,
      );
    }

    // FALLBACK: Queue for sync if network error
    try {
      const encryptedPayload = await encryptionService.encrypt(
        JSON.stringify({
          id: resolvedCycle.id,
          user_id: userId,
          start_date: resolvedCycle.start_date,
          end_date: resolvedEndDate,
          cycle_length: cycleLength,
        }),
      );

      await enqueueSync("cycles", resolvedCycle.id, "upsert", encryptedPayload);

      if (__DEV__) {
        console.log("[EndCycle] Queued for sync due to network error");
      }

      return {
        cycleId: resolvedCycle.id,
        startDate: resolvedCycle.start_date,
        endDate: resolvedEndDate,
        cycleLength,
        queued: true,
      };
    } catch (syncError) {
      if (__DEV__) {
        console.error("[EndCycle] Failed to queue sync:", syncError);
      }
      throw new Error(
        "Network error: Period saved offline and will sync when online.",
      );
    }
  }

  if (__DEV__) {
    console.log("[EndCycle] Successfully ended period:", {
      cycleId: resolvedCycle.id,
      endDate: resolvedEndDate,
    });
  }

  return {
    cycleId: resolvedCycle.id,
    startDate: resolvedCycle.start_date,
    endDate: resolvedEndDate,
    cycleLength,
    queued: false,
  };
}

export function useStartNewCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Not authenticated");
      }

      const { data: activeCycle, error: activeError } = await supabase
        .from("cycles")
        .select("id")
        .eq("user_id", user.id)
        .is("end_date", null)
        .maybeSingle();

      if (activeError) throw activeError;
      if (activeCycle) {
        throw new Error("You already have an active period. End it first.");
      }

      const { error } = await supabase.from("cycles").insert({
        user_id: user.id,
        start_date: todayIso(),
        current_phase: "menstrual",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      trackEvent("cycle_started");
      queryClient.invalidateQueries({ queryKey: CURRENT_CYCLE_KEY });
      queryClient.invalidateQueries({ queryKey: ["cycle-history"] });
    },
  });
}

export function useEndCurrentCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<EndCurrentPeriodResult> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Not authenticated");
      }

      // Keep cached cycle as a fallback for transient fetch/network issues.
      // endCurrentPeriod() performs the authoritative fresh backend fetch.
      let cachedCycle: { id: string; start_date: string } | undefined;
      const cached = queryClient.getQueryData<DerivedCycleData | null>(
        CURRENT_CYCLE_KEY,
      );
      if (cached?.cycle?.id && cached.cycle.start_date) {
        cachedCycle = {
          id: cached.cycle.id,
          start_date: cached.cycle.start_date,
        };
      }

      if (__DEV__) {
        console.log("[UseEndCycle] Attempting to end period with:", {
          hasCachedCycle: Boolean(cachedCycle),
          cycleId: cachedCycle?.id,
        });
      }

      return endCurrentPeriod({
        userId: user.id,
        fallbackCycle: cachedCycle ?? null,
      });
    },
    onSuccess: (result) => {
      trackEvent("cycle_ended", { queued_for_sync: result.queued });
      queryClient.invalidateQueries({ queryKey: CURRENT_CYCLE_KEY });
      queryClient.invalidateQueries({ queryKey: ["cycle-history"] });
    },
    onError: (error: Error) => {
      if (__DEV__) {
        console.error("[UseEndCycle] Mutation error:", error.message);
      }
    },
  });
}

export function useDeleteAllData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Not authenticated");
      }

      const { error: logsError } = await supabase
        .from("daily_logs")
        .delete()
        .eq("user_id", user.id);
      if (logsError) throw logsError;

      const { error: cyclesError } = await supabase
        .from("cycles")
        .delete()
        .eq("user_id", user.id);
      if (cyclesError) throw cyclesError;

      const { error: partnersError } = await supabase
        .from("partners")
        .delete()
        .eq("user_id", user.id);
      if (partnersError) throw partnersError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          is_onboarded: false,
          cycle_length_average: 28,
          period_duration_average: 5,
        })
        .eq("id", user.id);
      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: CURRENT_CYCLE_KEY });
      queryClient.invalidateQueries({ queryKey: ["cycle-history"] });
      queryClient.invalidateQueries({ queryKey: ["daily-log"] });
      queryClient.invalidateQueries({ queryKey: ["daily-logs"] });
      queryClient.invalidateQueries({ queryKey: ["partner"] });
      queryClient.invalidateQueries({ queryKey: ["partner-logs"] });
    },
  });
}

export async function resetPredictionsAction({
  cycleLength,
  periodLength,
}: ResetPredictionsInput): Promise<{ updatedCycles: number }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  if (
    !Number.isFinite(cycleLength) ||
    cycleLength < 15 ||
    cycleLength > 60
  ) {
    throw new Error("Cycle length must be between 15 and 60 days.");
  }

  if (
    !Number.isFinite(periodLength) ||
    periodLength < 1 ||
    periodLength > 15
  ) {
    throw new Error("Period duration must be between 1 and 15 days.");
  }

  const { data: activeCycles, error: fetchError } = await supabase
    .from("cycles")
    .select("id,start_date")
    .eq("user_id", user.id)
    .is("end_date", null)
    .order("start_date", { ascending: false });

  if (fetchError) {
    throw fetchError;
  }

  const cycles = (activeCycles ?? []) as Array<{ id: string; start_date: string }>;
  if (cycles.length === 0) {
    return { updatedCycles: 0 };
  }

  await Promise.all(
    cycles.map(async (cycle) => {
      const prediction = computePredictions(
        cycle.start_date,
        cycleLength,
        periodLength,
      );

      const { error: updateError } = await supabase
        .from("cycles")
        .update(prediction)
        .eq("id", cycle.id)
        .eq("user_id", user.id);

      if (updateError) {
        throw updateError;
      }
    }),
  );

  trackEvent("predictions_reset", {
    cycle_length: cycleLength,
    period_length: periodLength,
    updated_cycles: cycles.length,
  });

  return { updatedCycles: cycles.length };
}

export function useResetPredictions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resetPredictionsAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRENT_CYCLE_KEY });
      queryClient.invalidateQueries({ queryKey: ["cycle-history"] });
      queryClient.invalidateQueries({ queryKey: ["daily-log"] });
      queryClient.invalidateQueries({ queryKey: ["daily-logs"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useLogPeriodRange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logPeriodRangeAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRENT_CYCLE_KEY });
      queryClient.invalidateQueries({ queryKey: ["cycle-history"] });
      queryClient.invalidateQueries({ queryKey: ["daily-log"] });
      queryClient.invalidateQueries({ queryKey: ["daily-logs"] });
    },
  });
}
