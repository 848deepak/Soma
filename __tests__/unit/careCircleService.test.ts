/**
 * __tests__/unit/careCircleService.test.ts
 * Unit tests for Care Circle service layer: role-based connection management
 */

import type { PartnerRow } from '@/types/database';
import {
  createConnection,
  getConnections,
  getSharedData,
  updatePermissions,
  revokeConnection,
  acceptConnection,
  coercePermissions,
  roleAllowsField,
} from '@/src/services/careCircleService';

jest.mock('@/lib/supabase');
jest.mock('@/src/services/auditService');

import { supabase } from '@/lib/supabase';

const mockPartnerRow = (overrides: Partial<PartnerRow> = {}): PartnerRow => ({
  id: 'partner-1',
  user_id: 'user-2',
  partner_user_id: 'user-2',
  status: 'active' as const,
  invite_code: 'AB-12-CD',
  permissions: {
    share_mood: true,
    share_fertility: true,
    share_symptoms: true,
    share_notes: true,
    role: 'viewer',
  },
  created_at: '2026-03-26T00:00:00Z',
  updated_at: '2026-03-26T00:00:00Z',
  ...overrides,
});

describe('careCircleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('coercePermissions', () => {
    it('provides safe defaults for old rows missing role/share_notes', () => {
      const result = coercePermissions({
        share_mood: true,
        share_fertility: false,
        share_symptoms: true,
      });

      expect(result.role).toBe('viewer');
      expect(result.share_notes).toBe(false);
      expect(result.share_mood).toBe(true);
    });

    it('preserves existing role and share_notes when present', () => {
      const result = coercePermissions({
        share_mood: true,
        share_fertility: true,
        share_symptoms: true,
        share_notes: true,
        role: 'trusted',
      });

      expect(result.role).toBe('trusted');
      expect(result.share_notes).toBe(true);
    });

    it('defaults to safe values when permissions object is empty', () => {
      const result = coercePermissions({});

      expect(result.share_mood).toBe(true);
      expect(result.share_fertility).toBe(true);
      expect(result.share_symptoms).toBe(false);
      expect(result.share_notes).toBe(false);
      expect(result.role).toBe('viewer');
    });
  });

  describe('roleAllowsField', () => {
    it('viewer role only allows fertility fields', () => {
      expect(roleAllowsField('viewer', 'fertility')).toBe(true);
      expect(roleAllowsField('viewer', 'cycle_phase')).toBe(false);
      expect(roleAllowsField('viewer', 'mood')).toBe(false);
      expect(roleAllowsField('viewer', 'symptoms')).toBe(false);
      expect(roleAllowsField('viewer', 'notes')).toBe(false);
    });

    it('trusted role allows all fields', () => {
      expect(roleAllowsField('trusted', 'cycle_phase')).toBe(true);
      expect(roleAllowsField('trusted', 'mood')).toBe(true);
      expect(roleAllowsField('trusted', 'symptoms')).toBe(true);
      expect(roleAllowsField('trusted', 'fertility')).toBe(true);
      expect(roleAllowsField('trusted', 'notes')).toBe(true);
    });

    it('mutual role allows all fields', () => {
      expect(roleAllowsField('mutual', 'cycle_phase')).toBe(true);
      expect(roleAllowsField('mutual', 'mood')).toBe(true);
      expect(roleAllowsField('mutual', 'symptoms')).toBe(true);
      expect(roleAllowsField('mutual', 'fertility')).toBe(true);
      expect(roleAllowsField('mutual', 'notes')).toBe(true);
    });
  });

  describe('createConnection', () => {
    it('successfully creates connection with viewer role', async () => {
      const partner = mockPartnerRow({
        permissions: { ...mockPartnerRow().permissions, role: 'viewer' },
      });
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: partner,
        error: null,
      });

      const result = await createConnection('AB-12-CD');

      expect(supabase.rpc).toHaveBeenCalledWith('link_partner', {
        code: 'AB-12-CD',
        role: 'viewer',
      });
      expect(result.id).toBe('partner-1');
    });

    it('successfully creates connection with trusted role', async () => {
      const partner = mockPartnerRow({
        permissions: { ...mockPartnerRow().permissions, role: 'trusted' },
      });
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: partner,
        error: null,
      });

      const result = await createConnection('AB-12-CD', 'trusted');

      expect(supabase.rpc).toHaveBeenCalledWith('link_partner', {
        code: 'AB-12-CD',
        role: 'trusted',
      });
      expect(result.id).toBe('partner-1');
    });

    it('throws "Invalid or expired invite code" on invalid code error', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: {
          message: 'Invalid partner code',
        },
      });

      await expect(createConnection('XX-XX-XX')).rejects.toThrow(
        'Invalid or expired invite code',
      );
    });

    it('throws "You cannot link to yourself" on self-link attempt', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: {
          message: 'cannot link to yourself',
        },
      });

      await expect(createConnection('AB-12-CD')).rejects.toThrow(
        'You cannot link to yourself',
      );
    });

    it('throws error when code is empty', async () => {
      await expect(createConnection('')).rejects.toThrow(
        'Invite code cannot be empty',
      );
    });

    it('throws error on invalid role', async () => {
      await expect(
        createConnection('AB-12-CD', 'invalid' as any),
      ).rejects.toThrow('Invalid role');
    });
  });

  describe('getConnections', () => {
    it('returns both primary and viewer perspectives', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-1' } },
      });

      (supabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }));

      const result = await getConnections();

      expect(result).toHaveProperty('asPrimary');
      expect(result).toHaveProperty('asViewer');
      expect(Array.isArray(result.asPrimary)).toBe(true);
      expect(Array.isArray(result.asViewer)).toBe(true);
    });

    it('returns empty arrays when not authenticated', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      const result = await getConnections();

      expect(result).toEqual({ asPrimary: [], asViewer: [] });
    });
  });

  describe('getSharedData', () => {
    it('fetches shared data from shared_data VIEW', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          user_id: 'user-2',
          date: '2026-03-26',
          cycle_phase: 'ovulation',
          cycle_day: 14,
          cycle_id: 'cycle-1',
          mood: 'Happy',
          energy_level: 'High',
          symptoms: ['Tender'],
          flow_level: 2,
          fertility_flow_level: 3,
          notes: 'Great day',
          partner_alert: false,
          updated_at: '2026-03-26T12:00:00Z',
          predicted_ovulation: '2026-03-26',
          predicted_next_cycle: '2026-04-23',
          connection_role: 'viewer',
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: mockLogs,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await getSharedData('user-2');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('log-1');
    });

    it('throws "Connection not found" on RLS denial', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'Permission denied' },
              }),
            }),
          }),
        }),
      });

      await expect(getSharedData('unknown-user')).rejects.toThrow(
        'Connection not found or access denied',
      );
    });
  });

  describe('updatePermissions', () => {
    it('merges partial permission updates with existing permissions', async () => {
      const partner = mockPartnerRow();
      (supabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: { permissions: partner.permissions }, error: null }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest
                .fn()
                .mockResolvedValue({ data: partner, error: null }),
            }),
          }),
        }),
      }));

      const result = await updatePermissions('partner-1', {
        share_mood: false,
      });

      expect(result).toEqual(partner);
    });

    it('throws error when connection not found', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      await expect(
        updatePermissions('partner-1', { share_mood: false }),
      ).rejects.toThrow('Connection not found');
    });
  });

  describe('revokeConnection', () => {
    it('updates connection status to revoked', async () => {
      const { supabase: supabaseMock } = jest.requireMock('@/lib/supabase');
      (supabaseMock.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      await expect(revokeConnection('partner-1')).resolves.not.toThrow();
    });

    it('throws error on update failure', async () => {
      const testError = new Error('Update failed');
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: testError,
          }),
        }),
      });

      await expect(revokeConnection('partner-1')).rejects.toThrow('Update failed');
    });
  });

  describe('acceptConnection', () => {
    it('updates connection status to active', async () => {
      const partner = mockPartnerRow({ status: 'active' });
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: partner,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await acceptConnection('partner-1');

      expect(result).toEqual(partner);
    });
  });
});
