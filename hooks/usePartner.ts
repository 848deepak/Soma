/**
 * hooks/usePartner.ts
 * Fetches the current user's active partner relationship from both perspectives:
 *
 *   asPrimary  – the current user is the data owner; someone is viewing their data
 *   asViewer   – the current user is the partner; they're viewing someone else's data
 *
 * Both can coexist (mutual partnerships).
 */
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { PartnerRow } from '@/types/database';

export const PARTNER_KEY = ['partner'] as const;

export interface PartnerState {
  /** Row where current user = user_id (I am sharing my data). */
  asPrimary: PartnerRow | null;
  /** Row where current user = partner_user_id (I am viewing partner's data). */
  asViewer: PartnerRow | null;
}

export function usePartner() {
  return useQuery<PartnerState>({
    queryKey: PARTNER_KEY,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { asPrimary: null, asViewer: null };

      const [primaryResult, viewerResult] = await Promise.all([
        supabase
          .from('partners')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle(),
        supabase
          .from('partners')
          .select('*')
          .eq('partner_user_id', user.id)
          .eq('status', 'active')
          .maybeSingle(),
      ]);

      return {
        asPrimary: (primaryResult.data as unknown as PartnerRow) ?? null,
        asViewer: (viewerResult.data as unknown as PartnerRow) ?? null,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
