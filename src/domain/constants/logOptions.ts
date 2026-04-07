/**
 * src/domain/constants/logOptions.ts
 * Real typed constants for log options, derived from database enum types.
 * These replace mock data and are the single source of truth for UI pills/dropdowns.
 */

// ─── Flow level options (0–3 for daily logs) ───
export const FLOW_OPTIONS = [0, 1, 2, 3] as const;
export const FLOW_LABELS: Record<typeof FLOW_OPTIONS[number], string> = {
  0: "None",
  1: "Light",
  2: "Medium",
  3: "Heavy",
};
export type FlowOption = typeof FLOW_OPTIONS[number];

// ─── Mood options ───
export const MOOD_OPTIONS = [
  "Happy",
  "Sensitive",
  "Energetic",
  "Tired",
  "Calm",
  "Focused",
  "Irritable",
  "Low",
] as const;
export type MoodOption = typeof MOOD_OPTIONS[number];

// ─── Energy level options ───
export const ENERGY_OPTIONS = ["Low", "Medium", "High"] as const;
export type EnergyOption = typeof ENERGY_OPTIONS[number];

// ─── Symptom options ───
export const SYMPTOM_OPTIONS = [
  "Cramps",
  "Tender",
  "Radiant",
  "Brain Fog",
  "Bloating",
  "Energized",
  "Moody",
  "Calm",
] as const;
export type SymptomOption = typeof SYMPTOM_OPTIONS[number];

// ─── Cycle phases ───
export const CYCLE_PHASES = ["menstrual", "follicular", "ovulation", "luteal"] as const;
export type CyclePhase = typeof CYCLE_PHASES[number];
