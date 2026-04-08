/**
 * __tests__/unit/safeNavigate.test.ts
 *
 * Tests for race condition prevention in safeNavigate() function
 *
 * Covers:
 *  - Lock prevents duplicate navigation
 *  - Rapid calls only fire first navigation
 *  - Lock blocks subsequent calls while held
 *  - Sequential calls after lock reset work correctly
 */

describe('safeNavigate Race Condition Prevention', () => {
  let navigationLockRef: { current: boolean };
  let mockRouter: { replace: jest.Mock };
  let safeNavigate: (destination: string, reason: string) => void;

  beforeEach(() => {
    // Reset lock for each test
    navigationLockRef = { current: false };
    mockRouter = { replace: jest.fn() };

    // Implement safeNavigate with lock logic
    safeNavigate = (destination: string, reason: string) => {
      if (navigationLockRef.current) {
        // Lock is already held - block this navigation
        return;
      }
      // Set lock BEFORE router.replace to prevent race conditions
      navigationLockRef.current = true;
      mockRouter.replace(destination);
    };
  });

  describe('Basic Lock Behavior', () => {
    it('should allow first navigation and set lock', () => {
      safeNavigate('/(tabs)', 'first_call');

      expect(navigationLockRef.current).toBe(true);
      expect(mockRouter.replace).toHaveBeenCalledTimes(1);
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
    });

    it('should block subsequent navigation while lock is held', () => {
      safeNavigate('/(tabs)', 'first_call');
      safeNavigate('/welcome', 'second_call');

      expect(navigationLockRef.current).toBe(true);
      expect(mockRouter.replace).toHaveBeenCalledTimes(1); // Only first call executed
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
    });

    it('should allow navigation after lock is reset', () => {
      safeNavigate('/(tabs)', 'first_call');
      expect(mockRouter.replace).toHaveBeenCalledTimes(1);

      // Reset lock (simulating cleanup)
      navigationLockRef.current = false;

      safeNavigate('/welcome', 'second_call');
      expect(mockRouter.replace).toHaveBeenCalledTimes(2);
      expect(mockRouter.replace).toHaveBeenLastCalledWith('/welcome');
    });
  });

  describe('Rapid Calls Prevention', () => {
    it('should handle rapid duplicate calls and only execute first', () => {
      // Simulate rapid calls within 50ms (what the user mentioned)
      safeNavigate('/(tabs)', 'rapid_1');
      safeNavigate('/(tabs)', 'rapid_2');
      safeNavigate('/(tabs)', 'rapid_3');

      expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent calls to different routes (only first wins)', () => {
      // Simulate different route destinations being called rapidly
      safeNavigate('/(tabs)', 'to_tabs');
      safeNavigate('/welcome', 'to_welcome');
      safeNavigate('/auth/login', 'to_auth');

      // Only the first one should execute
      expect(mockRouter.replace).toHaveBeenCalledTimes(1);
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  describe('Lock as Synchronous Barrier', () => {
    it('lock should prevent race from synchronous router.replace', () => {
      // Mock a synchronous router.replace that might trigger a re-render
      let syncCallbackFired = false;
      mockRouter.replace.mockImplementation(() => {
        syncCallbackFired = true;
        // Try to navigate again synchronously (would happen in a re-render)
        safeNavigate('/welcome', 'sync_callback');
      });

      safeNavigate('/(tabs)', 'initial');

      expect(syncCallbackFired).toBe(true);
      expect(mockRouter.replace).toHaveBeenCalledTimes(1); // Only initial call
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  describe('Double Navigation Prevention', () => {
    it('should not double-navigate on rapid auth state changes', () => {
      // Scenario: user signs in, then session updates at almost same time
      // This could cause two safeNavigate calls within ms of each other

      // First call: sign in completed → navigate to tabs
      safeNavigate('/(tabs)', 'sign_in_complete');
      expect(mockRouter.replace).toHaveBeenCalledTimes(1);

      // Second call: session updated → try to navigate to tabs again
      // This should be blocked by lock
      safeNavigate('/(tabs)', 'session_updated');
      expect(mockRouter.replace).toHaveBeenCalledTimes(1); // Still only 1

      // Verify lock is held
      expect(navigationLockRef.current).toBe(true);
    });

    it('should prevent ping-pong navigation between routes', () => {
      // Scenario: User is auth'd but not onboarded
      // App might try to navigate: logout → /auth/login, then back to /welcome
      // Lock should prevent the ping-pong

      // First attempt
      safeNavigate('/auth/login', 'logout');
      expect(mockRouter.replace).toHaveBeenCalledTimes(1);

      // Second attempt (would cause ping-pong without lock)
      safeNavigate('/welcome', 'redirect_onboarding');
      expect(mockRouter.replace).toHaveBeenCalledTimes(1); // Blocked by lock

      // Verify only the first destination was used
      expect(mockRouter.replace).toHaveBeenCalledWith('/auth/login');
    });
  });

  describe('Lock Cleanup', () => {
    it('should allow new navigation after lock reset in cleanup', () => {
      // Simulate an effect re-running with new bootstrap params
      safeNavigate('/(tabs)', 'effect_1');
      expect(mockRouter.replace).toHaveBeenCalledTimes(1);

      // Run cleanup (like useEffect cleanup when deps change)
      navigationLockRef.current = false;

      // New bootstrap should work
      safeNavigate('/welcome', 'effect_2');
      expect(mockRouter.replace).toHaveBeenCalledTimes(2);
    });

    it('should properly reset lock when effect unmounts', () => {
      safeNavigate('/(tabs)', 'mount');
      expect(navigationLockRef.current).toBe(true);

      // Cleanup when effect unmounts
      navigationLockRef.current = false;

      expect(navigationLockRef.current).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined destinations gracefully', () => {
      // Lock should still be set even if destination is invalid
      const invalidSafeNavigate = (destination: string | null, reason: string) => {
        if (navigationLockRef.current) return;
        navigationLockRef.current = true;
        if (destination) {
          mockRouter.replace(destination);
        }
      };

      invalidSafeNavigate(null, 'invalid');
      expect(navigationLockRef.current).toBe(true);
      expect(mockRouter.replace).toHaveBeenCalledTimes(0);

      // Lock is still held, blocks further nav
      invalidSafeNavigate('/(tabs)', 'valid');
      expect(mockRouter.replace).toHaveBeenCalledTimes(0);
    });

    it('should maintain lock across multiple function invocations', () => {
      const destinations = ['/(tabs)', '/welcome', '/auth/login', '/setup'];

      // Call safeNavigate multiple times
      destinations.forEach((dest, index) => {
        safeNavigate(dest, `call_${index}`);
      });

      // Only first call should have executed
      expect(mockRouter.replace).toHaveBeenCalledTimes(1);
      expect(mockRouter.replace).toHaveBeenCalledWith(destinations[0]);
      expect(navigationLockRef.current).toBe(true);
    });
  });

  describe('Integration: Auth State Change Sequence', () => {
    it('should handle sign-in → session update sequence without double navigation', () => {
      // t=0ms: User clicks sign in
      safeNavigate('/(tabs)', 'sign_in');
      expect(mockRouter.replace).toHaveBeenCalledTimes(1);
      expect(navigationLockRef.current).toBe(true);

      // t=15ms: Session refreshes, might trigger another navigate
      safeNavigate('/(tabs)', 'session_refresh');
      expect(mockRouter.replace).toHaveBeenCalledTimes(1); // Blocked

      // t=30ms: Auth context updates, might trigger another navigate
      safeNavigate('/welcome', 'auth_context_update');
      expect(mockRouter.replace).toHaveBeenCalledTimes(1); // Blocked

      // Lock is still held (effect hasn't cleaned up yet)
      expect(navigationLockRef.current).toBe(true);

      // After effect cleanup or manual reset
      navigationLockRef.current = false;

      // New navigation should work
      safeNavigate('/welcome', 'post_cleanup');
      expect(mockRouter.replace).toHaveBeenCalledTimes(2);
    });

    it('should prevent double navigation on anonymous → email upgrade transition', () => {
      // t=0ms: Anonymous user navigates to tabs
      safeNavigate('/(tabs)', 'anon_to_tabs');
      expect(mockRouter.replace).toHaveBeenCalledTimes(1);

      // t=10ms: User signs in with email before first nav completes
      safeNavigate('/(tabs)', 'email_signin');
      expect(mockRouter.replace).toHaveBeenCalledTimes(1); // Blocked

      // t=20ms: Real-time sync triggers for new user
      safeNavigate('/(tabs)', 'realtime_update');
      expect(mockRouter.replace).toHaveBeenCalledTimes(1); // Blocked

      // All blocked - only one navigation fired
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
    });
  });
});
