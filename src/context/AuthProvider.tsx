/**
 * src/context/AuthProvider.tsx
 * React Context provider that exposes auth state to the entire app tree.
 *
 * Usage:
 *   const { user, isAuthenticated, isLoading } = useAuthContext();
 *
 * AuthProvider wraps the root layout so all screens can access auth state
 * without prop-drilling.
 */
import React, { createContext, useContext } from 'react';

import { useAuth, type AuthState } from '@/lib/useAuth';

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  isAnonymous: true,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Returns the current authentication state.
 * Must be used inside an <AuthProvider>.
 */
export function useAuthContext(): AuthState {
  return useContext(AuthContext);
}
