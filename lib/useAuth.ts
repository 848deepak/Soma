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
import type { Session, User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

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
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const resolveInitialSession = async () => {
      try {
        // Reduced timeout to 3 seconds for faster failure and app startup
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.warn(
              "[Auth] Session timeout after 3s, defaulting to no session",
            );
            setSession(null);
            setIsLoading(false);
          }
        }, 3000);

        const { data, error } = await supabase.auth.getSession();

        if (isMounted) {
          clearTimeout(timeoutId);
          if (error) {
            console.warn("[Auth] Session error:", error.message);
            setSession(null);
          } else {
            setSession(data.session ?? null);
          }
          setIsLoading(false);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown session error";
        console.warn("[Auth] Session resolution error:", message);
        if (isMounted) {
          clearTimeout(timeoutId);
          setSession(null);
          setIsLoading(false);
        }
      }
    };

    resolveInitialSession();

    // Subscribe to auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (isMounted) {
          setSession(newSession);
          setIsLoading(false);
        }
      },
    );

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      listener.subscription.unsubscribe();
    };
  }, []);

  const user = session?.user ?? null;
  const isAuthenticated = !isLoading && session !== null;
  // An anonymous user has no email and their app_metadata.provider is 'anonymous'
  const isAnonymous = user?.is_anonymous === true || user?.email == null;

  return { user, session, isLoading, isAuthenticated, isAnonymous };
}
