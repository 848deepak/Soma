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
import { logAuthEvent } from "@/lib/logAuthEvent";

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
    let initialSessionResolved = false;

    const finalizeInitialLoading = () => {
      if (isMounted) {
        setIsLoading(false);
      }
    };

    // Subscribe first so we never miss an auth event during startup.
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMounted) return;

        setSession(newSession);
        if (event === "INITIAL_SESSION" || initialSessionResolved) {
          setIsLoading(false);
        }
      },
    );

    const resolveInitialSession = async () => {
      try {
        // Keep startup bounded while still allowing persisted session restoration.
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.warn(
              "[Auth] Session timeout after 3s, defaulting to no session",
            );
            initialSessionResolved = true;
            setSession(null);
            finalizeInitialLoading();
            logAuthEvent({
              type: "session_restore",
              success: false,
              error: "Session timeout",
            });
          }
        }, 3000);

        const { data, error } = await supabase.auth.getSession();

        if (isMounted) {
          clearTimeout(timeoutId);
          initialSessionResolved = true;
          if (error) {
            console.warn("[Auth] Session error:", error.message);
            setSession(null);
            logAuthEvent({
              type: "session_restore",
              success: false,
              error: error.message,
            });
          } else {
            setSession(data.session ?? null);
            logAuthEvent({
              type: "session_restore",
              success: !!data.session,
              userId: data.session?.user?.id,
            });
          }
          finalizeInitialLoading();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown session error";
        console.warn("[Auth] Session resolution error:", message);
        if (isMounted) {
          clearTimeout(timeoutId);
          initialSessionResolved = true;
          setSession(null);
          finalizeInitialLoading();
          logAuthEvent({
            type: "session_restore",
            success: false,
            error: message,
          });
        }
      }
    };

    resolveInitialSession();

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
