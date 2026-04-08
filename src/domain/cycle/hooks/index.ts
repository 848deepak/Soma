/**
 * src/domain/cycle/hooks/index.ts
 *
 * Barrel export for cycle hooks.
 * Use: import { useCurrentCycle, useCycleActions } from '@/domain/cycle/hooks';
 */

export { useCurrentCycle, CURRENT_CYCLE_KEY, computeCycleDay, computePhase, buildMiniCalendar } from './useCurrentCycle';
export type { DerivedCycleData } from './useCurrentCycle';

export {
  useStartNewCycle,
  useEndCurrentCycle,
  useDeleteAllData,
  useResetPredictions,
  useLogPeriodRange,
  logPeriodRangeAction,
  endCurrentPeriod,
  resetPredictionsAction,
} from './useCycleActions';
export type { PeriodRangeInput, ResetPredictionsInput, EndCurrentPeriodResult } from './useCycleActions';

export { useCycleHistory } from './useCycleHistory';

export { usePeriodAutoEnd } from './usePeriodAutoEnd';
