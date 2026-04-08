/**
 * hooks/useLinkPartner.ts
 * Mutation that calls the link_partner(code) SECURITY DEFINER RPC.
 *
 * The RPC:
 *   1. Looks up the partner_link_code in the profiles table
 *   2. Creates a partners row with status='active', partner_user_id=current_user
 *   3. Returns the created PartnerRow
 *
 * On success: invalidates PARTNER_KEY so PartnerSyncScreen updates immediately.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { PROFILE_QUERY_KEY } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { PARTNER_KEY } from '@/hooks/usePartner';
import type { PartnerRow } from '@/types/database';

const INVITE_CODE_REGEX = /^[A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{2}$/;

function isValidPartnerRow(data: unknown): data is PartnerRow {
  if (!data || typeof data !== 'object') return false;
  const candidate = data as Partial<PartnerRow>;
  return typeof candidate.id === 'string' && typeof candidate.invite_code === 'string';
}

export function normalizeInviteCode(input: string): string {
  const cleaned = input.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length !== 6) {
    throw new Error('Invite code must be 6 letters or numbers.');
  }

  return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4, 6)}`;
}

export function isInviteCodeFormat(input: string | null | undefined): boolean {
  if (!input) return false;
  return INVITE_CODE_REGEX.test(input.toUpperCase().trim());
}

export async function linkPartnerAction(
  rawCode: string,
  role?: 'viewer' | 'trusted' | 'mutual',
): Promise<PartnerRow> {
  const normalizedCode = normalizeInviteCode(rawCode);

  if (__DEV__) {
    console.debug('[PartnerSync] Attempting link with invite code:', normalizedCode, { role });
  }

  // Backward compatible: call with or without role parameter
  const rpcParams = role ? { code: normalizedCode, role } : { code: normalizedCode };
  const { data, error } = await supabase.rpc('link_partner', rpcParams);
  if (error) throw error;
  if (!isValidPartnerRow(data)) {
    throw new Error('Unexpected response while linking partner. Please try again.');
  }

  return data;
}

export async function ensurePartnerInviteCodeAction(
  currentCode: string | null | undefined,
): Promise<string> {
  const current = currentCode?.toUpperCase().trim() ?? '';
  if (isInviteCodeFormat(current)) {
    return current;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase.rpc('generate_partner_code');
  if (error) throw error;
  if (typeof data !== 'string') {
    throw new Error('Could not generate invite code.');
  }

  const generated = data.toUpperCase().trim();
  if (!isInviteCodeFormat(generated)) {
    throw new Error('Generated invite code is invalid.');
  }

  if (__DEV__) {
    console.debug('[PartnerSync] Generated invite code:', generated);
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ partner_link_code: generated })
    .eq('id', user.id);

  if (updateError) throw updateError;
  return generated;
}

export function useLinkPartner() {
  const queryClient = useQueryClient();

  return useMutation<
    PartnerRow,
    Error,
    string | { code: string; role?: 'viewer' | 'trusted' | 'mutual' }
  >({
    mutationFn: async (params) => {
      // Support both old (string code) and new (object) call styles for backward compatibility
      if (typeof params === 'string') {
        return linkPartnerAction(params);
      } else {
        return linkPartnerAction(params.code, params.role);
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARTNER_KEY });
    },
  });
}

export function useEnsurePartnerInviteCode() {
  const queryClient = useQueryClient();

  return useMutation<string, Error, string | null | undefined>({
    mutationFn: ensurePartnerInviteCodeAction,
    onSuccess: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY(user.id) });
      }
    },
  });
}
