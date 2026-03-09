/**
 * store/useCycleStore.ts
 * Zustand store for in-memory cycle state.
 *
 * Role in Phase 2:
 *  - `hydrate()` seeds the store from Supabase on app start.
 *  - TanStack Query hooks (useCurrentCycle, useTodayLog, useSaveLog) are the
 *    reactive data layer used by screens. The store is the bridge that
 *    pre-populates the progress ring before TQ's first response arrives.
 *  - `isSaving` is still used to disable Save buttons during mutations.
 */
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import { computeCycleDay, computePhase, computeProgress, getPhaseLabel } from '@/hooks/useCurrentCycle';
import { captureException } from '@/src/services/errorTracking';
import type { CycleRow } from '@/types/database';

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

  /** Pull latest cycle + today's log from Supabase and update store state. */
  hydrate: () => Promise<void>;
};

const PHASE_INSIGHT: Record<string, { title: string; description: string }> = {
  menstrual: {
    title: 'Rest and restore.',
    description: 'Your body is working hard. Gentle movement and warm nourishment help today.',
  },
  follicular: {
    title: 'Energy is building.',
    description: 'Rising estrogen lifts your mood and focus. A great time for new projects.',
  },
  ovulation: {
    title: 'Your estrogen is peaking today.',
    description: 'You may notice a natural glow and higher energy levels. Great day for connections.',
  },
  luteal: {
    title: 'Slow down and reflect.',
    description: 'Progesterone is rising. Honour rest needs and reduce high-intensity commitments.',
  },
};

export const useCycleStore = create<CycleState>((set) => ({
  // Sensible defaults shown while Supabase loads
  cycleDay: 1,
  cycleLength: 28,
  phaseLabel: 'Cycle Phase',
  progress: 0,
  insightTitle: 'Loading…',
  insightDescription: '',
  mood: undefined,
  energy: undefined,
  isSaving: false,

  hydrate: async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch active cycle and today's log in parallel
      const today = new Date().toISOString().split('T')[0]!;

      const [cycleResult, logResult, profileResult] = await Promise.all([
        supabase.from('cycles').select('*').is('end_date', null).order('start_date', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('daily_logs').select('mood, energy_level').eq('date', today).maybeSingle(),
        supabase.from('profiles').select('cycle_length_average, period_duration_average').eq('id', user.id).maybeSingle(),
      ]);

      if (cycleResult.data) {
        const cycle = cycleResult.data as unknown as CycleRow;
        const profile = profileResult.data as unknown as { cycle_length_average: number | null; period_duration_average: number | null } | null;
        const log = logResult.data as unknown as { mood: string | null; energy_level: string | null } | null;

        const cycleLength = profile?.cycle_length_average ?? 28;
        const periodLen = profile?.period_duration_average ?? 5;
        const cycleDay = computeCycleDay(cycle.start_date);
        const phase = computePhase(cycleDay, cycleLength, periodLen);
        const insight = PHASE_INSIGHT[phase] ?? PHASE_INSIGHT.follicular!;

        set({
          cycleDay,
          cycleLength,
          phaseLabel: getPhaseLabel(phase),
          progress: computeProgress(cycleDay, cycleLength),
          insightTitle: insight.title,
          insightDescription: insight.description,
          mood: log?.mood ?? undefined,
          energy: log?.energy_level ?? undefined,
        });
      }
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)));
    }
  },
}));
