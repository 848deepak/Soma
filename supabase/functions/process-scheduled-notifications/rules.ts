export type RuleInput = {
  lastActiveAt: string | null;
  phase: 'menstrual' | 'follicular' | 'ovulation' | 'luteal' | null;
  nowIso: string;
  opensLast7Days: number;
  sentTodayCount: number;
  maxPerDay: number;
};

export type RuleDecision = {
  shouldSend: boolean;
  type?: 'behavioral_inactive' | 'behavioral_cycle_phase';
  reason?: string;
  cooldownHours?: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(iso: string | null, nowIso: string): number {
  if (!iso) return 999;
  const diff = new Date(nowIso).getTime() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / DAY_MS));
}

export function evaluateBehavioralRule(input: RuleInput): RuleDecision {
  if (input.sentTodayCount >= input.maxPerDay) {
    return { shouldSend: false, reason: 'daily_cap_reached' };
  }

  const inactiveDays = daysSince(input.lastActiveAt, input.nowIso);
  if (inactiveDays >= 3) {
    return {
      shouldSend: true,
      type: 'behavioral_inactive',
      reason: 'inactive_3_days',
      cooldownHours: 24,
    };
  }

  if (input.phase && input.opensLast7Days <= 1) {
    return {
      shouldSend: true,
      type: 'behavioral_cycle_phase',
      reason: 'low_engagement_phase_context',
      cooldownHours: 20,
    };
  }

  return { shouldSend: false, reason: 'no_behavioral_trigger' };
}
