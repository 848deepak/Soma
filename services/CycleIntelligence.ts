/**
 * services/CycleIntelligence.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure, side-effect-free functions that derive insights from raw Supabase data.
 * No network calls – all inputs are already-fetched TanStack Query results.
 *
 * Public functions:
 *   buildCycleHistoryBars    – bar-chart data for the Cycle History card
 *   buildSymptomStats        – weighted tag-cloud data for the Symptom Patterns card
 *   buildTrendInsight        – smart natural-language summary for the Trend Insight card
 *   predictFertileWindow     – fertile window dates from personalized cycle average
 *   estimateOvulation        – ovulation date + confidence from cycle history
 *   assessPMSRisk            – PMS risk level from recent luteal-phase logs
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { CompletedCycle, DailyLogRow, SymptomOption } from '@/types/database';

// ─────────────────────────────────────────────────────────────────────────────
// Return types
// ─────────────────────────────────────────────────────────────────────────────

/** One bar in the Cycle History chart. */
export interface CycleHistoryBar {
  /** Short month label: "Jan", "Feb", etc. */
  month: string;
  /** Cycle length in days — used to derive bar height in the UI. */
  length: number;
}

/** One entry in the Symptom Patterns tag cloud. */
export interface SymptomStat {
  name: SymptomOption;
  /** Absolute log count – shown as a tooltip or accessible label. */
  count: number;
  /** Percentage of logged days (0–100). Controls highlight threshold. */
  frequency: number;
  /** Font size 12–20 scaled by frequency. */
  size: number;
}

