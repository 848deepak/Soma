/**
 * types/database.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Strongly-typed interfaces that mirror every table and view in the Supabase
 * schema.  Follows the Supabase convention of exporting a single Database type
 * so it can be passed directly to the createClient<Database>() generic:
 *
 *   import { createClient } from '@supabase/supabase-js'
 *   import type { Database } from '@/types/database'
 *   const supabase = createClient<Database>(URL, KEY)
 *
 * Each Row type is the shape returned by the database.
 * Each Insert type is the shape required when inserting.
 * Each Update type makes all Insert fields optional for PATCH-style updates.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─────────────────────────────────────────────────────────────────────────────
// Domain enumerations
// Keep these in sync with the CHECK constraints in schema.sql
// ─────────────────────────────────────────────────────────────────────────────

/** Physiological phases of the menstrual cycle. */
export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

/**
 * Flow level options used in DailyLogScreen (0–3) and QuickCheckinScreen (0–4).
 * 0 = None  1 = Light  2 = Medium  3 = Heavy  4 = Very Heavy (quick check-in)
 */
export type FlowLevel = 0 | 1 | 2 | 3 | 4;

/** Mood options from QuickCheckinScreen and DailyLogScreen. */
export type MoodOption =
  | 'Happy'
  | 'Sensitive'
  | 'Energetic'
  | 'Tired'
  | 'Calm'
  | 'Focused'
  | 'Irritable'
  | 'Low';

/** Energy options from QuickLogCard. */
export type EnergyLevel = 'Low' | 'Medium' | 'High';

/**
 * Symptom pill options from DailyLogScreen and QuickCheckinScreen.
 * Stored as a text[] column in daily_logs.
 */
export type SymptomOption =
  | 'Cramps'
  | 'Tender'
  | 'Radiant'
  | 'Brain Fog'
  | 'Bloating'
  | 'Energized'
  | 'Moody'
  | 'Calm';

/** Partner link status values. */
export type PartnerStatus = 'pending' | 'active' | 'revoked';

