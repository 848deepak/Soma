import { useMutation, useQueryClient } from "@tanstack/react-query";

import { CURRENT_CYCLE_KEY } from "@/hooks/useCurrentCycle";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/src/services/analytics";

function todayIso(): string {
  return new Date().toISOString().split("T")[0]!;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export type PeriodRangeInput = { startDate: string; endDate?: string };

export async function logPeriodRangeAction({
  startDate,
  endDate,
}: PeriodRangeInput): Promise<{ hasEndDate: boolean }> {
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

  if (activeError) throw activeError;

  if (activeCycle) {
    if (!endDate) {
      throw new Error(
        "You already have an active period. Add an end date or end the current period first.",
      );
    }

    const cycleLength = diffDaysInclusive(activeCycle.start_date, endDate);

    const { error: updateError } = await supabase
      .from("cycles")
      .update({ end_date: endDate, cycle_length: cycleLength })
      .eq("id", activeCycle.id)
      .eq("user_id", user.id);

    if (updateError) throw updateError;
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
    if (insertError) throw insertError;
  }

  trackEvent("period_logged", {
    source: "period_modal",
    has_end_date: Boolean(endDate),
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
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Not authenticated");
      }

      const { data: activeCycle, error: fetchError } = await supabase
        .from("cycles")
        .select("id,start_date")
        .eq("user_id", user.id)
        .is("end_date", null)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!activeCycle) {
        throw new Error("No active period to end.");
      }

      const endDate = todayIso();
      const cycleLength = diffDaysInclusive(activeCycle.start_date, endDate);

      const { error: updateError } = await supabase
        .from("cycles")
        .update({
          end_date: endDate,
          cycle_length: cycleLength,
        })
        .eq("id", activeCycle.id)
        .eq("user_id", user.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      trackEvent("cycle_ended");
      queryClient.invalidateQueries({ queryKey: CURRENT_CYCLE_KEY });
      queryClient.invalidateQueries({ queryKey: ["cycle-history"] });
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
