/**
 * hooks/useProfile.ts
 * Fetches the authenticated user's profile row from Supabase.
 * The row is auto-created by the handle_new_user DB trigger on sign-up,
 * so it always exists after ensureAnonymousSession() completes.
 */
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/src/lib/queryKeys";
import { logWarn } from "@/platform/monitoring/logger";
import type {
  NotificationPreferenceRow,
  NotificationPreferenceUpdate,
  ProfileRow,
  ProfileUpdate,
} from "@/types/database";

// Re-export from query keys registry for backward compatibility
export const PROFILE_QUERY_KEY = (userId: string) => QUERY_KEYS.profile(userId);
export const NOTIFICATION_PREFERENCES_QUERY_KEY =
  QUERY_KEYS.notificationPreferences;

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
  const queryClient = useQueryClient();

  // Use a two-phase approach: first query to get userId, then fetch profile
  // This ensures queryKey includes userId for proper cache matching
  const query = useQuery<ProfileRow | null>({
    queryKey: ["_current_user_profile"], // Temporary key during fetch
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      // Fetch profile with userId in the query key
      const profileKey = QUERY_KEYS.profile(user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        logWarn("auth", "profile_query_error", {
          userId: user.id,
          message: error.message,
        });
        throw new Error(error.message || "Profile lookup failed");
      }

      if (!data) {
        logWarn("auth", "profile_row_missing", { userId: user.id });
        return null;
      }

      const profileData = data as ProfileRow;

      // Set the data under the proper key with userId
      queryClient.setQueryData(profileKey, profileData);

      return profileData;
    },
    // Profile rarely changes – 5 minute stale time
    staleTime: 5 * 60 * 1000,
    // Retry only transient failures; missing rows are returned as null.
    retry: (failureCount, error) => {
      const normalized = error.message.toLowerCase();
      if (
        failureCount < 2 &&
        (normalized.includes("network") ||
          normalized.includes("fetch") ||
          normalized.includes("timeout"))
      ) {
        return true;
      }
      return false;
    },
    throwOnError: false,
    // Add timeout through query options (3 seconds)
    meta: {
      timeout: 3000,
    },
  });

  // Real-time subscription to profile changes (only subscribe when query has data)
  useEffect(() => {
    let channelName: string | null = null;
    let cancelled = false;

    async function subscribeToProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) return;

      channelName = `profile:${user.id}`;
      const profileKey = QUERY_KEYS.profile(user.id);

      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            const next = payload.new as ProfileRow | undefined;
            if (next) {
              queryClient.setQueryData(profileKey, next);
            } else if (payload.eventType === "DELETE") {
              queryClient.setQueryData(profileKey, null);
            }
          },
        )
        .subscribe();

      return channel;
    }

    let activeChannel: ReturnType<typeof supabase.channel> | undefined;

    void subscribeToProfile().then((channel) => {
      activeChannel = channel;
    });

    return () => {
      cancelled = true;
      if (activeChannel) {
        void supabase.removeChannel(activeChannel);
      } else if (channelName) {
        const channel = supabase.getChannels().find((item) => item.topic === channelName);
        if (channel) {
          void supabase.removeChannel(channel);
        }
      }
    };
  }, [queryClient]);

  return query;
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
        logWarn("auth", "notification_preferences_seed_error", {
          message: insertError.message,
          code: (insertError as { code?: string }).code,
        });
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { previous: null };

      const profileKey = QUERY_KEYS.profile(user.id);
      await queryClient.cancelQueries({ queryKey: profileKey });
      const previous = queryClient.getQueryData<ProfileRow>(profileKey);
      queryClient.setQueryData<ProfileRow | null>(profileKey, (old) =>
        old ? { ...old, ...update } : old,
      );
      return { previous };
    },

    onError: (_error, _update, context) => {
      if (!context?.previous) return;

      // Re-fetch current user to get the proper key
      void supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          const profileKey = QUERY_KEYS.profile(user.id);
          queryClient.setQueryData(profileKey, context.previous);
        }
      }).catch((err) => {
        logWarn("auth", "profile_error_rollback_failed", {
          message: err instanceof Error ? err.message : String(err),
        });
      });
    },

    onSettled: () => {
      // Invalidate all profile queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          const firstKey = query.queryKey[0];
          return firstKey === 'profile';
        }
      });
    },
  });
}
