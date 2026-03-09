/**
 * lib/useAuth.ts
 * React hook for reactive Supabase authentication state.
 *
 * Returns the current session, user, loading state, and
 * convenience booleans so screens can gate content on auth status.
 *
 * The hook subscribes to onAuthStateChange so it updates immediately
 * when the user signs in, signs out, or the token refreshes.
 */
import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

export interface AuthState {
  user: User | null;
  session: Session | null;
  /** True while the initial session is being resolved from AsyncStorage. */
  isLoading: boolean;
  /** True once loading is complete and a valid session exists. */
  isAuthenticated: boolean;
  /** True if the active session is an anonymous (non-email) account. */
  isAnonymous: boolean;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Resolve any existing persisted session from AsyncStorage on mount
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setIsLoading(false);
    });

    // Subscribe to future auth state changes (sign-in, sign-out, token refresh)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setIsLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const user = session?.user ?? null;
  const isAuthenticated = !isLoading && session !== null;
  // An anonymous user has no email and their app_metadata.provider is 'anonymous'
  const isAnonymous = user?.is_anonymous === true || user?.email == null;

  return { user, session, isLoading, isAuthenticated, isAnonymous };
}
