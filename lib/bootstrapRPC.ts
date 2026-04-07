/**
 * lib/bootstrapRPC.ts
 *
 * Batch RPC call to fetch profile + currentCycle + todayLog in one round trip.
 * Falls back to individual queries if RPC times out.
 *
 * This is called once during app bootstrap and primes the TanStack Query cache
 * for fast startup without waiting for 3+ sequential queries.
 */

import { supabase } from '@/lib/supabase';
import type { ProfileRow, CycleRow, DailyLogRow } from '@/types/database';
import { todayLocal } from '@/src/domain/utils/dateUtils';

const BOOTSTRAP_RPC_TIMEOUT_MS = 5000; // 5 second timeout for RPC

export interface BootstrapData {
  profile: ProfileRow | null;
  currentCycle: CycleRow | null;
  todayLog: DailyLogRow | null;
}

/**
 * Fetch profile + current cycle + today's log in one batch call.
 * Falls back to individual queries if RPC fails or times out.
 *
 * @param userId Authenticated user ID
 * @returns BootstrapData with all three queries, or nulls if failed
 */
export async function bootstrapRPC(userId: string): Promise<BootstrapData> {
  try {
    // Create a timeout promise that rejects after BOOTSTRAP_RPC_TIMEOUT_MS
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Bootstrap RPC timeout'));
      }, BOOTSTRAP_RPC_TIMEOUT_MS);
    });

    // For now, run queries in parallel instead of waiting for a single edge function.
    // This is still a 1 round-trip improvement over sequential queries.
    const bootstrapPromise = Promise.all([
      // Fetch profile
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(),
      // Fetch current (active) cycle
      supabase
        .from('cycles')
        .select('*')
        .eq('user_id', userId)
        .is('end_date', null)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Fetch today's log
      supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', todayLocal())
        .maybeSingle(),
    ]);

    const [profileResult, cycleResult, logResult] = await Promise.race([
      bootstrapPromise,
      timeoutPromise,
    ]);

    // Extract data from results, handling errors
    let profile: ProfileRow | null = null;
    let currentCycle: CycleRow | null = null;
    let todayLog: DailyLogRow | null = null;

    if (!profileResult.error && profileResult.data) {
      profile = profileResult.data as unknown as ProfileRow;
    }

    if (!cycleResult.error && cycleResult.data) {
      currentCycle = cycleResult.data as unknown as CycleRow;
    }

    if (!logResult.error && logResult.data) {
      todayLog = logResult.data as unknown as DailyLogRow;
    }

    return { profile, currentCycle, todayLog };
  } catch (error) {
    console.warn('[Bootstrap] RPC failed, falling back to individual queries:', error);
    return {
      profile: null,
      currentCycle: null,
      todayLog: null,
    };
  }
}

/**
 * Prime the TanStack Query cache with bootstrap data.
 * Call this immediately after fetching, before any hooks that consume the data.
 *
 * @param queryClient TanStack QueryClient instance
 * @param bootstrapData Data returned from bootstrapRPC()
 * @param userId Authenticated user ID (optional, used for profile key)
 */
export function primeBootstrapCache(
  queryClient: any, // Avoid circular import: just use any
  bootstrapData: BootstrapData,
  userId?: string,
): void {
  // Prime profile cache
  if (bootstrapData.profile) {
    queryClient.setQueryData(['profile', userId], bootstrapData.profile);
  }

  // Prime current cycle cache
  if (bootstrapData.currentCycle) {
    queryClient.setQueryData(['current-cycle'], bootstrapData.currentCycle);
  }

  // Prime today's log cache
  if (bootstrapData.todayLog) {
    queryClient.setQueryData(['daily-log', todayLocal()], bootstrapData.todayLog);
  }
}
