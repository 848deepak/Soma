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
  SmartEventInsert,
  SmartEventType,
  NotificationPreferenceInsert,
  PartnerPermissions,
} from '@/types/database';

import {
  FLOW_OPTIONS,
  MOOD_OPTIONS,
  ENERGY_OPTIONS,
  SYMPTOM_OPTIONS,
  CYCLE_PHASES,
} from '@/src/domain/constants/logOptions';
import { todayLocal } from '@/src/domain/utils/dateUtils';

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

/** Validate date is not in the future (relative to today, local date) */
function isNotFutureDate(dateStr: string, todayDate: string): boolean {
  return dateStr <= todayDate;
}

/** Parse date safely to detect invalid dates like 2024-02-30 */
function isValidDateValue(dateStr: string): boolean {
  const date = new Date(`${dateStr}T00:00:00Z`);
  if (isNaN(date.getTime())) return false;
  // Ensure it round-trips (prevents invalid dates like 02-30)
  return date.toISOString().startsWith(dateStr);
}

/** Get today's local date as YYYY-MM-DD */
function getTodayLocal(): string {
  // Uses local date to match how dates are stored in the app
  return todayLocal();
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily Log Validator
// ─────────────────────────────────────────────────────────────────────────────

export function validateDailyLog(
  log: Partial<DailyLogInsert> & { user_id?: string },
): ValidationResult<DailyLogInsert> {
  const details: Record<string, string> = {};
  const todayDate = getTodayLocal();

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
  } else if (!isNotFutureDate(log.date, todayDate)) {
    details.date = 'validation.future_date_not_allowed';
  }

  // Optional: flow_level (0-3 for daily log, not 4 which is quick-check only)
  if (log.flow_level !== undefined && log.flow_level !== null) {
    if (!Number.isInteger(log.flow_level) || !FLOW_OPTIONS.includes(log.flow_level as number as typeof FLOW_OPTIONS[number])) {
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
  const todayDate = getTodayLocal();

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
  } else if (!isNotFutureDate(cycle.start_date, todayDate)) {
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
  const todayDate = getTodayLocal();

  // end_date must be after start_date
  if (cycle.end_date) {
    if (!isValidDateFormat(cycle.end_date)) {
      details.end_date = 'validation.invalid_date_format';
    } else if (!isValidDateValue(cycle.end_date)) {
      details.end_date = 'validation.invalid_date_value';
    } else if (!isNotFutureDate(cycle.end_date, todayDate)) {
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
// Smart Event Validator
// ─────────────────────────────────────────────────────────────────────────────

export function validateSmartEvent(input: unknown): ValidationResult<SmartEventInsert> {
  const details: Record<string, string> = {};

  // Ensure input is an object
  if (!input || typeof input !== 'object') {
    return { valid: false, reason: 'validation.invalid_input_type' };
  }

  const event = input as Record<string, unknown>;

  // Required: user_id (non-empty string, UUID preferred)
  if (!event.user_id || typeof event.user_id !== 'string') {
    return { valid: false, reason: 'validation.missing_user_id' };
  }

  // Required: title
  if (!event.title || typeof event.title !== 'string') {
    details.title = 'validation.title_required';
  } else if (event.title.length > 500) {
    details.title = 'validation.title_too_long';
  }

  // Required: start_time
  if (!event.start_time || typeof event.start_time !== 'string') {
    details.start_time = 'validation.start_time_required';
  }

  // Required: end_time
  if (!event.end_time || typeof event.end_time !== 'string') {
    details.end_time = 'validation.end_time_required';
  }

  // Optional: type (one of 'manual' | 'ai' | 'log')
  if (event.type !== undefined && event.type !== null) {
    const validTypes: SmartEventType[] = ['manual', 'ai', 'log'];
    if (typeof event.type !== 'string' || !validTypes.includes(event.type as SmartEventType)) {
      details.type = 'validation.invalid_event_type';
    }
  }

  // Optional: location (string)
  if (event.location !== undefined && event.location !== null) {
    if (typeof event.location !== 'string') {
      details.location = 'validation.location_must_be_string';
    } else if (event.location.length > 500) {
      details.location = 'validation.location_too_long';
    }
  }

  // Optional: tags (array of strings)
  if (event.tags !== undefined && event.tags !== null) {
    if (!Array.isArray(event.tags)) {
      details.tags = 'validation.tags_must_be_array';
    } else {
      const invalidTags = event.tags.filter((t) => typeof t !== 'string' || t.length > 100);
      if (invalidTags.length > 0) {
        details.tags = 'validation.invalid_tag_format';
      }
    }
  }

  // Optional: participants (array of strings)
  if (event.participants !== undefined && event.participants !== null) {
    if (!Array.isArray(event.participants)) {
      details.participants = 'validation.participants_must_be_array';
    } else {
      const invalidParticipants = event.participants.filter((p) => typeof p !== 'string' || p.length > 100);
      if (invalidParticipants.length > 0) {
        details.participants = 'validation.invalid_participant_format';
      }
    }
  }

  // Optional: data field (if present, must be serializable JSON - no circular refs)
  if (event.metadata !== undefined && event.metadata !== null) {
    try {
      if (typeof event.metadata !== 'object') {
        details.metadata = 'validation.invalid_metadata_type';
      } else {
        JSON.stringify(event.metadata);
      }
    } catch {
      details.metadata = 'validation.invalid_data_field';
    }
  }

  // Optional: recurrence (if present, must be serializable JSON)
  if (event.recurrence !== undefined && event.recurrence !== null) {
    try {
      if (typeof event.recurrence !== 'object') {
        details.recurrence = 'validation.invalid_recurrence_type';
      } else {
        JSON.stringify(event.recurrence);
      }
    } catch {
      details.recurrence = 'validation.invalid_recurrence_format';
    }
  }

  if (Object.keys(details).length > 0) {
    return { valid: false, reason: 'validation.smart_event_invalid', details };
  }

  return { valid: true, value: input as SmartEventInsert };
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification Preferences Validator
// ─────────────────────────────────────────────────────────────────────────────

export function validateNotificationPreferences(
  input: unknown,
): ValidationResult<NotificationPreferenceInsert> {
  const details: Record<string, string> = {};

  // Ensure input is an object
  if (!input || typeof input !== 'object') {
    return { valid: false, reason: 'validation.invalid_input_type' };
  }

  const prefs = input as Record<string, unknown>;

  // Required: user_id (non-empty string)
  if (!prefs.user_id || typeof prefs.user_id !== 'string') {
    return { valid: false, reason: 'validation.missing_user_id' };
  }

  // Optional: daily_reminders (boolean)
  if (prefs.daily_reminders !== undefined && prefs.daily_reminders !== null) {
    if (typeof prefs.daily_reminders !== 'boolean') {
      details.daily_reminders = 'validation.daily_reminders_must_be_boolean';
    }
  }

  // Optional: period_alerts (boolean)
  if (prefs.period_alerts !== undefined && prefs.period_alerts !== null) {
    if (typeof prefs.period_alerts !== 'boolean') {
      details.period_alerts = 'validation.period_alerts_must_be_boolean';
    }
  }

  // Optional: ovulation_alerts (boolean)
  if (prefs.ovulation_alerts !== undefined && prefs.ovulation_alerts !== null) {
    if (typeof prefs.ovulation_alerts !== 'boolean') {
      details.ovulation_alerts = 'validation.ovulation_alerts_must_be_boolean';
    }
  }

  // Optional: behavioral_alerts (boolean)
  if (prefs.behavioral_alerts !== undefined && prefs.behavioral_alerts !== null) {
    if (typeof prefs.behavioral_alerts !== 'boolean') {
      details.behavioral_alerts = 'validation.behavioral_alerts_must_be_boolean';
    }
  }

  // Optional: max_per_day (number, 0-99)
  if (prefs.max_per_day !== undefined && prefs.max_per_day !== null) {
    if (!Number.isInteger(prefs.max_per_day) || (prefs.max_per_day as number) < 0 || (prefs.max_per_day as number) > 99) {
      details.max_per_day = 'validation.max_per_day_invalid';
    }
  }

  // Optional: quiet_hours_start (number between 0-23)
  if (prefs.quiet_hours_start !== undefined && prefs.quiet_hours_start !== null) {
    if (!Number.isInteger(prefs.quiet_hours_start) || (prefs.quiet_hours_start as number) < 0 || (prefs.quiet_hours_start as number) > 23) {
      details.quiet_hours_start = 'validation.quiet_hours_start_invalid';
    }
  }

  // Optional: quiet_hours_end (number between 0-23)
  if (prefs.quiet_hours_end !== undefined && prefs.quiet_hours_end !== null) {
    if (!Number.isInteger(prefs.quiet_hours_end) || (prefs.quiet_hours_end as number) < 0 || (prefs.quiet_hours_end as number) > 23) {
      details.quiet_hours_end = 'validation.quiet_hours_end_invalid';
    }
  }

  // Optional: timezone (valid IANA timezone string)
  if (prefs.timezone !== undefined && prefs.timezone !== null) {
    if (typeof prefs.timezone !== 'string') {
      details.timezone = 'validation.timezone_must_be_string';
    } else {
      try {
        const supportedTimezones = Intl.supportedValuesOf('timeZone');
        if (!supportedTimezones.includes(prefs.timezone as string)) {
          details.timezone = 'validation.timezone_not_supported';
        }
      } catch {
        // Intl.supportedValuesOf not available in some older RN environments
        // Allow null/undefined timezone in those cases
        if (typeof prefs.timezone !== 'string' || prefs.timezone.length === 0) {
          details.timezone = 'validation.timezone_not_supported';
        }
      }
    }
  }

  if (Object.keys(details).length > 0) {
    return { valid: false, reason: 'validation.notification_preferences_invalid', details };
  }

  return { valid: true, value: input as NotificationPreferenceInsert };
}

// ─────────────────────────────────────────────────────────────────────────────
// Partner Update Validator
// ─────────────────────────────────────────────────────────────────────────────

export function validatePartnerUpdate(input: unknown): ValidationResult {
  const details: Record<string, string> = {};

  // Ensure input is an object
  if (!input || typeof input !== 'object') {
    return { valid: false, reason: 'validation.invalid_input_type' };
  }

  const update = input as Record<string, unknown>;

  // Required: partner_id (non-empty string)
  if (!update.partner_id || typeof update.partner_id !== 'string') {
    return { valid: false, reason: 'validation.missing_partner_id' };
  }

  // Required: permission_level (one of 'read' | 'write' | 'none')
  if (update.permission_level !== undefined && update.permission_level !== null) {
    const validLevels = ['read', 'write', 'none'];
    if (typeof update.permission_level !== 'string' || !validLevels.includes(update.permission_level as string)) {
      details.permission_level = 'validation.invalid_permission_level';
    }
  }

  // Optional: nickname (string max 50 chars, no special chars except hyphen and underscore)
  if (update.nickname !== undefined && update.nickname !== null) {
    if (typeof update.nickname !== 'string') {
      details.nickname = 'validation.nickname_must_be_string';
    } else if (update.nickname.length > 50) {
      details.nickname = 'validation.nickname_too_long';
    } else if (!/^[a-zA-Z0-9_-]*$/.test(update.nickname)) {
      details.nickname = 'validation.nickname_invalid_format';
    }
  }

  if (Object.keys(details).length > 0) {
    return { valid: false, reason: 'validation.partner_update_invalid', details };
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
  smartEvent: validateSmartEvent,
  notificationPreferences: validateNotificationPreferences,
  partnerUpdate: validatePartnerUpdate,
};
