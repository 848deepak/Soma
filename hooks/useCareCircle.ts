/**
 * hooks/useCareCircle.ts
 * Fetches current user's Care Circle connections (both perspectives).
 * Isolated from existing partner state to prevent key collisions.
 */
import { useQuery } from '@tanstack/react-query';
import * as careCircleService from '@/src/services/careCircleService';
import type { PartnerRow } from '@/types/database';

export const CARE_CIRCLE_KEY = ['care-circle'] as const;

export interface CareCircleState {
  asPrimary: PartnerRow[];  // I am sharing my data
  asViewer: PartnerRow[];   // I am viewing someone else's data
}

/**
 * Fetch all Care Circle connections for the current user.
 * Stale time: 5 minutes. Realtime subscription handled separately.
 */
export function useCareCircle() {
  return useQuery<CareCircleState>({
    queryKey: CARE_CIRCLE_KEY,
    queryFn: careCircleService.getConnections,
    staleTime: 5 * 60 * 1000,
  });
}
