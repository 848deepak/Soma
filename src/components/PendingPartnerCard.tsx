/**
 * src/components/PendingPartnerCard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays incoming pending partner connection requests with Accept/Reject options.
 */

import { ActivityIndicator, Alert, View, useColorScheme } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Typography } from '@/src/components/ui/Typography';
import { PressableScale } from '@/src/components/ui/PressableScale';
import * as careCircleService from '@/src/services/careCircleService';
import { PENDING_CONNECTIONS_KEY } from '@/hooks/usePendingConnections';
import { CARE_CIRCLE_KEY } from '@/hooks/useCareCircle';
import type { PartnerRow } from '@/types/database';

interface PendingPartnerCardProps {
  connection: PartnerRow;
  isDark: boolean;
  onActionComplete?: () => void;
}

export function PendingPartnerCard({
  connection,
  isDark,
  onActionComplete,
}: PendingPartnerCardProps) {
  const queryClient = useQueryClient();

  const acceptMutation = useMutation({
    mutationFn: () => careCircleService.acceptConnection(connection.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PENDING_CONNECTIONS_KEY });
      await queryClient.invalidateQueries({ queryKey: CARE_CIRCLE_KEY });
      Alert.alert('Connected!', 'Connection accepted. You can now share data.');
      onActionComplete?.();
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Could not accept connection.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => careCircleService.rejectConnection(connection.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PENDING_CONNECTIONS_KEY });
      onActionComplete?.();
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Could not reject connection.');
    },
  });

  const isLoading = acceptMutation.isPending || rejectMutation.isPending;

  const cardStyle = {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(221,167,165,0.2)',
    backgroundColor: isDark ? 'rgba(30,33,40,0.85)' : 'rgba(255,255,255,0.75)',
    padding: 16,
    marginBottom: 12,
  };

  const roleColor = connection.permissions?.role === 'trusted' ? '#A78BFA' : '#DDA7A5';

  return (
    <View style={cardStyle}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Typography style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#F2F2F2' : '#2D2327' }}>
            Connection Request
          </Typography>
          <Typography variant="helper" style={{ marginTop: 4 }}>
            They want to view your data as a{' '}
            <Typography
              style={{
                fontWeight: '600',
                color: roleColor,
              }}
            >
              {connection.permissions?.role || 'viewer'}
            </Typography>
          </Typography>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <PressableScale
          disabled={isLoading}
          onPress={() => rejectMutation.mutate()}
          style={{
            flex: 1,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(221,167,165,0.3)',
            paddingVertical: 10,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          {rejectMutation.isPending ? (
            <ActivityIndicator size="small" color={isDark ? '#F2F2F2' : '#2D2327'} />
          ) : (
            <Typography style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#F2F2F2' : '#2D2327' }}>
              Reject
            </Typography>
          )}
        </PressableScale>

        <PressableScale
          disabled={isLoading}
          onPress={() => acceptMutation.mutate()}
          style={{
            flex: 1,
            borderRadius: 12,
            backgroundColor: roleColor,
            paddingVertical: 10,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {acceptMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Typography style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>
              Accept
            </Typography>
          )}
        </PressableScale>
      </View>
    </View>
  );
}
