/**
 * hooks/useProfile.ts
 * Fetches the authenticated user's profile row from Supabase.
 * The row is auto-created by the handle_new_user DB trigger on sign-up,
 * so it always exists after ensureAnonymousSession() completes.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type {
  NotificationPreferenceRow,
  NotificationPreferenceUpdate,
  ProfileRow,
  ProfileUpdate,
} from "@/types/database";

export const PROFILE_QUERY_KEY = ["profile"] as const;
export const NOTIFICATION_PREFERENCES_QUERY_KEY = [
  "notification_preferences",
] as const;

const DEFAULT_NOTIFICATION_PREFERENCES: Omit<
  NotificationPreferenceRow,
  "user_id" | "created_at" | "updated_at"
> = {
  daily_reminders: false,
  period_alerts: true,
  ovulation_alerts: true,
  behavioral_alerts: true,
  max_per_day: 3,
  quiet_hours_start: 22,
  quiet_hours_end: 8,
  timezone: "UTC",
};

export function useProfile() {
  return useQuery<ProfileRow | null>({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.warn("[Profile] Query error:", error);
        // Return null instead of throwing to prevent app crashes
        return null;
      }
      return data as unknown as ProfileRow;
    },
    // Profile rarely changes – 5 minute stale time
    staleTime: 5 * 60 * 1000,
    // Simplified retry logic - only retry network errors
    retry: (failureCount, error) => {
      // Only retry actual network failures, not data issues
      if (error.message.includes("network") && failureCount < 2) {
        return true;
      }
      return false;
    },
    // Never throw errors - return null for graceful degradation
    throwOnError: false,
    // Add timeout through query options (3 seconds)
    meta: {
      timeout: 3000,
    },
  });
}

export function useNotificationPreferences() {
  return useQuery<NotificationPreferenceRow | null>({
    queryKey: NOTIFICATION_PREFERENCES_QUERY_KEY,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        return data as unknown as NotificationPreferenceRow;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("notification_preferences")
        .upsert(
          {
            user_id: user.id,
            ...DEFAULT_NOTIFICATION_PREFERENCES,
          },
          { onConflict: "user_id" },
        )
        .select()
        .single();

      if (insertError) {
        console.warn("[NotificationPreferences] Query/seed error:", insertError);
        return null;
      }

      return inserted as unknown as NotificationPreferenceRow;
    },
    staleTime: 5 * 60 * 1000,
    throwOnError: false,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (update: NotificationPreferenceUpdate) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("notification_preferences")
        .upsert(
          {
            user_id: user.id,
            ...DEFAULT_NOTIFICATION_PREFERENCES,
            ...update,
          },
          { onConflict: "user_id" },
        )
        .select()
        .single();

      if (error) throw error;
      return data as unknown as NotificationPreferenceRow;
    },

    onMutate: async (update) => {
      await queryClient.cancelQueries({
        queryKey: NOTIFICATION_PREFERENCES_QUERY_KEY,
      });
      const previous = queryClient.getQueryData<NotificationPreferenceRow>(
        NOTIFICATION_PREFERENCES_QUERY_KEY,
      );
      queryClient.setQueryData<NotificationPreferenceRow | null>(
        NOTIFICATION_PREFERENCES_QUERY_KEY,
        (old) => {
          if (!old) return old;
          return { ...old, ...update };
        },
      );
      return { previous };
    },

    onError: (_error, _update, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(
          NOTIFICATION_PREFERENCES_QUERY_KEY,
          context.previous,
        );
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: NOTIFICATION_PREFERENCES_QUERY_KEY,
      });
    },
  });
}

/**
 * Mutation to update the user's profile (first name, permissions, etc.)
 * Applies an optimistic update so the UI reflects the change immediately.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (update: ProfileUpdate) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (typeof update.username !== "undefined") {
        const { data: currentProfile, error: currentProfileError } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();

        if (currentProfileError) throw currentProfileError;

        const existingUsername = currentProfile?.username?.trim();
        const requestedUsername = update.username?.trim();

        if (
          existingUsername &&
          requestedUsername &&
          existingUsername.toLowerCase() !== requestedUsername.toLowerCase()
        ) {
          throw new Error("Username is immutable after initial creation.");
        }
      }

      const { data, error } = await supabase
        .from("profiles")
        .update(update)
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ProfileRow;
    },

    onMutate: async (update) => {
      await queryClient.cancelQueries({ queryKey: PROFILE_QUERY_KEY });
      const previous = queryClient.getQueryData<ProfileRow>(PROFILE_QUERY_KEY);
      queryClient.setQueryData<ProfileRow | null>(PROFILE_QUERY_KEY, (old) =>
        old ? { ...old, ...update } : old,
      );
      return { previous };
    },

    onError: (_error, _update, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(PROFILE_QUERY_KEY, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}
