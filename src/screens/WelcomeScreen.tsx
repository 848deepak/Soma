import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View, useColorScheme } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PressableScale } from '@/src/components/ui/PressableScale';
import { Screen } from '@/src/components/ui/Screen';
import { Typography } from '@/src/components/ui/Typography';
import { HAS_LAUNCHED_KEY } from '@/src/constants/storage';

// ── Multi-layer animated orb matching Figma welcome screen ──────────────────
function AnimatedOrb({ isDark }: { isDark: boolean }) {
  // Outer glow pulse — slow 3s cycle
  const outerScale = useSharedValue(1);
  const outerOpacity = useSharedValue(0.5);

  // Mid glow pulse — offset 1.5s
  const midScale = useSharedValue(1);
  const midOpacity = useSharedValue(0.65);

  useEffect(() => {
    outerScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 2000 }),
        withTiming(1.0, { duration: 2000 }),
      ),
      -1,
      false,
    );
    outerOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 2000 }),
        withTiming(0.4, { duration: 2000 }),
      ),
      -1,
      false,
    );

    // Slight delay for stagger effect
    setTimeout(() => {
      midScale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 2000 }),
          withTiming(1.0, { duration: 2000 }),
        ),
        -1,
        false,
      );
      midOpacity.value = withRepeat(
        withSequence(
          withTiming(0.85, { duration: 2000 }),
          withTiming(0.6, { duration: 2000 }),
        ),
        -1,
        false,
      );
    }, 600);
  }, [outerScale, outerOpacity, midScale, midOpacity]);

  const outerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: outerScale.value }],
    opacity: outerOpacity.value,
  }));

  const midAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: midScale.value }],
    opacity: midOpacity.value,
  }));

  return (
    <View
      style={{
        width: 288,
        height: 288,
        marginBottom: 56,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Outer pulse glow */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 288,
            height: 288,
            borderRadius: 144,
            backgroundColor: isDark
              ? 'rgba(167,139,250,0.2)'
              : 'rgba(255,218,185,0.55)',
          },
          outerAnimStyle,
        ]}
      />
      {/* Mid glow layer */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 240,
            height: 240,
            borderRadius: 120,
            backgroundColor: isDark
              ? 'rgba(167,139,250,0.35)'
              : 'rgba(221,167,165,0.6)',
          },
          midAnimStyle,
        ]}
      />
      {/* Inner static orb */}
      <View
        style={{
          width: 168,
          height: 168,
          borderRadius: 84,
          backgroundColor: isDark ? '#A78BFA' : '#DDA7A5',
          shadowColor: isDark ? '#7C6BE8' : '#DDA7A5',
          shadowOffset: { width: 0, height: 20 },
          shadowOpacity: 0.5,
          shadowRadius: 40,
          elevation: 16,
        }}
      >
        {/* Organic inner highlight */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 84,
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(255,255,255,0.25)',
          }}
        />
      </View>
    </View>
  );
}

export function WelcomeScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  async function handleGetStarted() {
    await AsyncStorage.setItem(HAS_LAUNCHED_KEY, 'true');
    router.push('/setup' as never);
  }

  return (
    <Screen showAurora={false}>
      {/* Extra ambient background blobs (decorative, matching Figma) */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 60,
          left: 16,
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: isDark
            ? 'rgba(79,70,229,0.15)'
            : 'rgba(255,218,185,0.5)',
          opacity: 0.6,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: 120,
          right: 24,
          width: 160,
          height: 160,
          borderRadius: 80,
          backgroundColor: isDark
            ? 'rgba(167,139,250,0.12)'
            : 'rgba(155,126,140,0.3)',
          opacity: 0.5,
        }}
      />

      <View style={{ marginTop: 32, alignItems: 'center' }}>
        {/* ── Animated aurora orb ─────────────────────────── */}
        <AnimatedOrb isDark={isDark} />

        {/* ── Heading ─────────────────────────────────────── */}
        <Typography variant="serif" className="text-center">
          {"Listen to your\nbody's rhythm."}
        </Typography>

        {/* ── Subtitle ────────────────────────────────────── */}
        <Typography
          variant="muted"
          className="mt-4 text-center leading-relaxed"
        >
          {'Track your cycle with warmth,\nwisdom, and complete privacy.'}
        </Typography>

        {/* ── Get Started CTA ─────────────────────────────── */}
        <PressableScale
          onPress={handleGetStarted}
          className="mt-14 w-full items-center rounded-full bg-somaBlush py-[18px] dark:bg-darkPrimary"
          style={{
            shadowColor: '#DDA7A5',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.4,
            shadowRadius: 40,
            elevation: 12,
          }}
        >
          <Typography className="text-base font-semibold text-white">
            Get Started
          </Typography>
        </PressableScale>

        {/* ── Sign in link for returning users ─────────────── */}
        <PressableScale
          onPress={() => router.push('/auth/login' as never)}
          className="mt-5 items-center"
        >
          <Typography
            variant="helper"
            className="text-somaMauve/70 dark:text-darkTextSecondary"
          >
            Already have an account? Sign in
          </Typography>
        </PressableScale>
      </View>
    </Screen>
  );
}
