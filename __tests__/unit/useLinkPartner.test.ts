import {
  ensurePartnerInviteCodeAction,
  isInviteCodeFormat,
  linkPartnerAction,
  normalizeInviteCode,
} from '@/hooks/useLinkPartner';

jest.mock('@/lib/supabase');

import { supabase } from '@/lib/supabase';

describe('useLinkPartner actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeInviteCode', () => {
    it('normalizes plain 6-char codes into segmented format', () => {
      expect(normalizeInviteCode('ab12cd')).toBe('AB-12-CD');
      expect(normalizeInviteCode('AB-12-CD')).toBe('AB-12-CD');
    });

    it('throws for invalid invite code length', () => {
      expect(() => normalizeInviteCode('ABC')).toThrow(
        'Invite code must be 6 letters or numbers.',
      );
    });

    it('validates invite code shape for QR render readiness', () => {
      expect(isInviteCodeFormat('AB-12-CD')).toBe(true);
      expect(isInviteCodeFormat('AB12CD')).toBe(false);
      expect(isInviteCodeFormat('')).toBe(false);
      expect(isInviteCodeFormat(null)).toBe(false);
    });
  });

  describe('linkPartnerAction', () => {
    it('calls link_partner with normalized invite code', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: {
          id: 'partner-1',
          invite_code: 'AB-12-CD',
        },
        error: null,
      });

      const result = await linkPartnerAction('ab12cd');

      expect(supabase.rpc).toHaveBeenCalledWith('link_partner', {
        code: 'AB-12-CD',
      });
      expect(result.id).toBe('partner-1');
    });

    it('throws when Supabase response payload is invalid', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: null });

      await expect(linkPartnerAction('ab12cd')).rejects.toThrow(
        'Unexpected response while linking partner. Please try again.',
      );
    });
  });

  describe('ensurePartnerInviteCodeAction', () => {
    it('returns existing valid code without generating a new one', async () => {
      const code = await ensurePartnerInviteCodeAction('AB-12-CD');
      expect(code).toBe('AB-12-CD');
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('generates and persists a new invite code when current code is missing', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-1' } },
      });
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: 'ZX-98-KL',
        error: null,
      });

      const eq = jest.fn().mockResolvedValue({ error: null });
      const update = jest.fn().mockReturnValue({ eq });
      (supabase.from as jest.Mock).mockReturnValue({ update });

      const code = await ensurePartnerInviteCodeAction(null);

      expect(code).toBe('ZX-98-KL');
      expect(supabase.rpc).toHaveBeenCalledWith('generate_partner_code');
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(update).toHaveBeenCalledWith({ partner_link_code: 'ZX-98-KL' });
      expect(eq).toHaveBeenCalledWith('id', 'user-1');
    });
  });
});
