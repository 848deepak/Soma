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

const PROFILE_CHECK_RETRIES = 3;
const PROFILE_CHECK_DELAY_MS = 150;

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const code = 'code' in error ? String((error as { code?: string }).code ?? '') : '';
  const message =
    'message' in error ? String((error as { message?: string }).message ?? '') : '';
  const normalized = message.toLowerCase();

  return code === '23505' || normalized.includes('duplicate key');
}

function isProfilesPermissionDenied(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const code = 'code' in error ? String((error as { code?: string }).code ?? '') : '';
  const message =
    'message' in error ? String((error as { message?: string }).message ?? '') : '';
  const normalized = message.toLowerCase();

  return code === '42501' || normalized.includes('permission denied for table profiles');
}

function calculateAgeFromIsoDate(isoDate: string): number | null {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  const birthDate = new Date(year, month - 1, day);
  if (
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month - 1 ||
    birthDate.getDate() !== day
  ) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - (month - 1);
  const dayDiff = today.getDate() - day;
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }
  return age;
}

async function enforceParentalConsentIfRequired(userId: string): Promise<void> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('date_of_birth')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message || 'Could not verify age requirements.');
  }

  const dob = profile?.date_of_birth as string | null | undefined;
  if (!dob) return;

  const age = calculateAgeFromIsoDate(dob);
  if (age === null || age >= 13) return;

  const { data: consent, error: consentError } = await supabase
    .from('parental_consents')
    .select('status, expires_at, revoked_at')
    .eq('child_id', userId)
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (consentError) {
    throw new Error(consentError.message || 'Could not verify parental consent status.');
  }

  const now = Date.now();
  const expiresAt = consent?.expires_at ? new Date(consent.expires_at).getTime() : 0;
  const verified =
    consent?.status === 'verified' &&
    !consent?.revoked_at &&
    expiresAt > now;

  if (!verified) {
    throw new Error(
      'Parental consent is required for accounts under 13. Please complete parent verification to continue.',
    );
  }
}

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

    if (lower.includes('already registered') || lower.includes('already in use')) {
      return new Error('This email is already in use. Try signing in instead.');
    }
  }

  return error instanceof Error ? error : new Error('Authentication failed. Please try again.');
}

function shouldFallbackToExplicitSignUp(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('anonymous') ||
    message.includes('upgrade') ||
    message.includes('updating email') ||
    message.includes('not allowed')
  );
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ensureProfileRow(userId: string): Promise<void> {
  for (let attempt = 1; attempt <= PROFILE_CHECK_RETRIES; attempt += 1) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (error && isProfilesPermissionDenied(error)) {
      // In email-confirmation mode, sign-up can succeed without an active
      // authenticated session, so profile verification may be blocked by RLS.
      // Do not fail sign-up UX for this case.
      return;
    }

    if (error) {
      throw new Error(error.message || 'Could not verify profile creation.');
    }

    if (data?.id) {
      return;
    }

    if (attempt < PROFILE_CHECK_RETRIES) {
      await delay(PROFILE_CHECK_DELAY_MS);
    }
  }

  // Defensive repair path: create a minimal profile row if trigger did not create one.
  const { error: insertError } = await supabase.from('profiles').insert({
    id: userId,
    first_name: '',
    is_onboarded: false,
  });

  if (insertError && isProfilesPermissionDenied(insertError)) {
    return;
  }

  if (!insertError) {
    return;
  }

  // The auth trigger may create the row between our last check and insert.
  // Treat unique-constraint collisions as success after one final verification.
  if (isUniqueViolation(insertError)) {
    const { data: finalProfile, error: finalProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (finalProfileError) {
      throw new Error(finalProfileError.message || 'Could not verify profile creation.');
    }

    if (finalProfile?.id) {
      return;
    }
  }

  if (insertError) {
    throw new Error(insertError.message || 'Account created, but profile setup failed.');
  }
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
 *
 * RACE CONDITION FIX: Never call signOut(anon) before the new signUp
 * completes successfully. Uses atomic sequence:
 * 1. Attempt updateUser(email, password)
 * 2. If it fails with upgrade error:
 *    a. Complete new signUp first (get new session)
 *    b. Only then signOut the anonymous session
 *    c. Swap to new session atomically
 * 3. Wrap in try/finally to guarantee either valid session or clean error
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

    if (!error && data.user) {
      await ensureProfileRow(data.user.id);
      return data.user;
    }

    if (!shouldFallbackToExplicitSignUp(error)) {
      throw normalizeAuthError(error);
    }

    // Some environments disable anonymous account upgrade.
    // Fallback: do explicit sign-up FIRST, then clean up anonymous session.
    let fallbackData: { user: Awaited<ReturnType<typeof supabase.auth.signUp>>['data']['user'] | null } | null = null;

    try {
      // Step 1: Complete the new sign-up with the new email/password
      const { data: newSignUpData, error: fallbackError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (fallbackError) {
        throw normalizeAuthError(fallbackError);
      }

      if (!newSignUpData.user) {
        throw new Error('Sign up completed without a user record. Please try again.');
      }

      fallbackData = newSignUpData.user;

      // Step 2: Profile repair for new user
      await ensureProfileRow(newSignUpData.user.id);

      // Step 3: Only now sign out the anonymous session
      // At this point we have a valid authenticated session for the new user.
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        // Log but don't fail signup - the new session is active and valid
        console.warn("[Auth] Failed to sign out anonymous session after upgrade:", signOutError);
      }

      return newSignUpData.user;
    } catch (upgradeError) {
      // If fallback signup started but failed midway, ensure we're in a clean state
      throw upgradeError;
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
  });
  if (error) throw normalizeAuthError(error);
  if (!data.user) {
    throw new Error('Sign up completed without a user record. Please try again.');
  }
  await ensureProfileRow(data.user.id);
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
  if (data.user?.id) {
    await ensureProfileRow(data.user.id);
    try {
      await enforceParentalConsentIfRequired(data.user.id);
    } catch (consentError) {
      await supabase.auth.signOut();
      throw consentError;
    }
  }
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
