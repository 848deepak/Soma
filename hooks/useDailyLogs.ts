/**
 * hooks/useDailyLogs.ts (DEPRECATED)
 *
 * BACKWARD COMPATIBILITY SHIM - Remove after 2 weeks (target: 2026-04-21)
 *
 * New imports should use:
 *   import { useDailyLogs, useDailyLogsByDateRange } from '@/domain/calendar';
 */

export * from '../src/domain/calendar/hooks/useDailyLogs';
