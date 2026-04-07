/**
 * src/platform/supabase/adapters/cycleAdapter.ts
 * Centralized, typed adapter for cycle and daily log operations.
 * Single source of truth for cycle/daily_logs Supabase queries.
 *
 * SECURITY: All mutations validate input before calling Supabase.
 * RLS policies are the last line of defense.
 */
import { supabase } from "@/lib/supabase";
import type { CycleRow, DailyLogRow, DailyLogInsert } from "@/types/database";
import { validateDailyLog } from "@/src/domain/validators";

export const cycleAdapter = {
  /**
   * Fetch the active (open) cycle for a user.
   * Returns the most recent cycle where end_date is null.
   */
  getCurrentCycle: async (userId: string) => {
    return supabase
      .from("cycles")
      .select("*")
      .eq("user_id", userId)
      .is("end_date", null)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle<CycleRow>();
  },

  /**
   * Fetch N most recent cycles for a user (used by history/insights).
   */
  getCycleHistory: async (userId: string, limit = 8) => {
    return supabase
      .from("cycles")
      .select("*")
      .eq("user_id", userId)
      .order("start_date", { ascending: false })
      .limit(limit)
      .then((result) => ({
        ...result,
        data: (result.data ?? []) as CycleRow[],
      }));
  },

  /**
   * Fetch daily logs within a date range (for scoped calendar queries).
   */
  getDailyLogs: async (
    userId: string,
    fromDate: string,
    toDate: string,
    limit?: number,
  ) => {
    let query = supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("date", fromDate)
      .lte("date", toDate)
      .order("date", { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    return query.then((result) => ({
      ...result,
      data: (result.data ?? []) as DailyLogRow[],
    }));
  },

  /**
   * Fetch today's daily log for a user.
   */
  getTodayLog: async (userId: string, date: string) => {
    return supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle<DailyLogRow>();
  },

  /**
   * Upsert a daily log (insert or update).
   * Conflicts on user_id + date combination.
   *
   * SECURITY: Validates input before mutations. If validation fails,
   * returns an error object that matches the Supabase response shape.
   */
  upsertLog: async (log: DailyLogInsert) => {
    // Validate before mutation (first line of defense)
    const validation = validateDailyLog(log);
    if (!validation.valid) {
      return {
        data: null,
        error: {
          message: validation.reason || "Validation failed",
          details: validation.details,
          code: "validation_failed",
          status: 400,
        },
        status: 400,
        statusText: "Validation Error",
      };
    }

    return supabase
      .from("daily_logs")
      .upsert(log, { onConflict: "user_id,date" })
      .select()
      .single<DailyLogRow>();
  },

  /**
   * Fetch recent N daily logs (for Insights / Calendar screens).
   */
  getDailyLogsRecent: async (userId: string, limit = 90) => {
    return supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(limit)
      .then((result) => ({
        ...result,
        data: (result.data ?? []) as DailyLogRow[],
      }));
  },
};