/** Natural-language insight surfaced in the Trend Insight card. */
export interface TrendInsight {
  title: string;
  body: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// ─────────────────────────────────────────────────────────────────────────────
// buildCycleHistoryBars
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts up to 6 completed cycles into bar-chart data sorted oldest → newest.
 * Cycles without a recorded cycle_length are skipped.
 */
export function buildCycleHistoryBars(cycles: CompletedCycle[]): CycleHistoryBar[] {
  return [...cycles]
    .filter((c) => c.cycle_length != null)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(-6)
    .map((c) => {
      const month = MONTH_LABELS[new Date(c.start_date).getUTCMonth()]!;
      return { month, length: c.cycle_length };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// buildSymptomStats
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Counts symptom occurrences across all provided logs and returns the top 8
 * by frequency, scaled for a dynamic tag cloud.
 *
 * frequency = (symptom days / total log days) × 100
 * size      = 12 + floor(frequency / 100 × 8)  →  range 12–20 px
 */
export function buildSymptomStats(logs: DailyLogRow[]): SymptomStat[] {
  if (logs.length === 0) return [];

  const counts = new Map<SymptomOption, number>();
  for (const log of logs) {
    for (const s of log.symptoms ?? []) {
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
  }
  if (counts.size === 0) return [];

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => {
      const frequency = Math.round((count / logs.length) * 100);
      const size = 12 + Math.floor((frequency / 100) * 8);
      return { name, count, frequency, size };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// buildTrendInsight
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a plain-English cycle trend summary from completed cycle history.
 *
 * Thresholds:
 *   stdDev ≤ 2   → "Very Regular"   (clinically normal range)
 *   stdDev ≤ 4   → "Mostly Regular"
 *   last vs prev +3 days → "Cycle Lengthening"
 *   last vs prev −3 days → "Cycle Shortening"
 *   otherwise    → "Within Range"
 */
export function buildTrendInsight(
  cycles: CompletedCycle[],
  _logs: DailyLogRow[],
): TrendInsight {
  const valid = cycles.filter((c) => c.cycle_length != null);

  if (valid.length < 2) {
    return {
      title: 'Keep Logging',
      body: 'Complete a few more cycles to unlock personalized trend insights.',
    };
  }

  const sorted = [...valid].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const lengths = sorted.map((c) => c.cycle_length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const sd = stdDev(lengths);
  const last = lengths[lengths.length - 1]!;
  const prev = lengths[lengths.length - 2]!;
  const delta = last - prev;

  if (sd <= 2) {
    return {
      title: 'Very Regular',
      body: `Your average cycle is ${Math.round(mean)} days and has been highly consistent. That's a healthy sign of hormonal balance.`,
    };
  }

  if (sd <= 4 && Math.abs(delta) <= 3) {
    return {
      title: 'Mostly Regular',
      body: `Your cycles average ${Math.round(mean)} days with minor variation. Some fluctuation of ±3 days is completely normal.`,
    };
  }

  if (delta > 3) {
    return {
      title: 'Cycle Lengthening',
      body: `Your last cycle was ${last} days — ${delta} days longer than the previous one. Stress, sleep changes, or intense exercise can shift cycle timing.`,
    };
  }

  if (delta < -3) {
    return {
      title: 'Cycle Shortening',
      body: `Your last cycle was ${last} days — ${Math.abs(delta)} days shorter than the previous one. Diet or activity changes can cause this.`,
    };
  }

  return {
    title: 'Within Range',
    body: `Your cycles span ${Math.min(...lengths)}–${Math.max(...lengths)} days with an average of ${Math.round(mean)} days.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 9 helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the last `n` completed cycles sorted oldest → newest. */
function lastNCycles(cycles: CompletedCycle[], n: number): CompletedCycle[] {
  return [...cycles]
    .filter((c) => c.cycle_length != null && c.end_date != null)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(-n);
}

/** Returns a moving-average cycle length (simple mean of last n cycles). */
function movingAverage(cycles: CompletedCycle[], n: number): number {
  const slice = lastNCycles(cycles, n);
  if (slice.length === 0) return 28; // sensible fallback
  return slice.reduce((sum, c) => sum + c.cycle_length, 0) / slice.length;
}

/** Adds `days` to a "YYYY-MM-DD" string and returns a new "YYYY-MM-DD" string. */
function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0]!;
}

// ─────────────────────────────────────────────────────────────────────────────
// predictFertileWindow
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Predicted fertile window for the current cycle.
 *
 * Fertile window:
 *   - Starts 5 days before estimated ovulation (sperm can survive 5 days)
 *   - Ends 1 day after ovulation (egg viable ~24 hours)
 *
 * Ovulation estimate:
 *   ovulationDay = movingAverage(last 6 cycles) − 14
 *   (The luteal phase after ovulation is consistently ~14 days.)
 *
 * Returns null when not enough history exists (< 1 completed cycle).
 */
export interface FertileWindowPrediction {
  /** First day of the fertile window (5 days before ovulation). */
  windowStart: string;   // "YYYY-MM-DD"
  /** Predicted ovulation date. */
  ovulationDate: string; // "YYYY-MM-DD"
  /** Last day of the fertile window (1 day after ovulation). */
  windowEnd: string;     // "YYYY-MM-DD"
  /** Moving-average cycle length used for this prediction. */
  averageCycleLength: number;
  /** How many completed cycles contributed to the average (max 6). */
  cyclesUsed: number;
}

export interface PeriodVisualizationInput {
  month: number;
  year: number;
  periodLength: number;
  loggedPeriodDays: number[];
  predictedPeriodStartDate?: string | null;
}

export interface PeriodVisualizationDays {
  periodDays: number[];
  predictedPeriodDays: number[];
}

/**
 * Builds calendar day buckets for period visualization.
 * Logged period days are always source-of-truth and predictions never overlap them.
 */
export function derivePeriodVisualizationDays({
  month,
  year,
  periodLength,
  loggedPeriodDays,
  predictedPeriodStartDate,
}: PeriodVisualizationInput): PeriodVisualizationDays {
  const periodDays = [...new Set(loggedPeriodDays)]
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 31)
    .sort((a, b) => a - b);

  if (!predictedPeriodStartDate || periodLength <= 0) {
    return { periodDays, predictedPeriodDays: [] };
  }

  const loggedDaySet = new Set(periodDays);
  const predictedPeriodDays: number[] = [];

  for (let i = 0; i < periodLength; i += 1) {
    const predictedDate = addDays(predictedPeriodStartDate, i);
    const date = new Date(`${predictedDate}T00:00:00Z`);

    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month) {
      continue;
    }

    const day = date.getUTCDate();
    if (!loggedDaySet.has(day)) {
      predictedPeriodDays.push(day);
    }
  }

  return {
    periodDays,
    predictedPeriodDays: [...new Set(predictedPeriodDays)].sort((a, b) => a - b),
  };
}

export function predictFertileWindow(
  cycles: CompletedCycle[],
  currentCycleStartDate: string,
): FertileWindowPrediction | null {
  const recent = lastNCycles(cycles, 6);
  if (recent.length === 0) return null;

  const averageCycleLength = Math.round(movingAverage(cycles, 6));
  // Ovulation day within the cycle (1-based)
  const ovulationCycleDay = Math.max(averageCycleLength - 14, 1);

  // Convert cycle-day offsets to absolute dates (cycleDay 1 = startDate)
  const ovulationDate = addDays(currentCycleStartDate, ovulationCycleDay - 1);
  const windowStart = addDays(currentCycleStartDate, ovulationCycleDay - 6);   // 5 days before
  const windowEnd = addDays(currentCycleStartDate, ovulationCycleDay);          // 1 day after

  return {
    windowStart,
    ovulationDate,
    windowEnd,
    averageCycleLength,
    cyclesUsed: recent.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// estimateOvulation
// ─────────────────────────────────────────────────────────────────────────────

export type OvulationConfidence = 'high' | 'medium' | 'low';

/**
 * Estimated ovulation for the current cycle with a confidence rating.
 *
 * Confidence:
 *   high   – 6+ completed cycles with stdDev ≤ 2 days
 *   medium – 3+ completed cycles with stdDev ≤ 5 days
 *   low    – fewer cycles or high variability
 *
 * Returns null when no cycle history exists.
 */
export interface OvulationEstimate {
  /** Estimated ovulation date in the current cycle. */
  estimatedDate: string;   // "YYYY-MM-DD"
  /** Cycle day number on which ovulation is estimated. */
  dayNumber: number;
  /** How reliable the estimate is. */
  confidence: OvulationConfidence;
}

export function estimateOvulation(
  cycles: CompletedCycle[],
  currentCycleStartDate: string,
): OvulationEstimate | null {
  const valid = cycles.filter((c) => c.cycle_length != null && c.end_date != null);
  if (valid.length === 0) return null;

  const recent = lastNCycles(cycles, 6);
  const lengths = recent.map((c) => c.cycle_length);
  const avgLength = Math.round(movingAverage(cycles, 6));
  const sd = stdDev(lengths);

  const dayNumber = Math.max(avgLength - 14, 1);
  const estimatedDate = addDays(currentCycleStartDate, dayNumber - 1);

  let confidence: OvulationConfidence;
  if (recent.length >= 6 && sd <= 2) {
    confidence = 'high';
  } else if (recent.length >= 3 && sd <= 5) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return { estimatedDate, dayNumber, confidence };
}

// ─────────────────────────────────────────────────────────────────────────────
// assessPMSRisk
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PMS symptoms: physical and mood symptoms commonly elevated in the luteal phase.
 * Subset of SymptomOption that is clinically associated with PMS.
 */
const PMS_SYMPTOMS = new Set<SymptomOption>(['Cramps', 'Bloating', 'Moody', 'Brain Fog', 'Tender']);

export type PMSRiskLevel = 'low' | 'medium' | 'high';

/**
 * PMS risk assessment derived from luteal-phase logs.
 *
 * Score:
 *   score = (total PMS symptom occurrences) / (logs.length × PMS_SYMPTOMS.size) × 100
 *
 * Risk levels:
 *   high   – score > 60
 *   medium – score > 30
 *   low    – score ≤ 30
 *
 * The caller is responsible for passing logs from the luteal phase or the last
 * 14 days – this function is agnostic to date filtering.
 */
export interface PMSRiskAssessment {
  level: PMSRiskLevel;
  /** PMS-associated symptoms that appeared in the provided logs. */
  triggerSymptoms: SymptomOption[];
  /** Normalised 0–100 risk score. */
  score: number;
}

export function assessPMSRisk(
  _cycles: CompletedCycle[],
  recentLogs: DailyLogRow[],
): PMSRiskAssessment {
  if (recentLogs.length === 0) {
    return { level: 'low', triggerSymptoms: [], score: 0 };
  }

  const symptomCounts = new Map<SymptomOption, number>();
  let totalPmsOccurrences = 0;

  for (const log of recentLogs) {
    for (const symptom of log.symptoms ?? []) {
      if (PMS_SYMPTOMS.has(symptom)) {
        symptomCounts.set(symptom, (symptomCounts.get(symptom) ?? 0) + 1);
        totalPmsOccurrences++;
      }
    }
  }

  const maxPossible = recentLogs.length * PMS_SYMPTOMS.size;
  const score = Math.round((totalPmsOccurrences / maxPossible) * 100);

  const triggerSymptoms = [...symptomCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([s]) => s);

  const level: PMSRiskLevel = score > 60 ? 'high' : score > 30 ? 'medium' : 'low';

  return { level, triggerSymptoms, score };
}
