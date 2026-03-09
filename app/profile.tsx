/**
 * app/profile.tsx
 * Route: /profile
 * Displays real profile data from Supabase via useProfile hook.
 */
import { useRouter } from 'expo-router';
import { View, useColorScheme } from 'react-native';

import { useProfile } from '@/hooks/useProfile';
import { Card } from '@/src/components/ui/Card';
import { PressableScale } from '@/src/components/ui/PressableScale';
import { Screen } from '@/src/components/ui/Screen';
import { Typography } from '@/src/components/ui/Typography';

export default function ProfileScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const { data: profile, isLoading } = useProfile();

  const displayName = profile?.first_name || profile?.username || 'there';
  const initials = displayName !== 'there'
    ? displayName.slice(0, 2).toUpperCase()
    : '✦';
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <Screen scrollable>
      {/* ── Avatar + name ─────────────────────────────────── */}
      <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 8 }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: isDark ? '#A78BFA' : '#DDA7A5',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: isDark ? '#7C6BE8' : '#DDA7A5',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.4,
            shadowRadius: 24,
            elevation: 12,
          }}
        >
          <Typography
            style={{
              fontSize: 28,
              fontWeight: '600',
              color: '#FFFFFF',
              lineHeight: 34,
            }}
          >
            {isLoading ? '·' : initials}
          </Typography>
        </View>

        <Typography
          variant="serifMd"
          style={{ marginTop: 16, textAlign: 'center' }}
        >
          {isLoading ? '···' : `Hello, ${displayName}.`}
        </Typography>

        {memberSince ? (
          <Typography
            variant="helper"
            style={{ marginTop: 4, textAlign: 'center' }}
          >
            Member since {memberSince}
          </Typography>
        ) : null}
      </View>

      {/* ── Privacy info card ─────────────────────────────── */}
      <Card variant="highlight" className="mt-6">
        <Typography variant="serifSm" className="mb-2">
          Privacy-first by design
        </Typography>
        <Typography variant="muted">
          Your device is the primary source of truth. Cloud sync is optional
          and encrypted end-to-end.
        </Typography>
      </Card>

      {/* ── Action buttons ────────────────────────────────── */}
      <PressableScale
        onPress={() => router.push('/(tabs)/settings' as never)}
        style={{
          marginTop: 24,
          alignItems: 'center',
          borderRadius: 999,
          backgroundColor: isDark ? '#A78BFA' : '#DDA7A5',
          paddingVertical: 18,
          shadowColor: '#DDA7A5',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.4,
          shadowRadius: 40,
          elevation: 12,
        }}
      >
        <Typography style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
          Open Settings
        </Typography>
      </PressableScale>

      <PressableScale
        onPress={() => router.push('/partner' as never)}
        style={{
          marginTop: 12,
          marginBottom: 32,
          alignItems: 'center',
          borderRadius: 999,
          borderWidth: 1.5,
          borderColor: isDark ? '#A78BFA' : '#DDA7A5',
          backgroundColor: 'transparent',
          paddingVertical: 18,
        }}
      >
        <Typography
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: isDark ? '#A78BFA' : '#DDA7A5',
          }}
        >
          Partner Sync
        </Typography>
      </PressableScale>
    </Screen>
  );
}
