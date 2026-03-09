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

import { supabase } from '@/lib/supabase';
import { PARTNER_KEY } from '@/hooks/usePartner';
import type { PartnerRow } from '@/types/database';

export function useLinkPartner() {
  const queryClient = useQueryClient();

  return useMutation<PartnerRow, Error, string>({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc('link_partner', { code });
      if (error) throw error;
      return data as unknown as PartnerRow;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARTNER_KEY });
    },
  });
}
