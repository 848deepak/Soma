import { supabase } from "@/lib/supabase";
import { validateNotificationPreferences } from "@/src/domain/validators";

const DEFAULT_NOTIFICATION_PREFS = {
  daily_reminders: false,
  period_alerts: true,
  ovulation_alerts: true,
  behavioral_alerts: true,
  max_per_day: 3,
  quiet_hours_start: 22,
  quiet_hours_end: 8,
};

export async function ensureNotificationPreferencesRow(
  userId?: string,
  dailyReminders = false,
): Promise<void> {
  let resolvedUserId = userId;

  if (!resolvedUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    resolvedUserId = user?.id;
  }

  if (!resolvedUserId) {
    return;
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const payload = {
    user_id: resolvedUserId,
    ...DEFAULT_NOTIFICATION_PREFS,
    daily_reminders: dailyReminders,
    timezone,
  };

  // Validate before upsert
  const validation = validateNotificationPreferences(payload);
  if (!validation.valid) {
    throw new Error(validation.reason || 'validation.notification_preferences_invalid');
  }

  const { error } = await supabase
    .from("notification_preferences")
    .upsert(
      payload,
      { onConflict: "user_id" },
    );

  if (error) {
    throw error;
  }
}
