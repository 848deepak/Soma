export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

export type DailyInsight = {
  title: string;
  description: string;
};

export const mockCycle = {
  day: 14,
  cycleLength: 28,
  phase: 'ovulation' as CyclePhase,
  progress: 0.5,
};

export const mockInsight: DailyInsight = {
  title: 'Your estrogen is peaking today.',
  description: 'Great day for high-intensity workouts and confidence-heavy tasks.',
};

export const moodOptions = ['Calm', 'Happy', 'Focused', 'Irritable', 'Low'] as const;
export const energyOptions = ['Low', 'Medium', 'High'] as const;

export const defaultSymptoms = ['cramps', 'mood', 'energy', 'sleep'];
