import { useState } from 'react';
import { ActivityIndicator, Switch, TextInput, View, useColorScheme } from 'react-native';

import { HeaderBar } from '@/src/components/ui/HeaderBar';
import { PressableScale } from '@/src/components/ui/PressableScale';
import { Screen } from '@/src/components/ui/Screen';
import { Typography } from '@/src/components/ui/Typography';
import { PartnerView } from '@/src/components/PartnerView';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { usePartner } from '@/hooks/usePartner';
import { useLinkPartner } from '@/hooks/useLinkPartner';
import type { PartnerPermissions } from '@/types/database';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Splits a 6-char code into 3 display groups: "A792B1" → ["A7", "92", "B1"] */
function splitCode(code: string): string[] {
  return [code.slice(0, 2), code.slice(2, 4), code.slice(4, 6)];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PermissionRow({
  title,
  subtitle,
  value,
  onValueChange,
  disabled,
  isDark,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  isDark: boolean;
}) {
  return (
    <View style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flex: 1, paddingRight: 16 }}>
        <Typography style={{ fontSize: 15, fontWeight: '500', color: isDark ? '#F2F2F2' : '#2D2327' }}>
          {title}
        </Typography>
        <Typography variant="helper" style={{ marginTop: 2 }}>
          {subtitle}
        </Typography>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#D7CFCA', true: '#DDA7A5' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function PartnerSyncScreen() {
  const [linkCode, setLinkCode] = useState('');
  const isDark = useColorScheme() === 'dark';

  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: partnerState } = usePartner();
  const updateProfile = useUpdateProfile();
  const linkPartner = useLinkPartner();

  const permissions: PartnerPermissions = profile?.partner_permissions ?? {
    share_mood: true,
    share_fertility: true,
    share_symptoms: false,
  };

  const codeSegments = profile?.partner_link_code
    ? splitCode(profile.partner_link_code)
    : ['··', '··', '··'];

  const isLinkedAsViewer = partnerState?.asViewer != null;
  const isUpdatingPermissions = updateProfile.isPending;

  const cardStyle = {
    marginTop: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.7)',
    backgroundColor: isDark ? 'rgba(30,33,40,0.85)' : 'rgba(255,255,255,0.75)',
    padding: 20,
    shadowColor: '#DDA7A5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  };

  function handlePermissionToggle(key: keyof PartnerPermissions, value: boolean) {
    updateProfile.mutate({ partner_permissions: { ...permissions, [key]: value } });
  }

  function handleLinkPartner() {
    const code = linkCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 6) return;
    linkPartner.mutate(code, { onSuccess: () => setLinkCode('') });
  }

  return (
    <Screen>
      <HeaderBar title={'Share Your\nRhythm'} subtitle="Connect with your partner securely." />

      {/* ── Your Access Key ─────────────────────────────────────────────────── */}
      <View style={{ ...cardStyle, alignItems: 'center' }}>
        <Typography
          style={{
            marginBottom: 16,
            fontSize: 16,
            fontWeight: '600',
            color: isDark ? '#F2F2F2' : '#2D2327',
          }}
        >
          Your Access Key
        </Typography>

        {/* QR code placeholder */}
        <View
          style={{
            width: 140,
            height: 140,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(221,167,165,0.2)',
          }}
        >
          <Typography
            variant="helper"
            style={{ letterSpacing: 3, textAlign: 'center' }}
          >
            QR CODE
          </Typography>
        </View>

        {/* Code segments */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {codeSegments.map((segment, i) => (
            <View
              key={i}
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(221,167,165,0.3)',
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <Typography
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: isDark ? '#F2F2F2' : '#2D2327',
                  letterSpacing: 1,
                }}
              >
                {profileLoading ? '··' : segment}
              </Typography>
            </View>
          ))}
        </View>

        <Typography variant="helper" style={{ marginTop: 12 }}>
          Share this code with your partner
        </Typography>
      </View>

      {/* ── Sharing Permissions ──────────────────────────────────────────────── */}
      <View style={cardStyle}>
        <View style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: isDark ? '#F2F2F2' : '#2D2327',
            }}
          >
            Sharing Permissions
          </Typography>
          {isUpdatingPermissions && <ActivityIndicator size="small" color="#DDA7A5" />}
        </View>
        <PermissionRow
          title="Share Mood"
          subtitle="Daily emotional insights"
          value={permissions.share_mood}
          onValueChange={(v) => handlePermissionToggle('share_mood', v)}
          disabled={isUpdatingPermissions}
          isDark={isDark}
        />
        <PermissionRow
          title="Share Fertility Status"
          subtitle="Cycle phase and predictions"
          value={permissions.share_fertility}
          onValueChange={(v) => handlePermissionToggle('share_fertility', v)}
          disabled={isUpdatingPermissions}
          isDark={isDark}
        />
        <PermissionRow
          title="Share Specific Symptoms"
          subtitle="Physical symptoms logged"
          value={permissions.share_symptoms}
          onValueChange={(v) => handlePermissionToggle('share_symptoms', v)}
          disabled={isUpdatingPermissions}
          isDark={isDark}
        />
      </View>

      {/* ── Partner Link / Live View ──────────────────────────────────────────── */}
      {!isLinkedAsViewer ? (
        <View style={cardStyle}>
          <Typography
            style={{
              marginBottom: 8,
              fontSize: 16,
              fontWeight: '600',
              color: isDark ? '#F2F2F2' : '#2D2327',
            }}
          >
            View a Partner's Data
          </Typography>
          <Typography variant="helper" style={{ marginBottom: 12 }}>
            Enter the 6-character access key shared with you.
          </Typography>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TextInput
              style={{
                flex: 1,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(221,167,165,0.3)',
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)',
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                color: isDark ? '#F2F2F2' : '#2D2327',
              }}
              placeholder="A792B1"
              placeholderTextColor="#B0A8A4"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              value={linkCode}
              onChangeText={(t) => setLinkCode(t.toUpperCase())}
            />
            <PressableScale
              onPress={handleLinkPartner}
              style={{
                borderRadius: 16,
                backgroundColor: isDark ? '#A78BFA' : '#DDA7A5',
                paddingHorizontal: 20,
                paddingVertical: 12,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: linkCode.trim().length !== 6 || linkPartner.isPending ? 0.5 : 1,
                shadowColor: '#DDA7A5',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
                elevation: 6,
              }}
            >
              {linkPartner.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Typography style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>
                  Link
                </Typography>
              )}
            </PressableScale>
          </View>
          {linkPartner.isError && (
            <Typography variant="helper" style={{ marginTop: 8, color: '#EF4444' }}>
              {linkPartner.error?.message ?? 'Invalid code. Please try again.'}
            </Typography>
          )}
        </View>
      ) : (
        <PartnerView />
      )}

      {/* ── Encryption Badge ─────────────────────────────────────────────────── */}
      <View
        style={{
          ...cardStyle,
          marginBottom: 32,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? 'rgba(167,139,250,0.2)' : 'rgba(221,167,165,0.2)',
          }}
        >
          <Typography style={{ fontSize: 16, fontWeight: '600', color: isDark ? '#A78BFA' : '#DDA7A5' }}>
            ✓
          </Typography>
        </View>
        <View>
          <Typography style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#F2F2F2' : '#2D2327' }}>
            End-to-End Encrypted
          </Typography>
          <Typography variant="helper">Your data is completely private</Typography>
        </View>
      </View>
    </Screen>
  );
}
