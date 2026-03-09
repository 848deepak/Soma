/**
 * lib/auth.ts
 * Thin helpers around Supabase Auth.
 *
 * Strategy: anonymous sign-in on first launch.
 * The user gets a real UUID immediately, RLS functions correctly,
 * and the anonymous account can be upgraded to a full account later
 * (e.g., by linking an email) without changing the user's data.
 */
import { supabase } from '@/lib/supabase';

function normalizeAuthError(error: unknown): Error {
  if (error instanceof Error) {
    const lower = error.message.toLowerCase();

    if (lower.includes('anonymous sign-ins are disabled')) {
      return new Error('Anonymous access is disabled. Please create an account or sign in.');
    }

    if (lower.includes('email rate limit exceeded')) {
      return new Error('Too many attempts. Please wait a minute and try again.');
    }

    if (lower.includes('invalid login credentials')) {
      return new Error('Invalid email or password.');
    }

    if (lower.includes('email not confirmed')) {
      return new Error('Please verify your email before signing in.');
    }
  }

  return error instanceof Error ? error : new Error('Authentication failed. Please try again.');
}

/**
 * Returns the current session's user, or null if not authenticated.
 */
export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Signs in anonymously if the user has no session.
 * Safe to call multiple times – does nothing if a session already exists.
 * Throws on Supabase errors so the caller can handle or surface the failure.
 */
export async function ensureAnonymousSession() {
  const user = await getCurrentUser();
  if (user) return user;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw normalizeAuthError(error);
  return data.user;
}

/**
 * Signs up a new user with email and password.
 * When called while an anonymous session is active, this upgrades
 * the anonymous account to a full account without changing data.
 */
export async function signUpWithEmail(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (currentUser?.is_anonymous) {
    const { data, error } = await supabase.auth.updateUser({
      email: normalizedEmail,
      password,
    });
    if (error) throw normalizeAuthError(error);
    return data.user;
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
  });
  if (error) throw normalizeAuthError(error);
  return data.user;
}

/**
 * Signs in an existing user with email and password.
 * Returns the authenticated user on success.
 */
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw normalizeAuthError(error);
  return data.user;
}

/**
 * Sends a password recovery email to the given address.
 */
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
  if (error) throw normalizeAuthError(error);
}

/**
 * Signs the user out and clears the local session from AsyncStorage.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw normalizeAuthError(error);
}

/**
 * Returns the authenticated user's UUID.
 * Throws if no session is active – callers should have called
 * ensureAnonymousSession() during app bootstrap.
 */
export async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error('No active session. Call ensureAnonymousSession() first.');
  return user.id;
}
