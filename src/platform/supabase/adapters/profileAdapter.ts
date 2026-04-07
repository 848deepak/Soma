/**
 * src/platform/supabase/adapters/profileAdapter.ts
 * Centralized, typed adapter for profile operations.
 * Single source of truth for profile Supabase queries.
 */
import { supabase } from "@/lib/supabase";
import type { ProfileRow, ProfileUpdate } from "@/types/database";

export const profileAdapter = {
  /**
   * Fetch the user's profile row.
   * Auto-created by handle_new_user trigger on signup.
   */
  get: async (userId: string) => {
    return supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle<ProfileRow>();
  },

  /**
   * Update the user's profile with partial updates.
   */
  upsert: async (update: ProfileUpdate & { id: string }) => {
    const { id, ...updateData } = update;
    return supabase
      .from("profiles")
      .update(updateData)
      .eq("id", id)
      .select()
      .single<ProfileRow>();
  },
};
