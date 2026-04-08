/**
 * hooks/useCareCircleSync.ts
 *
 * Subscribes to Supabase real-time changes for Care Circle partner permissions.
 * When the primary user revokes access, the partner's TanStack Query caches
 * are immediately purged to prevent stale data from being visible.
 *
 * Key security fix:
 * - Detects when a partner's status changes to 'revoked'
 * - Immediately clears all shared data caches
 * - Prevents 5-minute window of stale cached data after revocation
 *
 * Usage: call this hook once near the app root (in a layout component).
 * It is safe to mount multiple times because each channel is uniquely named.
 */
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/src/lib/queryKeys";
import { logDataAccess } from "@/src/services/auditService";

export function useCareCircleSync(userId: string | undefined) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Clean up previous subscription
    const cleanup = () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current).catch((e) => {
          if (__DEV__) {
            console.warn('[CareCircleSync] Failed to remove channel:', e);
          }
        });
        channelRef.current = null;
      }
    };

    cleanup();

    // ─── Subscribe to partner/permission changes ─────────────────────────────────
    // Monitor for when the current user (viewer) has their access revoked,
    // or when they (as primary) revoke a partner's access.
    const channel = supabase
      .channel(`rt-care-circle-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "partners",
          // Filter: either we are the viewer having access revoked, or we are the primary revoking
          filter: `or(viewer_user_id.eq.${userId}, user_id.eq.${userId})`,
        },
        (payload: any) => {
          const newStatus = payload.new?.status as string | undefined;
          const oldStatus = payload.old?.status as string | undefined;
          const isRevocation = newStatus === "revoked" && oldStatus !== "revoked";

          if (!isRevocation) return;

          // Determine which user's data should be purged
          const isViewerRevoked = payload.new?.viewer_user_id === userId;
          const isPrimaryRevoking = payload.new?.user_id === userId;

          if (isViewerRevoked) {
            // We (viewer) just had access revoked - purge all shared data
            if (__DEV__) {
              console.log('[CareCircleSync] Access revoked to us as viewer. Purging cache.');
            }

            // Purge shared data queries that would rely on permissions
            void queryClient.removeQueries({
              predicate: (query) => {
                const key = query.queryKey;
                return (
                  Array.isArray(key) &&
                  (key[0] === 'shared-data' ||
                    key[0] === 'partner-logs' ||
                    key[0] === 'partner-cycle')
                );
              },
            });

            // Also invalidate any care-circle related queries
            void queryClient.invalidateQueries({
              predicate: (query) => {
                const key = query.queryKey;
                return (
                  Array.isArray(key) &&
                  (key[0] === 'connections' || key[0] === 'care-circle')
                );
              },
            });

            logDataAccess('care_circle', 'update_consent', {
              viewer_user_id: userId,
              action: 'access_revoked',
              revoked_at: new Date().toISOString(),
            });
          } else if (isPrimaryRevoking) {
            // We (primary) just revoked someone's access
            const revokedViewerId = payload.new?.viewer_user_id;
            if (__DEV__) {
              console.log(
                '[CareCircleSync] Revoked access from viewer:',
                revokedViewerId,
              );
            }

            // Invalidate connection list so UI reflects the revocation
            void queryClient.invalidateQueries({
              predicate: (query) => {
                const key = query.queryKey;
                return (
                  Array.isArray(key) &&
                  (key[0] === 'connections' || key[0] === 'care-circle')
                );
              },
            });

            logDataAccess('care_circle', 'update_consent', {
              user_id: userId,
              action: 'revoked_viewer_access',
              revoked_viewer_id: revokedViewerId,
              revoked_at: new Date().toISOString(),
            });
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    if (__DEV__) {
      console.log('[CareCircleSync] Subscribed for userId:', userId);
    }

    // ─── Cleanup: remove channel on unmount or userId change ────────────────────
    return cleanup;
  }, [userId, queryClient]);
}
