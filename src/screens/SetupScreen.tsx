import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';

import { PressableScale } from '@/src/components/ui/PressableScale';
import { Screen } from '@/src/components/ui/Screen';
import { Typography } from '@/src/components/ui/Typography';
import { ensureAnonymousSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { captureException } from '@/src/services/errorTracking';

export function SetupScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(14);
  const [isLoading, setIsLoading] = useState(false);

  const { monthLabel, year, daysInMonth } = useMemo(() => {
    const today = new Date();
    return {
      monthLabel: today.toLocaleDateString(undefined, { month: 'long' }),
      year: today.getFullYear(),
      daysInMonth: new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate(),
    };
  }, []);

  const dates = useMemo(
    () => Array.from({ length: daysInMonth }, (_, index) => index + 1),
    [daysInMonth],
  );

  async function handleContinue() {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const user = await ensureAnonymousSession();
      if (!user) throw new Error('Could not establish a session.');

      const today = new Date();
      const startDate = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, '0'),
        String(selectedDate).padStart(2, '0'),
      ].join('-');

      const { error: cycleError } = await supabase.from('cycles').insert({
        user_id: user.id,
        start_date: startDate,
        current_phase: 'menstrual',
      });
      if (cycleError) throw cycleError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_onboarded: true })
        .eq('id', user.id);
      if (profileError) throw profileError;

      router.replace('/(tabs)' as never);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)));
      Alert.alert(
        'Setup Failed',
        'We could not save your cycle start date. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Screen>
      {/* ── Progress dots ───────────────────────────── */}
      <View className="mt-2 flex-row items-center justify-center gap-2">
        <View className="h-2 w-2 rounded-full bg-somaBlush" />
        <View className="h-2 w-2 rounded-full bg-somaBlush/30" />
        <View className="h-2 w-2 rounded-full bg-somaBlush/30" />
      </View>

      {/* ── Heading ─────────────────────────────────── */}
      <View className="mt-8 mb-6">
        <Typography variant="serifMd">
          {'When did your\nlast period start?'}
        </Typography>
        <Typography className="mt-4 text-[15px] text-somaMauve dark:text-darkTextSecondary">
          This helps us provide accurate predictions.
        </Typography>
      </View>

      {/* ── Date picker card ─────────────────────────── */}
      <View
        style={{
          borderRadius: 28,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.6)',
          backgroundColor: 'rgba(255,218,185,0.18)',
          padding: 20,
          shadowColor: '#DDA7A5',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 32,
          elevation: 6,
        }}
      >
        <Typography variant="helper" className="mb-4 text-center uppercase tracking-widest">
          {monthLabel} {year}
        </Typography>

        <ScrollView
          style={{ height: 288 }}
          contentContainerStyle={{ alignItems: 'center', paddingVertical: 56 }}
          showsVerticalScrollIndicator={false}
        >
          {dates.map((date) => {
            const distance = Math.abs(date - selectedDate);
            const isSelected = date === selectedDate;
            const opacity = Math.max(0.3, 1 - distance * 0.2);

            return (
              <PressableScale
                key={date}
                onPress={() => setSelectedDate(date)}
                className="items-center py-2"
                style={{ opacity }}
              >
                <Typography
                  className={
                    isSelected
                      ? 'font-[PlayfairDisplay-SemiBold] text-[48px] font-semibold text-somaCharcoal dark:text-darkTextPrimary'
                      : 'text-3xl text-somaMauve dark:text-darkTextSecondary'
                  }
                >
                  {String(date)}
                </Typography>
              </PressableScale>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Continue CTA ────────────────────────────── */}
      <PressableScale
        onPress={handleContinue}
        className="mt-8 items-center rounded-full bg-somaBlush py-[18px] dark:bg-darkPrimary"
        style={{
          opacity: isLoading ? 0.6 : 1,
          shadowColor: '#DDA7A5',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.4,
          shadowRadius: 40,
          elevation: 12,
        }}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Typography className="text-base font-semibold text-white">
            Continue
          </Typography>
        )}
      </PressableScale>
    </Screen>
  );
}
