/**
 * src/domain/validators/index.ts
 *
 * Input validation for all write operations (mutations) before they reach the database.
 * Returns structured ValidationResult with i18n-ready error keys instead of raw messages.
 *
 * Design:
 * - Validate BEFORE calling adapters (first line of defense)
 * - Return i18n key, not human text (allow app to localize)
 * - Use type-safe constants from database types and domain constants
 * - Never swallow validation errors — always return explicit result
 */

import type {
  DailyLogInsert,
  CycleInsert,
  ProfileUpdate,
  FlowLevel,
  MoodOption,
  EnergyLevel,
  SymptomOption,
} from '@/types/database';

import {
  FLOW_OPTIONS,
  MOOD_OPTIONS,
  ENERGY_OPTIONS,
  SYMPTOM_OPTIONS,
  CYCLE_PHASES,
} from '@/src/domain/constants/logOptions';

// ─────────────────────────────────────────────────────────────────────────────
// Validation Result Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationResult<T = unknown> {
  valid: boolean;
  reason?: string; // i18n key: e.g., 'validation.invalid_date'
  details?: Record<string, string>; // Additional field-level errors
  value?: T;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Validators
// ─────────────────────────────────────────────────────────────────────────────

/** Validate ISO date format "YYYY-MM-DD" */
function isValidDateFormat(dateStr: string): boolean {
  if (typeof dateStr !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

/** Validate date is not in the future (relative to today, UTC) */
function isNotFutureDate(dateStr: string, todayUtc: string): boolean {
  return dateStr <= todayUtc;
}

/** Parse date safely to detect invalid dates like 2024-02-30 */
function isValidDateValue(dateStr: string): boolean {
  const date = new Date(`${dateStr}T00:00:00Z`);
  if (isNaN(date.getTime())) return false;
  // Ensure it round-trips (prevents invalid dates like 02-30)
  return date.toISOString().startsWith(dateStr);
}

/** Get today's date in UTC as YYYY-MM-DD */
function getTodayUtc(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily Log Validator
// ─────────────────────────────────────────────────────────────────────────────

export function validateDailyLog(
  log: Partial<DailyLogInsert> & { user_id?: string },
): ValidationResult<DailyLogInsert> {
  const details: Record<string, string> = {};
  const todayUtc = getTodayUtc();

  // Required: user_id
  if (!log.user_id || typeof log.user_id !== 'string') {
    return { valid: false, reason: 'validation.missing_user_id' };
  }

  // Required: date
  if (!log.date || typeof log.date !== 'string') {
    details.date = 'validation.date_required';
  } else if (!isValidDateFormat(log.date)) {
    details.date = 'validation.invalid_date_format';
  } else if (!isValidDateValue(log.date)) {
    details.date = 'validation.invalid_date_value';
  } else if (!isNotFutureDate(log.date, todayUtc)) {
    details.date = 'validation.future_date_not_allowed';
  }

  // Optional: flow_level (0-3 for daily log, not 4 which is quick-check only)
  if (log.flow_level !== undefined && log.flow_level !== null) {
    if (!Number.isInteger(log.flow_level) || !FLOW_OPTIONS.includes(log.flow_level as FlowLevel)) {
      details.flow_level = 'validation.invalid_flow_level';
    }
  }

  // Optional: mood
  if (log.mood !== undefined && log.mood !== null) {
    if (typeof log.mood !== 'string' || !MOOD_OPTIONS.includes(log.mood as MoodOption)) {
      details.mood = 'validation.invalid_mood';
    }
  }

  // Optional: energy_level
  if (log.energy_level !== undefined && log.energy_level !== null) {
    if (typeof log.energy_level !== 'string' || !ENERGY_OPTIONS.includes(log.energy_level as EnergyLevel)) {
      details.energy_level = 'validation.invalid_energy_level';
    }
  }

  // Optional: symptoms (array of valid symptom options)
  if (log.symptoms !== undefined && log.symptoms !== null) {
    if (!Array.isArray(log.symptoms)) {
      details.symptoms = 'validation.symptoms_must_be_array';
    } else {
      const invalidSymptoms = log.symptoms.filter(
        (s) => typeof s !== 'string' || !SYMPTOM_OPTIONS.includes(s as SymptomOption),
      );
      if (invalidSymptoms.length > 0) {
        details.symptoms = 'validation.invalid_symptom_options';
      }
    }
  }

  // Optional: notes (string, max 1000 chars to prevent abuse)
  if (log.notes !== undefined && log.notes !== null) {
    if (typeof log.notes !== 'string') {
      details.notes = 'validation.notes_must_be_string';
    } else if (log.notes.length > 1000) {
      details.notes = 'validation.notes_too_long';
    }
  }

  // Optional: fertility_flow_level (only if provided, same validation as flow_level)
  if (log.fertility_flow_level !== undefined && log.fertility_flow_level !== null) {
    if (!Number.isInteger(log.fertility_flow_level) || !FLOW_OPTIONS.includes(log.fertility_flow_level as FlowLevel)) {
      details.fertility_flow_level = 'validation.invalid_fertility_flow_level';
    }
  }

  // Collect all errors
  if (Object.keys(details).length > 0) {
    return { valid: false, reason: 'validation.daily_log_invalid', details };
  }

  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Cycle Start/End Validator
// ─────────────────────────────────────────────────────────────────────────────

export function validateCycleStart(cycle: Partial<CycleInsert> & { user_id?: string }): ValidationResult<CycleInsert> {
  const details: Record<string, string> = {};
  const todayUtc = getTodayUtc();

  // Required: user_id
  if (!cycle.user_id || typeof cycle.user_id !== 'string') {
    return { valid: false, reason: 'validation.missing_user_id' };
  }

  // Required: start_date
  if (!cycle.start_date || typeof cycle.start_date !== 'string') {
    details.start_date = 'validation.start_date_required';
  } else if (!isValidDateFormat(cycle.start_date)) {
    details.start_date = 'validation.invalid_date_format';
  } else if (!isValidDateValue(cycle.start_date)) {
    details.start_date = 'validation.invalid_date_value';
  } else if (!isNotFutureDate(cycle.start_date, todayUtc)) {
    details.start_date = 'validation.future_date_not_allowed';
  }

  if (Object.keys(details).length > 0) {
    return { valid: false, reason: 'validation.cycle_start_invalid', details };
  }

  return { valid: true };
}

export function validateCycleEnd(
  cycle: { end_date?: string | null; start_date: string } & { user_id?: string },
): ValidationResult {
  const details: Record<string, string> = {};
  const todayUtc = getTodayUtc();

  // end_date must be after start_date
  if (cycle.end_date) {
    if (!isValidDateFormat(cycle.end_date)) {
      details.end_date = 'validation.invalid_date_format';
    } else if (!isValidDateValue(cycle.end_date)) {
      details.end_date = 'validation.invalid_date_value';
    } else if (!isNotFutureDate(cycle.end_date, todayUtc)) {
      details.end_date = 'validation.future_date_not_allowed';
    } else if (cycle.end_date < cycle.start_date) {
      details.end_date = 'validation.end_date_before_start_date';
    } else {
      // Validate cycle length is reasonable (15-60 days)
      const startD = new Date(cycle.start_date);
      const endD = new Date(cycle.end_date);
      const lengthDays = Math.floor((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (lengthDays < 15 || lengthDays > 60) {
        details.end_date = 'validation.cycle_length_out_of_range';
      }
    }
  }

  if (Object.keys(details).length > 0) {
    return { valid: false, reason: 'validation.cycle_end_invalid', details };
  }

  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile Update Validator
// ─────────────────────────────────────────────────────────────────────────────

export function validateProfileUpdate(profile: ProfileUpdate & { id?: string }): ValidationResult {
  const details: Record<string, string> = {};

  // Optional: first_name (trim, max 100 chars)
  if (profile.first_name !== undefined) {
    if (typeof profile.first_name !== 'string') {
      details.first_name = 'validation.first_name_must_be_string';
    } else if (profile.first_name.trim().length === 0) {
      details.first_name = 'validation.first_name_required';
    } else if (profile.first_name.length > 100) {
      details.first_name = 'validation.first_name_too_long';
    }
  }

  // Optional: username (alphanumeric + underscore, 3-20 chars, unique checked by DB)
  if (profile.username !== undefined && profile.username !== null) {
    if (typeof profile.username !== 'string') {
      details.username = 'validation.username_must_be_string';
    } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(profile.username)) {
      details.username = 'validation.username_invalid_format';
    }
  }

  // Optional: date_of_birth (ISO date, must be in past, reasonable age)
  if (profile.date_of_birth !== undefined && profile.date_of_birth !== null) {
    if (typeof profile.date_of_birth !== 'string') {
      details.date_of_birth = 'validation.dob_must_be_string';
    } else if (!isValidDateFormat(profile.date_of_birth)) {
      details.date_of_birth = 'validation.invalid_date_format';
    } else if (!isValidDateValue(profile.date_of_birth)) {
      details.date_of_birth = 'validation.invalid_date_value';
    } else {
      const today = new Date();
      const dob = new Date(`${profile.date_of_birth}T00:00:00Z`);
      const ageMs = today.getTime() - dob.getTime();
      const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000);
      if (ageYears < 13 || ageYears > 120) {
        details.date_of_birth = 'validation.unreasonable_age';
      }
    }
  }

  // Optional: cycle_length_average (15-60 days)
  if (profile.cycle_length_average !== undefined) {
    if (!Number.isInteger(profile.cycle_length_average) || profile.cycle_length_average < 15 || profile.cycle_length_average > 60) {
      details.cycle_length_average = 'validation.cycle_length_out_of_range';
    }
  }

  // Optional: period_duration_average (1-15 days)
  if (profile.period_duration_average !== undefined) {
    if (!Number.isInteger(profile.period_duration_average) || profile.period_duration_average < 1 || profile.period_duration_average > 15) {
      details.period_duration_average = 'validation.period_duration_out_of_range';
    }
  }

  // Optional: is_onboarded (boolean)
  if (profile.is_onboarded !== undefined) {
    if (typeof profile.is_onboarded !== 'boolean') {
      details.is_onboarded = 'validation.is_onboarded_must_be_boolean';
    }
  }

  if (Object.keys(details).length > 0) {
    return { valid: false, reason: 'validation.profile_invalid', details };
  }

  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth Validators
// ─────────────────────────────────────────────────────────────────────────────

export function validateEmail(email: string): ValidationResult {
  if (typeof email !== 'string' || email.trim().length === 0) {
    return { valid: false, reason: 'validation.email_required' };
  }

  // Simple email regex (RFC 5322 simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, reason: 'validation.email_invalid_format' };
  }

  if (email.length > 254) {
    return { valid: false, reason: 'validation.email_too_long' };
  }

  return { valid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (typeof password !== 'string') {
    return { valid: false, reason: 'validation.password_must_be_string' };
  }

  if (password.length < 8) {
    return { valid: false, reason: 'validation.password_too_short' };
  }

  if (password.length > 128) {
    return { valid: false, reason: 'validation.password_too_long' };
  }

  // Basic strength: at least one uppercase, one lowercase, one digit
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: 'validation.password_needs_lowercase' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: 'validation.password_needs_uppercase' };
  }

  if (!/\d/.test(password)) {
    return { valid: false, reason: 'validation.password_needs_digit' };
  }

  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Export all validators as a namespace for convenience
// ─────────────────────────────────────────────────────────────────────────────

export const validators = {
  dailyLog: validateDailyLog,
  cycleStart: validateCycleStart,
  cycleEnd: validateCycleEnd,
  profileUpdate: validateProfileUpdate,
  email: validateEmail,
  password: validatePassword,
};
