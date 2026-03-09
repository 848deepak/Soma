/**
 * __tests__/unit/useAuth.test.ts
 * Unit tests for the useAuth reactive auth hook.
 */
import { renderHook, waitFor, act } from '@testing-library/react-native';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

// Supabase is intercepted by moduleNameMapper → lib/__mocks__/supabase.ts
import { supabase } from '@/lib/supabase';

import { useAuth } from '@/lib/useAuth';

const mockSupabaseAuth = supabase.auth as jest.Mocked<typeof supabase.auth>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    access_token: 'test-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      is_anonymous: false,
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      ...overrides.user,
    },
    ...overrides,
  } as Session;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no session
    mockSupabaseAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockSupabaseAuth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    } as unknown as ReturnType<typeof supabase.auth.onAuthStateChange>);
  });

  describe('initial loading state', () => {
    it('starts with isLoading true', () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(true);
    });

    it('starts with null session and user', () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.session).toBeNull();
      expect(result.current.user).toBeNull();
    });

    it('starts with isAuthenticated false', () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('unauthenticated state', () => {
    it('resolves to unauthenticated when no session exists', async () => {
      const { result } = renderHook(() => useAuth());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.session).toBeNull();
      expect(result.current.user).toBeNull();
    });

    it('marks as anonymous when no session', async () => {
      const { result } = renderHook(() => useAuth());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      // No user at all → isAnonymous per logic: user?.email == null → true
      expect(result.current.isAnonymous).toBe(true);
    });
  });

  describe('authenticated state with email account', () => {
    beforeEach(() => {
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: makeSession() },
        error: null,
      });
    });

    it('resolves to authenticated when session exists', async () => {
      const { result } = renderHook(() => useAuth());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isAuthenticated).toBe(true);
    });

    it('exposes the user from session', async () => {
      const { result } = renderHook(() => useAuth());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.user?.email).toBe('test@example.com');
      expect(result.current.user?.id).toBe('test-user-id');
    });

    it('marks as not anonymous for email user', async () => {
      const { result } = renderHook(() => useAuth());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isAnonymous).toBe(false);
    });
  });

  describe('anonymous session', () => {
    beforeEach(() => {
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: {
          session: makeSession({
            user: {
              id: 'anon-user-id',
              email: undefined,
              is_anonymous: true,
              aud: 'authenticated',
              role: 'anon',
              app_metadata: { provider: 'anonymous' },
              user_metadata: {},
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          }),
        },
        error: null,
      });
    });

    it('marks as anonymous when user.is_anonymous is true', async () => {
      const { result } = renderHook(() => useAuth());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isAnonymous).toBe(true);
    });

    it('still marks as authenticated (session exists)', async () => {
      const { result } = renderHook(() => useAuth());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('onAuthStateChange subscription', () => {
    it('subscribes to auth state changes on mount', () => {
      renderHook(() => useAuth());
      expect(mockSupabaseAuth.onAuthStateChange).toHaveBeenCalledTimes(1);
    });

    it('unsubscribes on unmount', () => {
      const unsubscribeFn = jest.fn();
      mockSupabaseAuth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: unsubscribeFn } },
      } as unknown as ReturnType<typeof supabase.auth.onAuthStateChange>);

      const { unmount } = renderHook(() => useAuth());
      unmount();

      expect(unsubscribeFn).toHaveBeenCalledTimes(1);
    });

    it('updates session when onAuthStateChange fires', async () => {
      let capturedCallback: ((event: AuthChangeEvent, session: Session | null) => void) | null = null;

      mockSupabaseAuth.onAuthStateChange.mockImplementation((callback) => {
        capturedCallback = callback;
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        } as unknown as ReturnType<typeof supabase.auth.onAuthStateChange>;
      });

      const { result } = renderHook(() => useAuth());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Simulate a sign-in event
      const newSession = makeSession();
      act(() => {
        capturedCallback?.('SIGNED_IN', newSession);
      });

      expect(result.current.session).toEqual(newSession);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('clears session when SIGNED_OUT event fires', async () => {
      let capturedCallback: ((event: AuthChangeEvent, session: Session | null) => void) | null = null;

      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: makeSession() },
        error: null,
      });
      mockSupabaseAuth.onAuthStateChange.mockImplementation((callback) => {
        capturedCallback = callback;
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        } as unknown as ReturnType<typeof supabase.auth.onAuthStateChange>;
      });

      const { result } = renderHook(() => useAuth());
      await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

      act(() => {
        capturedCallback?.('SIGNED_OUT', null);
      });

      expect(result.current.session).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('AuthState interface shape', () => {
    it('returns all expected fields', async () => {
      const { result } = renderHook(() => useAuth());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('session');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isAuthenticated');
      expect(result.current).toHaveProperty('isAnonymous');
    });
  });
});
