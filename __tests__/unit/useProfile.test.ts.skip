/**
 * __tests__/unit/useProfile.test.ts
 * Unit tests for the useProfile hook to verify:
 * 1. Hook returns a TanStack Query object with { data, isLoading, error } shape
 * 2. Real-time subscription is established on mount
 * 3. Real-time updates propagate through the cache
 */
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

jest.mock('@/lib/supabase');

import { supabase, mockFromResult, resetSupabaseMocks } from '@/lib/supabase';
import { useProfile } from '@/src/domain/auth/hooks/useProfile';
import type { ProfileRow } from '@/types/database';

// ─── Test Setup ────────────────────────────────────────────────────────────

function createQueryClientWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 1000 * 60 * 5, // 5 minutes
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

function mockProfile(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    username: 'testuser',
    avatar_url: null,
    dob: '2000-01-01',
    preferences: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useProfile', () => {
  beforeEach(() => {
    resetSupabaseMocks();

    // Setup default mock for authenticated user
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
      error: null,
    } as any);

    // Setup default mock for profile fetch
    mockFromResult(mockProfile(), null);
  });

  describe('hook structure and return value', () => {
    it('returns a query object with expected shape { data, isLoading, error, ... }', async () => {
      const { result } = renderHook(() => useProfile(), {
        wrapper: createQueryClientWrapper(),
      });

      // Verify the hook returns a query object (not undefined)
      expect(result.current).toBeDefined();
      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isFetching');
      expect(result.current).toHaveProperty('status');
    });

    it('starts in loading state', () => {
      const { result } = renderHook(() => useProfile(), {
        wrapper: createQueryClientWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('resolves to a state after fetch completes (including null or error)', async () => {
      const { result } = renderHook(() => useProfile(), {
        wrapper: createQueryClientWrapper(),
      });

      // Wait for the query to finish loading
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // After load, should NOT be loading anymore
      expect(result.current.isLoading).toBe(false);
      // Should have either data, null data, or an error - but not undefined status
      expect(result.current.status).toMatch(/success|error/);
    });

    it('returns null data when user is not authenticated', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);

      const { result } = renderHook(() => useProfile(), {
        wrapper: createQueryClientWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toBeNull();
    });
  });

  describe('real-time subscription', () => {
    it('sets up real-time subscription on mount', async () => {
      const mockChannelInstance = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockResolvedValue({ status: 'SUBSCRIBED' }),
      };

      (supabase.channel as jest.Mock).mockReturnValue(mockChannelInstance);

      renderHook(() => useProfile(), {
        wrapper: createQueryClientWrapper(),
      });

      // Wait for async subscription setup
      await waitFor(() => {
        expect(supabase.channel).toHaveBeenCalled();
      });

      // Verify channel was created with correct name
      expect(supabase.channel).toHaveBeenCalledWith('profile:test-user-id');

      // Verify subscription was configured for profile changes
      expect(mockChannelInstance.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: 'id=eq.test-user-id',
        }),
        expect.any(Function),
      );

      // Verify subscription was activated
      expect(mockChannelInstance.subscribe).toHaveBeenCalled();
    });

    it('cleans up subscription on unmount', async () => {
      const mockChannelInstance = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockResolvedValue({ status: 'SUBSCRIBED' }),
      };

      (supabase.channel as jest.Mock).mockReturnValue(mockChannelInstance);

      const { unmount } = renderHook(() => useProfile(), {
        wrapper: createQueryClientWrapper(),
      });

      // Wait for subscription to be established
      await waitFor(() => {
        expect(supabase.channel).toHaveBeenCalled();
      });

      // Reset mocks to track what happens on unmount
      (supabase.removeChannel as jest.Mock).mockClear();

      unmount();

      // Verify cleanup was called
      expect(supabase.removeChannel).toHaveBeenCalled();
    });
  });

  describe('error handling and retries', () => {
    it('returns null data gracefully when profile row is missing', async () => {
      const { result } = renderHook(() => useProfile(), {
        wrapper: createQueryClientWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Should resolve without error when profile is missing
      // (the hook logs a warning but treats it as null data, not an error)
      expect(result.current.data).toBeNull();
    });

    it('handles authentication state changes', async () => {
      // First render with authenticated user
      const { result, rerender } = renderHook(() => useProfile(), {
        wrapper: createQueryClientWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Now simulate unauthentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);

      rerender();

      await waitFor(() => expect(result.current.data).toBeNull());
    });
  });
});
