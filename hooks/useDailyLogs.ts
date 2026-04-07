/**
 * hooks/useDailyLogs.ts
 * Queries daily_logs from Supabase.
 *
 * Exports:
 *   useDailyLogs(limit)  – recent N logs (used by Insights / Calendar)
 *   useDailyLogsByDateRange(from, to) – logs within date range (optimized for calendar views)
 *   useTodayLog()        – today's single log (used by Dashboard widgets + log screens)
 */
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { logDataAccess } from "@/src/services/auditService";
import type { DailyLogRow } from "@/types/database";
import { todayLocal } from "@/src/domain/utils/dateUtils";

export const DAILY_LOGS_KEY = (limit: number) => ["daily-logs", limit] as const;
export const DAILY_LOGS_DATE_RANGE_KEY = (from: string, to: string) =>
  ["daily-logs-range", from, to] as const;

/**
 * Get today's ISO date string in user's LOCAL timezone.
 * @deprecated Use todayLocal() from dateUtils instead
 */
export const todayIso = () => todayLocal();

export const TODAY_LOG_KEY = () => ["daily-log", todayLocal()] as const;

/**
 * Fetches the N most recent daily log rows for the signed-in user.
 * Used by the Insights screen and the CycleIntelligence service (Phase 3).
 */
export function useDailyLogs(limit: number = 90) {
  return useQuery<DailyLogRow[]>({
    queryKey: DAILY_LOGS_KEY(limit),
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(limit);

      if (error) throw error;
      const rows = (data ?? []) as unknown as DailyLogRow[];
      void logDataAccess("daily_logs", "view", {
        source: "useDailyLogs",
        resultCount: rows.length,
        limit,
      });
      return rows;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetches daily logs within a specific date range (optimized for calendar screens).
 * Dramatically reduces query size from 365 days to ~90 days (prev month + current + next month).
 *
 * @param fromDate ISO date string "YYYY-MM-DD" (inclusive)
 * @param toDate ISO date string "YYYY-MM-DD" (inclusive)
 */
export function useDailyLogsByDateRange(fromDate: string, toDate: string) {
  return useQuery<DailyLogRow[]>({
    queryKey: DAILY_LOGS_DATE_RANGE_KEY(fromDate, toDate),
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", fromDate)
        .lte("date", toDate)
        .order("date", { ascending: false });

      if (error) throw error;
      const rows = (data ?? []) as unknown as DailyLogRow[];
      void logDataAccess("daily_logs", "view", {
        source: "useDailyLogsByDateRange",
        resultCount: rows.length,
        fromDate,
        toDate,
      });
      return rows;
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      // Add timeout protection
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Today log query timeout"));
        }, 8000);
      });

      const logPromise = supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", todayLocal())
        .maybeSingle();

      const { data, error } = await Promise.race([logPromise, timeoutPromise]);

      if (error) throw error;
      const row = data as unknown as DailyLogRow | null;
      void logDataAccess("daily_logs", "view", {
        source: "useTodayLog",
        hasLog: !!row,
      });
      return row;
    },
    // Today's log changes when the user logs – keep stale time short
    staleTime: 60 * 1000,
    // Add retry configuration
    retry: (failureCount, error) => {
      if (error.message.includes("timeout") && failureCount >= 1) {
        return false;
      }
      return failureCount < 2;
    },
    // Don't throw errors, return null instead
    throwOnError: false,
  });
}
