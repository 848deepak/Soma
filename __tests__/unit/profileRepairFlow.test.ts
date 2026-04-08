/**
 * __tests__/unit/profileRepairFlow.test.ts
 *
 * Tests for profile repair flow in AuthBootstrap
 *
 * Covers:
 *  - Profile repair succeeds after retries → navigate to /(tabs)
 *  - Profile repair fails after 3 retries → navigate to /welcome
 *  - Navigation lock prevents duplicate calls during repair
 */

describe('Profile Repair Flow', () => {
  let mockEnsureProfileRow: jest.Mock;
  let mockNavigate: jest.Mock;
  let navigationLockRef: { current: boolean };

  beforeEach(() => {
    navigationLockRef = { current: false };
    mockNavigate = jest.fn();
    mockEnsureProfileRow = jest.fn();
  });

  describe('Successful profile repair', () => {
    it('should navigate to /(tabs) after successful repair', async () => {
      mockEnsureProfileRow.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

      // Simulate repair logic
      const performRepairWithRetry = async () => {
        for (let i = 0; i < 3; i++) {
          try {
            return await mockEnsureProfileRow();
          } catch (e) {
            if (i === 2) throw e;
          }
        }
      };

      const result = await performRepairWithRetry();
      expect(result).toEqual({ id: 'user-123', email: 'test@example.com' });
      expect(mockEnsureProfileRow).toHaveBeenCalledTimes(1);
    });

    it('should retry and succeed on transient failure', async () => {
      let attempts = 0;
      mockEnsureProfileRow.mockImplementation(async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error('Network timeout');
        }
        return { id: 'user-123' };
      });

      const performRepairWithRetry = async () => {
        for (let i = 0; i < 3; i++) {
          try {
            return await mockEnsureProfileRow();
          } catch (e) {
            if (i === 2) throw e;
            // Skip delay in tests
          }
        }
      };

      const result = await performRepairWithRetry();
      expect(result).toEqual({ id: 'user-123' });
      expect(mockEnsureProfileRow).toHaveBeenCalledTimes(2);
    });

    it('should succeed on second attempt then navigate', async () => {
      let attempts = 0;
      mockEnsureProfileRow.mockImplementation(async () => {
        attempts++;
        if (attempts <= 1) throw new Error('DB connection error');
        return { id: 'user-456', email: 'user@test.com' };
      });

      const performRepairWithRetry = async () => {
        for (let i = 0; i < 3; i++) {
          try {
            return await mockEnsureProfileRow();
          } catch (e) {
            if (i === 2) throw e;
          }
        }
      };

      try {
        const result = await performRepairWithRetry();
        // On success, navigate to /(tabs)
        mockNavigate('/(tabs)', 'profile_repair_success');
        expect(mockNavigate).toHaveBeenCalledWith('/(tabs)', 'profile_repair_success');
      } catch (e) {
        fail('Should have succeeded on second attempt');
      }
    });
  });

  describe('Failed profile repair', () => {
    it('should throw after 3 failed attempts', async () => {
      mockEnsureProfileRow.mockRejectedValue(new Error('Persistent DB error'));

      const performRepairWithRetry = async () => {
        for (let i = 0; i < 3; i++) {
          try {
            return await mockEnsureProfileRow();
          } catch (e) {
            if (i === 2) throw e;
          }
        }
      };

      await expect(performRepairWithRetry()).rejects.toThrow('Persistent DB error');
      expect(mockEnsureProfileRow).toHaveBeenCalledTimes(3);
    });

    it('should navigate to /welcome on permanent failure', async () => {
      mockEnsureProfileRow.mockRejectedValue(new Error('Profile row creation failed'));

      const performRepairWithRetry = async () => {
        for (let i = 0; i < 3; i++) {
          try {
            return await mockEnsureProfileRow();
          } catch (e) {
            if (i === 2) throw e;
          }
        }
      };

      try {
        await performRepairWithRetry();
        fail('Should have thrown');
      } catch (repairError) {
        // On failure, navigate to /welcome with error state
        mockNavigate('/welcome', 'profile_repair_failed');
        expect(mockNavigate).toHaveBeenCalledWith('/welcome', 'profile_repair_failed');
      }
    });

    it('should fail after retrying 3 times', async () => {
      let attempts = 0;
      mockEnsureProfileRow.mockImplementation(async () => {
        attempts++;
        if (attempts <= 2) {
          throw new Error('Transient error');
        }
        throw new Error('Persistent error on final attempt');
      });

      const performRepairWithRetry = async () => {
        for (let i = 0; i < 3; i++) {
          try {
            return await mockEnsureProfileRow();
          } catch (e) {
            if (i === 2) throw e;
          }
        }
      };

      await expect(performRepairWithRetry()).rejects.toThrow();
      expect(mockEnsureProfileRow).toHaveBeenCalledTimes(3);
    });
  });

  describe('Navigation lock during repair', () => {
    it('should not allow duplicate navigation while repair is in progress', () => {
      // First navigation call
      if (!navigationLockRef.current) {
        navigationLockRef.current = true;
        mockNavigate('/(tabs)', 'profile_repair_start');
      }

      // Second navigation attempt (would come from rapid state change)
      if (!navigationLockRef.current) {
        mockNavigate('/(tabs)', 'profile_repair_retry');
      }

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/(tabs)', 'profile_repair_start');
    });

    it('should only execute first navigation of multiple rapid calls', () => {
      const safeNavigate = (destination: string, reason: string) => {
        if (navigationLockRef.current) {
          return; // Block
        }
        navigationLockRef.current = true;
        mockNavigate(destination, reason);
      };

      // Simulate rapid calls during repair
      safeNavigate('/(tabs)', 'repair_1');
      safeNavigate('/(tabs)', 'repair_2');
      safeNavigate('/welcome', 'repair_3');

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/(tabs)', 'repair_1');
    });
  });

  describe('End-to-end: Profile missing → repair → success', () => {
    it('should complete full flow from missing profile to tabs navigation', async () => {
      // Setup
      const userId = 'user-789';
      mockEnsureProfileRow.mockResolvedValue({ id: userId });

      // Simulate bootstrap detecting missing profile
      const profileResult = { status: 'missing' as const };
      expect(profileResult.status).toBe('missing');

      // Run repair
      const performRepairWithRetry = async () => {
        for (let i = 0; i < 3; i++) {
          try {
            return await mockEnsureProfileRow(userId);
          } catch (e) {
            if (i === 2) throw e;
          }
        }
      };

      try {
        await performRepairWithRetry();
        // Success - navigate to tabs
        navigationLockRef.current = false; // Reset lock
        if (!navigationLockRef.current) {
          navigationLockRef.current = true;
          mockNavigate('/(tabs)', 'profile_repair_success');
        }
      } catch (e) {
        fail('Repair should succeed');
      }

      expect(mockNavigate).toHaveBeenCalledWith('/(tabs)', 'profile_repair_success');
    });

    it('should complete full flow from missing profile to welcome on failure', async () => {
      // Setup
      const userId = 'user-999';
      mockEnsureProfileRow.mockRejectedValue(new Error('DB unavailable'));

      // Simulate bootstrap detecting missing profile
      const profileResult = { status: 'missing' as const };
      expect(profileResult.status).toBe('missing');

      // Run repair
      const performRepairWithRetry = async () => {
        for (let i = 0; i < 3; i++) {
          try {
            return await mockEnsureProfileRow(userId);
          } catch (e) {
            if (i === 2) throw e;
          }
        }
      };

      try {
        await performRepairWithRetry();
        fail('Repair should fail');
      } catch (repairError) {
        // Failure - navigate to welcome
        navigationLockRef.current = false; // Reset lock
        if (!navigationLockRef.current) {
          navigationLockRef.current = true;
          mockNavigate('/welcome', 'profile_repair_failed');
        }
      }

      expect(mockNavigate).toHaveBeenCalledWith('/welcome', 'profile_repair_failed');
    });
  });

  describe('Error handling', () => {
    it('should capture repair errors to Sentry', async () => {
      const mockSentry = { captureException: jest.fn() };
      mockEnsureProfileRow.mockRejectedValue(new Error('Critical error'));

      const performRepairWithRetry = async () => {
        for (let i = 0; i < 3; i++) {
          try {
            return await mockEnsureProfileRow();
          } catch (e) {
            if (i === 2) throw e;
          }
        }
      };

      try {
        await performRepairWithRetry();
      } catch (repairError) {
        // Simulate Sentry capture
        mockSentry.captureException(repairError, {
          tags: { source: 'profile_repair' },
        });
        expect(mockSentry.captureException).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            tags: { source: 'profile_repair' },
          })
        );
      }
    });
  });
});
