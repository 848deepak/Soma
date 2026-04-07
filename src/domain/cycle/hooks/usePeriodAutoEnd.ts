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
import { todayLocal, diffDaysInclusive, addDays } from "@/src/domain/utils/dateUtils";

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
      const activeDays = diffDaysInclusive(activeCycle.start_date, todayLocal());

      if (activeDays < autoEndDays) {
        return;
      }

      const autoEndDate = addDays(activeCycle.start_date, autoEndDays - 1);

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
