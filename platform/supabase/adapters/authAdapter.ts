/**
 * src/platform/supabase/adapters/authAdapter.ts
 * Centralized, typed adapter for auth operations.
 * Single source of truth for auth Supabase queries.
 */
import { supabase } from "@/lib/supabase";

export const authAdapter = {
  /**
   * Sign in with email and password.
   */
  signIn: async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  },

  /**
   * Sign up with email and password.
   */
  signUp: async (email: string, password: string) => {
    return supabase.auth.signUp({ email, password });
  },

  /**
   * Sign out the current user.
   */
  signOut: async () => {
    return supabase.auth.signOut();
  },

  /**
   * Get the current session (already signed-in user).
   */
  getSession: async () => {
    return supabase.auth.getSession();
  },

  /**
   * Get the current authenticated user.
   */
  getUser: async () => {
    return supabase.auth.getUser();
  },

  /**
   * Update user attributes (email, password, etc.).
   */
  updateUser: async (attrs: Record<string, unknown>) => {
    return supabase.auth.updateUser(attrs);
  },
};
