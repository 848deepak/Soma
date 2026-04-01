import type { DailyLogRow } from '@/types/database';
import type { SmartLogInsights, SmartSuggestion } from '@/src/features/smartCalendar/types';

export function buildSmartSuggestions(
  logs: DailyLogRow[],
): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];

  if (logs.length === 0) {
    return suggestions;
  }

  const logsSorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const latestSeven = logsSorted.slice(-7);

  const morningEnergyCount = latestSeven.filter(
    (log) => log.energy_level === 'High',
  ).length;

  if (morningEnergyCount >= 3) {
    suggestions.push({
      id: 'habit-energy-window',
      title: 'Your energy has been high in recent logs. Add a focus block?',
      rationale: `Detected ${morningEnergyCount} high-energy check-ins in the last 7 logs`,
      suggestedStartTime: '08:00',
      suggestedEndTime: '09:00',
      confidence: 0.8,
      source: 'habit',
      tags: ['routine', 'energy'],
    });
  }

  const lowMoodLogs = latestSeven.filter(
    (log) => log.mood === 'Low' || log.mood === 'Irritable',
  );

  if (lowMoodLogs.length >= 2) {
    suggestions.push({
      id: 'mood-support-checkin',
      title: 'Your recent mood logs were low. Add a recovery block?',
      rationale: `${lowMoodLogs.length} low-mood entries in the last 7 logs`,
      suggestedStartTime: '19:00',
      suggestedEndTime: '19:30',
      confidence: 0.79,
      source: 'mood',
      tags: ['wellbeing', 'self-care'],
    });
  }

  const shortSleepLogs = latestSeven.filter((log) => (log.sleep_hours ?? 8) < 6);
  if (shortSleepLogs.length >= 2) {
    suggestions.push({
      id: 'sleep-recovery',
      title: 'Your logged sleep has been short. Block wind-down time?',
      rationale: `${shortSleepLogs.length} entries below 6h sleep in last 7 logs`,
      suggestedStartTime: '22:00',
      suggestedEndTime: '22:45',
      confidence: 0.75,
      source: 'sleep',
      tags: ['sleep', 'recovery'],
    });
  }

  const hydrationMisses = latestSeven.filter((log) => (log.hydration_glasses ?? 0) < 5);
  if (hydrationMisses.length >= 4) {
    suggestions.push({
      id: 'hydration-routine',
      title: 'Hydration has been low in recent logs. Add a reminder slot?',
      rationale: `${hydrationMisses.length} low-hydration entries in last 7 logs`,
      suggestedStartTime: '14:00',
      suggestedEndTime: '14:10',
      confidence: 0.7,
      source: 'habit',
      tags: ['hydration'],
    });
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 4);
}

export function buildLogInsights(logs: DailyLogRow[]): SmartLogInsights {
  if (logs.length === 0) {
    return {
      totalLogs: 0,
      lowMoodCount: 0,
      avgSleepHours: null,
      avgHydrationGlasses: null,
      topSymptoms: [],
      latestMood: null,
      latestEnergyLevel: null,
    };
  }

  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted[0] ?? null;
  const lowMoodCount = logs.filter((log) => log.mood === 'Low' || log.mood === 'Irritable').length;

  const sleepValues = logs
    .map((log) => log.sleep_hours)
    .filter((value): value is number => typeof value === 'number');

  const hydrationValues = logs
    .map((log) => log.hydration_glasses)
    .filter((value): value is number => typeof value === 'number');

  const symptomFrequency = new Map<string, number>();
  logs.forEach((log) => {
    log.symptoms.forEach((symptom) => {
      symptomFrequency.set(symptom, (symptomFrequency.get(symptom) ?? 0) + 1);
    });
  });

  const topSymptoms = [...symptomFrequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  return {
    totalLogs: logs.length,
    lowMoodCount,
    avgSleepHours:
      sleepValues.length > 0
        ? Number((sleepValues.reduce((sum, value) => sum + value, 0) / sleepValues.length).toFixed(1))
        : null,
    avgHydrationGlasses:
      hydrationValues.length > 0
        ? Number((hydrationValues.reduce((sum, value) => sum + value, 0) / hydrationValues.length).toFixed(1))
        : null,
    topSymptoms,
    latestMood: latest?.mood ?? null,
    latestEnergyLevel: latest?.energy_level ?? null,
  };
}
