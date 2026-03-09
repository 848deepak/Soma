/**
 * src/screens/QuickCheckinScreen.tsx
 *
 * Figma "Quick Check-in" — rendered as a slide-up bottom sheet
 * over a semi-transparent backdrop (presentation: transparentModal).
 */
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Dimensions, Pressable, Switch, View, useColorScheme } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { PressableScale } from '@/src/components/ui/PressableScale';
import { Typography } from '@/src/components/ui/Typography';
import { useSaveLog } from '@/hooks/useSaveLog';
import type { FlowLevel, MoodOption } from '@/types/database';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const moodOptions: Array<{ label: MoodOption; emoji: string }> = [
  { label: 'Happy', emoji: '😊' },
  { label: 'Sensitive', emoji: '🌧️' },
  { label: 'Energetic', emoji: '⚡' },
  { label: 'Tired', emoji: '😴' },
];

const FLOW_LABELS = ['None', 'Light', 'Moderate', 'Heavy', 'Very Heavy'];

export function QuickCheckinScreen() {
  const router = useRouter();
  const saveLog = useSaveLog();
  const isDark = useColorScheme() === 'dark';

  const [flowLevel, setFlowLevel] = useState<number>(2);
  const [selectedMood, setSelectedMood] = useState<MoodOption | null>(null);
  const [shareAlert, setShareAlert] = useState(false);

  // Slide-up animation
  const translateY = useSharedValue(SCREEN_HEIGHT);

  useEffect(() => {
    translateY.value = withTiming(0, { duration: 320 });
  }, [translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  function handleFlowChange(value: number) {
    void Haptics.selectionAsync();
    setFlowLevel(value);
  }

  function handleMoodSelect(mood: MoodOption) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMood((prev) => (prev === mood ? null : mood));
  }

  function handleDismiss() {
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 260 });
    setTimeout(() => router.back(), 280);
  }

  function handleSave() {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    saveLog.mutate(
      {
        flow_level: flowLevel as FlowLevel,
        ...(selectedMood ? { mood: selectedMood } : {}),
        partner_alert: shareAlert,
      },
      {
        onSuccess: () => handleDismiss(),
      },
    );
  }

  const cardBg = isDark ? 'rgba(26,29,36,0.98)' : 'rgba(255,253,251,0.98)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(221,167,165,0.25)';

  return (
    <View style={{ flex: 1 }}>
      {/* Semi-transparent backdrop */}
      <Animated.View
        entering={FadeIn.duration(200)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.45)',
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={handleDismiss} />
      </Animated.View>

      {/* Bottom sheet */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            borderWidth: 1,
            borderColor: cardBorder,
            backgroundColor: cardBg,
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: 48,
          },
          sheetStyle,
        ]}
      >
        {/* Drag handle indicator */}
        <View
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(155,126,140,0.3)',
            alignSelf: 'center',
            marginBottom: 20,
          }}
        />

        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <Typography
            style={{
              fontFamily: 'PlayfairDisplay-SemiBold',
              fontSize: 24,
              color: isDark ? '#F2F2F2' : '#2D2327',
            }}
          >
            Quick Check-in
          </Typography>
          <PressableScale
            onPress={handleDismiss}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,218,185,0.4)',
            }}
          >
            <Typography style={{ fontSize: 18, color: '#9B7E8C', lineHeight: 22 }}>
              ×
            </Typography>
          </PressableScale>
        </View>

        {/* ── Flow level section ─────────────────────────────── */}
        <Typography
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: isDark ? '#F2F2F2' : '#2D2327',
            marginBottom: 12,
          }}
        >
          Flow Level
        </Typography>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          {FLOW_LABELS.map((label, index) => {
            const isActive = flowLevel === index;
            const dropH = 24 + index * 8;
            return (
              <PressableScale
                key={label}
                onPress={() => handleFlowChange(index)}
                style={{ alignItems: 'center', paddingHorizontal: 4 }}
              >
                <View
                  style={{
                    width: 28,
                    height: dropH,
                    borderTopLeftRadius: 14,
                    borderTopRightRadius: 14,
                    borderBottomLeftRadius: 999,
                    borderBottomRightRadius: 999,
                    backgroundColor: isDark ? '#A78BFA' : '#DDA7A5',
                    opacity: isActive ? 1 : 0.2 + index * 0.15,
                    shadowColor: isActive ? (isDark ? '#A78BFA' : '#DDA7A5') : 'transparent',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isActive ? 0.5 : 0,
                    shadowRadius: 8,
                    elevation: isActive ? 4 : 0,
                  }}
                />
                <Typography
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    color: isActive
                      ? isDark ? '#F2F2F2' : '#2D2327'
                      : '#9B7E8C',
                    fontWeight: isActive ? '600' : '400',
                  }}
                >
                  {label}
                </Typography>
              </PressableScale>
            );
          })}
        </View>

        {/* ── Mood section ───────────────────────────────────── */}
        <Typography
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: isDark ? '#F2F2F2' : '#2D2327',
            marginBottom: 12,
          }}
        >
          How are you feeling?
        </Typography>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          {moodOptions.map((option) => {
            const isActive = selectedMood === option.label;
            return (
              <PressableScale
                key={option.label}
                onPress={() => handleMoodSelect(option.label)}
                style={{
                  flex: 1,
                  marginHorizontal: 4,
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: isActive
                    ? isDark ? '#A78BFA' : '#DDA7A5'
                    : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(221,167,165,0.2)',
                  backgroundColor: isActive
                    ? isDark ? 'rgba(167,139,250,0.2)' : 'rgba(221,167,165,0.15)'
                    : 'transparent',
                }}
              >
                <Typography style={{ fontSize: 22, marginBottom: 4 }}>
                  {option.emoji}
                </Typography>
                <Typography
                  style={{
                    fontSize: 11,
                    color: isActive
                      ? isDark ? '#F2F2F2' : '#2D2327'
                      : '#9B7E8C',
                    fontWeight: isActive ? '600' : '400',
                  }}
                >
                  {option.label}
                </Typography>
              </PressableScale>
            );
          })}
        </View>

        {/* ── Partner alert toggle ───────────────────────────── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(221,167,165,0.2)',
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,218,185,0.2)',
            paddingHorizontal: 16,
            paddingVertical: 14,
            marginBottom: 24,
          }}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Typography
              style={{
                fontSize: 14,
                fontWeight: '500',
                color: isDark ? '#F2F2F2' : '#2D2327',
              }}
            >
              Alert partner about severe cramps?
            </Typography>
            <Typography
              style={{
                marginTop: 2,
                fontSize: 12,
                color: '#9B7E8C',
              }}
            >
              They'll be notified to check in on you
            </Typography>
          </View>
          <Switch
            value={shareAlert}
            onValueChange={setShareAlert}
            trackColor={{ false: '#D7CFCA', true: '#DDA7A5' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* ── Save button ────────────────────────────────────── */}
        <PressableScale
          onPress={handleSave}
          style={{
            alignItems: 'center',
            borderRadius: 999,
            backgroundColor: isDark ? '#A78BFA' : '#DDA7A5',
            paddingVertical: 18,
            opacity: saveLog.isPending ? 0.6 : 1,
            shadowColor: isDark ? '#7C6BE8' : '#DDA7A5',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.4,
            shadowRadius: 40,
            elevation: 12,
          }}
        >
          <Typography
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#FFFFFF',
            }}
          >
            {saveLog.isPending ? 'Saving…' : 'Save & Close'}
          </Typography>
        </PressableScale>
      </Animated.View>
    </View>
  );
}
