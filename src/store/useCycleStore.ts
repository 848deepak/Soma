/**
 * store/useCycleStore.ts
 *
 * ⚠️ DEPRECATED (2026-04-07)
 *
 * This store is no longer used. All cycle data flows through TanStack Query hooks:
 *   - useCurrentCycle()
 *   - useCycleHistory()
 *   - useCycleCalendar()
 *
 * The store was originally used to bridge data before TanStack Query queries resolved,
 * but with query persistence and bootstrap RPC optimization, this is no longer necessary.
 *
 * REMOVAL TIMELINE:
 *   - v1.x (current): Import works but logs deprecation warning
 *   - v2.0: Remove completely
 *
 * DO NOT use this store for new code. Use the domain hooks instead:
 *   import { useCurrentCycle } from '@/domain/cycle';
 *   import { useCycleCalendar } from '@/domain/calendar';
 */

import { create } from "zustand";
import { logWarn } from "@/platform/monitoring/logger";

const DEPRECATION_WARNING = `
⚠️ DEPRECATION WARNING (2026-04-07):
useCycleStore is no longer used and will be removed in v2.0.
Please migrate to TanStack Query hooks:
  - useCurrentCycle() from '@/domain/cycle'
  - useCycleHistory() from '@/domain/cycle'
  - useCycleCalendar() from '@/domain/calendar'

For migration help, see: docs/MIGRATION_GUIDE.md
`;

let deprecationWarningLogged = false;

function logDeprecationWarning() {
  if (!deprecationWarningLogged) {
    logWarn('store', 'cycle_store_deprecated', {
      message: DEPRECATION_WARNING,
    });
    deprecationWarningLogged = true;
  }
}

type CycleState = {
  cycleDay: number;
  cycleLength: number;
  phaseLabel: string;
  progress: number;
  insightTitle: string;
  insightDescription: string;
  mood?: string;
  energy?: string;
  isSaving: boolean;

  /** @deprecated Use TanStack Query hooks instead */
  hydrate: () => Promise<void>;
};

export const useCycleStore = create<CycleState>((set) => {
  logDeprecationWarning();

  return {
    // Sensible defaults (placeholder values)
    cycleDay: 1,
    cycleLength: 28,
    phaseLabel: "Cycle Phase",
    progress: 0,
    insightTitle: "Loading…",
    insightDescription: "",
    mood: undefined,
    energy: undefined,
    isSaving: false,

    hydrate: async () => {
      logDeprecationWarning();
      // No-op: hydration no longer needed with TanStack Query persistence
      set({
        cycleDay: 1,
        cycleLength: 28,
        phaseLabel: "Welcome to SOMA",
        progress: 0,
        insightTitle: "Get started",
        insightDescription:
          "Track your cycle to unlock personalized insights.",
        mood: undefined,
        energy: undefined,
      });
    },
  };
});

