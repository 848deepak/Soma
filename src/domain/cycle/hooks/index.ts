/**
 * src/domain/cycle/hooks/index.ts
 *
 * Barrel export for cycle hooks.
 * Use: import { useCurrentCycle, useCycleActions } from '@/domain/cycle/hooks';
 */

export { useCurrentCycle, CURRENT_CYCLE_KEY, computeCycleDay, computePhase } from './useCurrentCycle';
export type { CurrentCycleQuery } from './useCurrentCycle';

export { useCycleActions } from './useCycleActions';
export type { CycleAction, CycleActionError } from './useCycleActions';

export { useCycleHistory } from './useCycleHistory';
export type { CycleHistoryQuery } from './useCycleHistory';

export { usePeriodAutoEnd } from './usePeriodAutoEnd';
