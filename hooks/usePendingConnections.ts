/**
 * hooks/usePendingConnections.ts
 *
 * Query hook for pending Care Circle connections.
 * Separate from active connections to handle approval flow.
 */

import { useQuery } from '@tanstack/react-query';
import * as careCircleService from '@/src/services/careCircleService';

export const PENDING_CONNECTIONS_KEY = ['pending_connections'] as const;

/**
 * Fetch pending Care Circle connections (both incoming and outgoing).
 * Refetch on window focus and every 30 seconds.
 * @returns Object with incoming (waiting for my approval) and outgoing (waiting for their approval)
 */
export function usePendingConnections() {
  return useQuery({
    queryKey: PENDING_CONNECTIONS_KEY,
    queryFn: () => careCircleService.getPendingConnections(),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000,
  });
}
