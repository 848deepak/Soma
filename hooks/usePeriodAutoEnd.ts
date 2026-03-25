import * as Network from "expo-network";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";

import { CURRENT_CYCLE_KEY, type DerivedCycleData } from "@/hooks/useCurrentCycle";
import { endCurrentPeriod } from "@/hooks/useCycleActions";
import { supabase } from "@/lib/supabase";
import { useAuthContext } from "@/src/context/AuthProvider";
import { trackEvent } from "@/src/services/analytics";
import { getPeriodAutoEndDays } from "@/src/services/remoteConfig";

function todayIso(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate(),
  ).padStart(2, "0")}`;
}

function isoToLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(year, month - 1, day);
}

function addDaysIso(isoDate: string, daysToAdd: number): string {
  const date = isoToLocalDate(isoDate);
  date.setDate(date.getDate() + daysToAdd);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function diffDaysInclusive(startIso: string, endIso: string): number {
  const start = isoToLocalDate(startIso);
  const end = isoToLocalDate(endIso);
  const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

export function usePeriodAutoEnd(): void {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const isRunningRef = useRef(false);

  const runAutoEndCheck = useCallback(async () => {
    if (!user || isRunningRef.current) {
      return;
    }

    isRunningRef.current = true;
    try {
      const { data: activeCycle, error } = await supabase
        .from("cycles")
        .select("id,start_date")
        .eq("user_id", user.id)
        .is("end_date", null)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !activeCycle) {
        return;
      }

      const autoEndDays = await getPeriodAutoEndDays();
      const activeDays = diffDaysInclusive(activeCycle.start_date, todayIso());

      if (activeDays < autoEndDays) {
        return;
      }

      const autoEndDate = addDaysIso(activeCycle.start_date, autoEndDays - 1);

      const cachedCycle = queryClient.getQueryData<DerivedCycleData | null>(
        CURRENT_CYCLE_KEY,
      )?.cycle;

      const result = await endCurrentPeriod({
        userId: user.id,
        endDate: autoEndDate,
        fallbackCycle: cachedCycle
          ? { id: cachedCycle.id, start_date: cachedCycle.start_date }
          : { id: activeCycle.id, start_date: activeCycle.start_date },
      });

      trackEvent("period_auto_ended", {
        threshold_days: autoEndDays,
        active_days: activeDays,
        queued_for_sync: result.queued,
      });

      queryClient.invalidateQueries({ queryKey: CURRENT_CYCLE_KEY });
      queryClient.invalidateQueries({ queryKey: ["cycle-history"] });
    } catch (error) {
      console.warn("[AutoEnd] Failed to auto-end period:", error);
    } finally {
      isRunningRef.current = false;
    }
  }, [queryClient, user]);

  useEffect(() => {
    void runAutoEndCheck();
  }, [runAutoEndCheck]);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void runAutoEndCheck();
      }
    });

    const networkSubscription = Network.addNetworkStateListener((state) => {
      const connected = Boolean(state.isConnected && state.isInternetReachable);
      if (connected) {
        void runAutoEndCheck();
      }
    });

    return () => {
      appStateSubscription.remove();
      networkSubscription.remove();
    };
  }, [runAutoEndCheck]);
}
