/**
 * src/components/PartnerView.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Read-only display of a linked partner's health data.
 *
 * Data comes from the partner_visible_logs VIEW which enforces privacy at the
 * database level – fields that the partner chose not to share arrive as null /
 * empty and are simply hidden here.
 *
 * Realtime: the parent hook (usePartnerLogs) handles the Supabase channel
 * subscription + 30-second polling; this component is purely presentational.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { View } from 'react-native';

import { Typography } from '@/src/components/ui/Typography';
import { usePartnerLogs } from '@/hooks/usePartnerLogs';
import type { FlowLevel } from '@/types/database';

// ── Helpers ──────────────────────────────────────────────────────────────────

const PHASE_LABEL: Record<string, string> = {
  menstrual: 'Menstrual Phase',
  follicular: 'Follicular Phase',
  ovulation: 'Ovulation Window',
  luteal: 'Luteal Phase',
};

/** Returns a Tailwind bg class scaled to flow intensity. */
function flowDotClass(level: FlowLevel | null): string {
  if (!level) return 'bg-gray-200 dark:bg-gray-700';
  if (level === 1) return 'bg-somaBlush/40 dark:bg-darkSecondary/40';
  if (level === 2) return 'bg-somaBlush dark:bg-darkSecondary';
  return 'bg-somaBlush dark:bg-darkSecondary opacity-80';
}

/** Format ISO date to short label: "Mon 3" */
function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en', { weekday: 'short', day: 'numeric' });
}

// ── Component ────────────────────────────────────────────────────────────────

export function PartnerView() {
  const { data: logs = [], isLoading } = usePartnerLogs(true);

  const today = logs[0] ?? null;
  const last7 = logs.slice(0, 7);

  // Determine which fields are visible (non-null means permission granted)
  const showFertility = today?.cycle_phase != null;
  const showMood = today?.mood != null;
  const showSymptoms = (today?.symptoms?.length ?? 0) > 0;
  const hasAlert = today?.partner_alert === true;
  const hasAnyData = today != null;

  if (isLoading) {
    return (
      <View className="mt-4 rounded-[28px] border border-white/70 bg-surface/80 p-5 dark:border-darkBorder dark:bg-darkSurface">
        <View className="flex-row items-center justify-between">
          <Typography className="text-base font-semibold text-textPrimary dark:text-darkTextPrimary">
            Partner's Day
          </Typography>
          <View className="flex-row items-center gap-2">
            <View className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
            <Typography variant="helper" className="text-somaMauve dark:text-darkTextSecondary">
              Loading…
            </Typography>
          </View>
        </View>
      </View>
    );
  }

  if (!hasAnyData) {
    return (
      <View className="mt-4 rounded-[28px] border border-white/70 bg-surface/80 p-5 dark:border-darkBorder dark:bg-darkSurface">
        <Typography className="text-base font-semibold text-textPrimary dark:text-darkTextPrimary">
          Partner's Day
        </Typography>
        <View className="mt-3 items-center py-4">
          <Typography variant="helper" className="text-center text-somaMauve dark:text-darkTextSecondary">
            No data yet. Your partner hasn't logged today.
          </Typography>
        </View>
      </View>
    );
  }

  return (
    <View className="mt-4 rounded-[28px] border border-white/70 bg-surface/80 p-5 shadow-soft dark:border-darkBorder dark:bg-darkSurface">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between">
        <Typography className="text-base font-semibold text-textPrimary dark:text-darkTextPrimary">
          Partner's Day
        </Typography>
        {/* Live indicator */}
        <View className="flex-row items-center gap-1.5">
          <View className="h-2 w-2 rounded-full bg-green-400" />
          <Typography variant="helper" className="text-somaMauve dark:text-darkTextSecondary">
            Live
          </Typography>
        </View>
      </View>

      {/* ── Partner Alert ────────────────────────────────────────────────── */}
      {hasAlert && (
        <View className="mt-3 rounded-2xl border border-somaBlush/40 bg-somaBlush/20 px-4 py-3 dark:border-darkSecondary/40 dark:bg-darkSecondary/20">
          <Typography className="text-sm font-semibold text-somaMauve dark:text-darkTextPrimary">
            Partner sent a support alert today
          </Typography>
        </View>
      )}

      {/* ── Fertility / Phase ────────────────────────────────────────────── */}
      {showFertility && (
        <View className="mt-3 flex-row items-center gap-3">
          <View className="rounded-2xl bg-somaGlow/80 px-4 py-2 dark:bg-darkCard">
            <Typography className="text-sm font-semibold text-textPrimary dark:text-darkTextPrimary">
              Day {today.cycle_day ?? '—'}
            </Typography>
          </View>
          <View className="flex-1 rounded-2xl bg-somaGlow/60 px-4 py-2 dark:bg-darkCard">
            <Typography className="text-sm font-medium text-textPrimary dark:text-darkTextPrimary">
              {PHASE_LABEL[today.cycle_phase!] ?? today.cycle_phase}
            </Typography>
          </View>
        </View>
      )}

      {/* ── Mood ─────────────────────────────────────────────────────────── */}
      {showMood && (
        <View className="mt-3 flex-row items-center gap-2">
          <Typography variant="helper" className="text-somaMauve dark:text-darkTextSecondary">
            Feeling
          </Typography>
          <View className="rounded-full bg-somaMauve/20 px-3 py-1 dark:bg-darkSecondary/30">
            <Typography className="text-sm font-medium text-textPrimary dark:text-darkTextPrimary">
              {today.mood}
            </Typography>
          </View>
        </View>
      )}

      {/* ── Symptoms ─────────────────────────────────────────────────────── */}
      {showSymptoms && (
        <View className="mt-3">
          <Typography variant="helper" className="mb-2 text-somaMauve dark:text-darkTextSecondary">
            Symptoms today
          </Typography>
          <View className="flex-row flex-wrap gap-2">
            {today.symptoms.map((s) => (
              <View
                key={s}
                className="rounded-full border border-somaMauve/30 bg-somaMauve/15 px-3 py-1 dark:border-darkSecondary/40 dark:bg-darkSecondary/20">
                <Typography className="text-xs font-medium text-textPrimary dark:text-darkTextPrimary">
                  {s}
                </Typography>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── 7-day activity strip ─────────────────────────────────────────── */}
      {last7.length > 0 && (
        <View className="mt-4">
          <Typography variant="helper" className="mb-2 text-somaMauve dark:text-darkTextSecondary">
            Recent 7 days
          </Typography>
          <View className="flex-row justify-between">
            {last7.map((log, i) => (
              <View key={`${log.date}-${i}`} className="items-center">
                <View className={`h-3 w-3 rounded-full ${flowDotClass(log.flow_level)}`} />
                <Typography variant="helper" className="mt-1 text-[9px] text-somaMauve dark:text-darkTextSecondary">
                  {formatDateLabel(log.date)}
                </Typography>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