// ─────────────────────────────────────────────────────────────────────────────
// Partner permissions object stored as JSONB in profiles and partners tables.
// Mirrors the toggle state in PartnerSyncScreen.
// ─────────────────────────────────────────────────────────────────────────────
export interface PartnerPermissions {
  share_mood: boolean;
  share_fertility: boolean;
  share_symptoms: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLE: profiles
// ─────────────────────────────────────────────────────────────────────────────
export interface ProfileRow {
  id: string;                         // uuid – matches auth.users.id
  username: string | null;
  first_name: string;
  date_of_birth: string | null;       // ISO date string "YYYY-MM-DD"
  cycle_length_average: number;       // 15–60, default 28
  period_duration_average: number;    // 1–15, default 5
  partner_link_code: string;          // unique 6-char code e.g. "A7-92-B1"
  partner_permissions: PartnerPermissions;
  is_onboarded: boolean;
  created_at: string;                 // ISO timestamptz
  updated_at: string;
}

export interface ProfileInsert {
  id: string;
  username?: string | null;
  first_name?: string;
  date_of_birth?: string | null;
  cycle_length_average?: number;
  period_duration_average?: number;
  partner_permissions?: PartnerPermissions;
  is_onboarded?: boolean;
}

export type ProfileUpdate = Partial<ProfileInsert>;

// ─────────────────────────────────────────────────────────────────────────────
// TABLE: cycles
// ─────────────────────────────────────────────────────────────────────────────
export interface CycleRow {
  id: string;                           // uuid
  user_id: string;                      // uuid → auth.users
  start_date: string;                   // "YYYY-MM-DD"
  end_date: string | null;              // null = active cycle
  cycle_length: number | null;          // computed on cycle close
  predicted_ovulation: string | null;   // "YYYY-MM-DD"
  predicted_next_cycle: string | null;  // "YYYY-MM-DD"
  current_phase: CyclePhase | null;
  created_at: string;
  updated_at: string;
}

export interface CycleInsert {
  user_id: string;
  start_date: string;
  end_date?: string | null;
  cycle_length?: number | null;
  predicted_ovulation?: string | null;
  predicted_next_cycle?: string | null;
  current_phase?: CyclePhase | null;
}

export type CycleUpdate = Partial<CycleInsert>;

// ─────────────────────────────────────────────────────────────────────────────
// TABLE: daily_logs
// ─────────────────────────────────────────────────────────────────────────────
export interface DailyLogRow {
  id: string;                           // uuid
  user_id: string;                      // uuid → auth.users
  date: string;                         // "YYYY-MM-DD" – primary key for lookups
  cycle_day: number | null;             // 1-based day within the current cycle
  cycle_id: string | null;              // uuid → cycles
  flow_level: FlowLevel | null;
  mood: MoodOption | null;
  energy_level: EnergyLevel | null;
  symptoms: SymptomOption[];
  notes: string | null;                 // PRIVATE – never exposed via partner view
  hydration_glasses: number | null;     // 0–20
  sleep_hours: number | null;           // decimal, e.g. 7.2 = 7h 12m
  partner_alert: boolean;               // "Share severe cramps with partner" toggle
  created_at: string;
  updated_at: string;
}

export interface DailyLogInsert {
  user_id: string;
  date: string;
  cycle_day?: number | null;
  cycle_id?: string | null;
  flow_level?: FlowLevel | null;
  mood?: MoodOption | null;
  energy_level?: EnergyLevel | null;
  symptoms?: SymptomOption[];
  notes?: string | null;
  hydration_glasses?: number | null;
  sleep_hours?: number | null;
  partner_alert?: boolean;
}

export type DailyLogUpdate = Partial<DailyLogInsert>;

// ─────────────────────────────────────────────────────────────────────────────
// TABLE: partners
// ─────────────────────────────────────────────────────────────────────────────
export interface PartnerRow {
  id: string;
  user_id: string;                    // the user whose data is shared
  partner_user_id: string | null;     // the viewer; null while 'pending'
  invite_code: string;
  status: PartnerStatus;
  permissions: PartnerPermissions;
  created_at: string;
  updated_at: string;
}

export interface PartnerInsert {
  user_id: string;
  partner_user_id?: string | null;
  invite_code: string;
  status?: PartnerStatus;
  permissions?: PartnerPermissions;
}

export type PartnerUpdate = Partial<PartnerInsert>;

// ─────────────────────────────────────────────────────────────────────────────
// VIEW: partner_visible_logs
// Shape returned by partner_visible_logs – used in PartnerView.tsx (Phase 4).
// Notes, hydration, and sleep are permanently absent from this type.
// ─────────────────────────────────────────────────────────────────────────────
export interface PartnerVisibleLog {
  id: string;
  user_id: string;
  date: string;
  cycle_day: number | null;
  cycle_id: string | null;
  /** Raw flow_level from the log row (visible regardless of permissions). */
  flow_level: FlowLevel | null;
  /** Null unless share_mood permission is true. */
  mood: MoodOption | null;
  energy_level: EnergyLevel | null;
  /** Empty array unless share_symptoms permission is true. */
  symptoms: SymptomOption[];
  /** Null unless share_fertility permission is true. */
  fertility_flow_level: FlowLevel | null;
  /** Always visible so partner can offer support. */
  partner_alert: boolean;
  updated_at: string;
  /** From the related cycle row – visible if share_fertility is true. */
  cycle_phase: CyclePhase | null;
  predicted_ovulation: string | null;
  predicted_next_cycle: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Root Database type for Supabase client generics
// Usage: createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
// ─────────────────────────────────────────────────────────────────────────────
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        // No cross-table FK relationships surfaced to the client
        Relationships: [];
      };
      cycles: {
        Row: CycleRow;
        Insert: CycleInsert;
        Update: CycleUpdate;
        Relationships: [];
      };
      daily_logs: {
        Row: DailyLogRow;
        Insert: DailyLogInsert;
        Update: DailyLogUpdate;
        Relationships: [];
      };
      partners: {
        Row: PartnerRow;
        Insert: PartnerInsert;
        Update: PartnerUpdate;
        Relationships: [];
      };
    };
    Views: {
      partner_visible_logs: {
        Row: PartnerVisibleLog;
        Relationships: [];
      };
    };
    Functions: {
      link_partner: {
        Args: { code: string };
        Returns: PartnerRow;
      };
      generate_partner_code: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience re-exports for use inside the app
// ─────────────────────────────────────────────────────────────────────────────

/** The active (open) cycle: end_date is null. */
export type ActiveCycle = CycleRow & { end_date: null };

/** The complete cycle: end_date is set. */
export type CompletedCycle = CycleRow & {
  end_date: string;
  cycle_length: number;
};

/** A daily log that has been saved to the database (has id + timestamps). */
export type SavedDailyLog = DailyLogRow;

/**
 * Payload used when upserting a daily log from DailyLogScreen / QuickCheckinScreen.
 * The hook layer derives user_id, date, cycle_day, cycle_id before inserting.
 */
export interface LogPayload {
  flow_level?: FlowLevel | null;
  mood?: MoodOption | null;
  energy_level?: EnergyLevel | null;
  symptoms?: SymptomOption[];
  notes?: string | null;
  hydration_glasses?: number | null;
  sleep_hours?: number | null;
  partner_alert?: boolean;
}
