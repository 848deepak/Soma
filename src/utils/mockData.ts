export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

export type DailyInsight = {
  title: string;
  description: string;
};

export const defaultSymptoms = ['cramps', 'mood', 'energy', 'sleep'];
