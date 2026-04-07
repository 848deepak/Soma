/**
 * src/platform/supabase/adapters/profileAdapter.ts
 * Centralized, typed adapter for profile operations.
 * Single source of truth for profile Supabase queries.
 *
 * SECURITY: All mutations validate input before calling Supabase.
 * RLS policies are the last line of defense.
 */
import { supabase } from "@/lib/supabase";
import type { ProfileRow, ProfileUpdate } from "@/types/database";
import { validateProfileUpdate } from "@/src/domain/validators";

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
   *
   * SECURITY: Validates input before mutations. If validation fails,
   * returns an error object that matches the Supabase response shape.
   */
  upsert: async (update: ProfileUpdate & { id: string }) => {
    // Validate before mutation (first line of defense)
    const validation = validateProfileUpdate(update);
    if (!validation.valid) {
      return {
        data: null,
        error: {
          message: validation.reason || "Validation failed",
          details: validation.details,
          code: "validation_failed",
          status: 400,
        },
        status: 400,
        statusText: "Validation Error",
      };
    }

    const { id, ...updateData } = update;
    return supabase
      .from("profiles")
      .update(updateData)
      .eq("id", id)
      .select()
      .single<ProfileRow>();
  },
};
