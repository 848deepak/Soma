/**
 * src/lib/queryKeys.ts
 *
 * Centralized registry for all TanStack Query query keys.
 * Ensures consistency across hooks, cache priming, dehydration, and persistence.
 *
 * Usage:
 *   import { QUERY_KEYS } from '@/src/lib/queryKeys';
 *   const query = useQuery({
 *     queryKey: QUERY_KEYS.profile(userId),
 *     queryFn: () => fetchProfile(userId),
 *   });
 */

export const QUERY_KEYS = {
  // ─── Profile & Auth ────────────────────────────────────────────────────
  profile: (userId: string) => ['profile', userId] as const,
  notificationPreferences: () => ['notification_preferences'] as const,

  // ─── Current Cycle (active/open cycle) ─────────────────────────────────
  currentCycle: () => ['current-cycle'] as const,

  // ─── Daily Logs ───────────────────────────────────────────────────────
  dailyLog: (date: string) => ['daily-log', date] as const,
  dailyLogs: (limit: number) => ['daily-logs', limit] as const,
  dailyLogsByDateRange: (from: string, to: string) =>
    ['daily-logs-range', from, to] as const,

  // ─── Cycle History & Actions ──────────────────────────────────────────
  cycleHistory: (limit: number = 12) => ['cycle-history', limit] as const,

  // ─── Partner & Care Circle ────────────────────────────────────────────
  partners: () => ['partners'] as const,
  partner: (partnerId: string) => ['partner', partnerId] as const,
  careCircle: () => ['care-circle'] as const,
  pendingConnections: () => ['pending-connections'] as const,

  // ─── Smart Events & Insights ──────────────────────────────────────────
  smartEvents: () => ['smart-events'] as const,
  insights: (days: number = 90) => ['insights', days] as const,
} as const;
