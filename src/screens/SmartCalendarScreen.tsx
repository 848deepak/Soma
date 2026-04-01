import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, useColorScheme, View } from 'react-native';
import { PinchGestureHandler, type PinchGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useSmartCalendar } from '@/hooks/useSmartCalendar';
import { toDisplayTime } from '@/src/features/smartCalendar/dateUtils';
import { buildMonthGrid, calendarWeekdays } from '@/src/features/cycle/uiCycleData';
import type { SmartCalendarEvent } from '@/src/features/smartCalendar/types';
import { PressableScale } from '@/src/components/ui/PressableScale';
import { Screen } from '@/src/components/ui/Screen';
import { Typography } from '@/src/components/ui/Typography';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function dayIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function toDateParts(dateIso: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateIso.split('-').map(Number);
  return { year, month, day };
}

function clampIntensity(count: number): number {
  if (count <= 0) return 0;
  if (count >= 4) return 4;
  return count;
}

function getIntensityStyle(count: number, isDark: boolean): { fill: string; dot: string } {
  const level = clampIntensity(count);
  const fillMap = isDark
    ? ['transparent', 'rgba(221,167,165,0.22)', 'rgba(221,167,165,0.34)', 'rgba(221,167,165,0.46)', 'rgba(221,167,165,0.6)']
    : ['transparent', 'rgba(221,167,165,0.18)', 'rgba(221,167,165,0.3)', 'rgba(221,167,165,0.42)', 'rgba(221,167,165,0.55)'];
  const dotMap = ['transparent', '#D9B2B0', '#CB9A99', '#B97D80', '#9F5F66'];

  return {
    fill: fillMap[level],
    dot: dotMap[level],
  };
}

export function SmartCalendarScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const [isYearOverview, setIsYearOverview] = useState(false);
  const [selectedDateIso, setSelectedDateIso] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(new Date().getMonth());
  const [visibleYear, setVisibleYear] = useState(new Date().getFullYear());
  const [monthTransitionDirection, setMonthTransitionDirection] = useState<1 | -1>(1);

  const today = new Date();
  const todayIso = dayIso(today.getFullYear(), today.getMonth(), today.getDate());

  const start = useMemo(() => new Date(visibleYear, 0, 1), [visibleYear]);
  const end = useMemo(() => new Date(visibleYear, 11, 31), [visibleYear]);

  const { events } = useSmartCalendar(start, end);

  const sheetY = useSharedValue(420);
  const backdropOpacity = useSharedValue(0);
  const monthX = useSharedValue(0);
  const monthOpacity = useSharedValue(1);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const monthContainerStyle = useAnimatedStyle(() => ({
    opacity: monthOpacity.value,
    transform: [{ translateX: monthX.value }],
  }));

  const logsOnly = useMemo(() => events.filter((event) => event.type === 'log'), [events]);

  const handlePinch = (event: PinchGestureHandlerGestureEvent) => {
    const scale = event.nativeEvent.scale;
    if (scale < 0.86 && !isYearOverview) {
      setIsYearOverview(true);
    }
    if (scale > 1.08 && isYearOverview) {
      setIsYearOverview(false);
    }
  };

  const currentMonthLogs = useMemo(
    () =>
      logsOnly.filter((event) => {
        const date = new Date(event.startTime);
        return date.getFullYear() === visibleYear && date.getMonth() === visibleMonth;
      }),
    [logsOnly, visibleYear, visibleMonth],
  );

  const logsByDay = useMemo(() => {
    const grouped: Record<number, SmartCalendarEvent[]> = {};
    currentMonthLogs.forEach((event) => {
      const day = new Date(event.startTime).getDate();
      grouped[day] = [...(grouped[day] ?? []), event];
    });
    return grouped;
  }, [currentMonthLogs]);

  const monthWeeks = useMemo(() => {
    const daysInMonth = new Date(visibleYear, visibleMonth + 1, 0).getDate();
    const firstWeekDay = new Date(visibleYear, visibleMonth, 1).getDay();
    return buildMonthGrid(daysInMonth, firstWeekDay);
  }, [visibleYear, visibleMonth]);

  const selectedDayLogs = useMemo(() => {
    if (!selectedDateIso) return [];
    return logsOnly.filter((event) => event.startTime.slice(0, 10) === selectedDateIso);
  }, [logsOnly, selectedDateIso]);

  useEffect(() => {
    if (selectedDateIso) {
      backdropOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
      sheetY.value = withSpring(0, { damping: 24, stiffness: 220, mass: 0.75 });
      return;
    }

    backdropOpacity.value = withTiming(0, { duration: 180, easing: Easing.in(Easing.quad) });
    sheetY.value = withSpring(420, { damping: 25, stiffness: 260, mass: 0.8 });
  }, [selectedDateIso, backdropOpacity, sheetY]);

  useEffect(() => {
    if (isYearOverview) return;
    monthX.value = monthTransitionDirection * 16;
    monthOpacity.value = 0.5;
    monthX.value = withSpring(0, {
      damping: 18,
      stiffness: 240,
      mass: 0.7,
    });
    monthOpacity.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
  }, [visibleMonth, visibleYear, isYearOverview, monthTransitionDirection, monthX, monthOpacity]);

  const goPrevMonth = () => {
    setMonthTransitionDirection(-1);
    if (visibleMonth === 0) {
      setVisibleMonth(11);
      setVisibleYear((y) => y - 1);
      return;
    }
    setVisibleMonth((m) => m - 1);
  };

  const goNextMonth = () => {
    setMonthTransitionDirection(1);
    if (visibleMonth === 11) {
      setVisibleMonth(0);
      setVisibleYear((y) => y + 1);
      return;
    }
    setVisibleMonth((m) => m + 1);
  };

  const monthSummary = useMemo(
    () =>
      Array.from({ length: 12 }, (_, monthIndex) => {
        const monthLogs = logsOnly.filter((event) => {
          const date = new Date(event.startTime);
          return date.getFullYear() === visibleYear && date.getMonth() === monthIndex;
        });
        const loggedDayCount = new Set(monthLogs.map((event) => new Date(event.startTime).getDate())).size;
        return {
          monthIndex,
          name: MONTH_NAMES[monthIndex],
          loggedDayCount,
        };
      }),
    [logsOnly, visibleYear],
  );

  const closeSheet = () => setSelectedDateIso(null);

  const selectedDateLabel = useMemo(() => {
    if (!selectedDateIso) return '';
    const { month, day } = toDateParts(selectedDateIso);
    return `${MONTH_NAMES[month - 1]} ${day}`;
  }, [selectedDateIso]);

  return (
    <Screen scrollable={false} showAurora>
      <Animated.View entering={FadeInUp.duration(380)} className="mt-2">
        <Typography variant="serifMd" className="text-somaCharcoal">
          {MONTH_NAMES[visibleMonth]} {visibleYear}
        </Typography>

        <View className="mt-3 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <PressableScale
              onPress={goPrevMonth}
              className="mr-2 h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,226,206,0.78)' }}
            >
              <Typography className="text-lg text-somaMauve">‹</Typography>
            </PressableScale>

            <PressableScale
              onPress={goNextMonth}
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,226,206,0.78)' }}
            >
              <Typography className="text-lg text-somaMauve">›</Typography>
            </PressableScale>
          </View>

          <PressableScale
            onPress={() => setIsYearOverview((value) => !value)}
            className="rounded-full px-3 py-2"
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,236,219,0.9)',
            }}
          >
            <Typography variant="helper" className="font-semibold tracking-wide text-somaMauve">
              Year
            </Typography>
          </PressableScale>
        </View>
      </Animated.View>

      <PinchGestureHandler onGestureEvent={handlePinch}>
        <View className="mt-3 flex-1">
          {isYearOverview ? (
            <Animated.ScrollView entering={FadeIn.duration(220)} showsVerticalScrollIndicator={false}>
              <View className="flex-row flex-wrap justify-between pb-2">
                {monthSummary.map((month) => (
                  <PressableScale
                    key={month.name}
                    onPress={() => {
                      setMonthTransitionDirection(month.monthIndex >= visibleMonth ? 1 : -1);
                      setVisibleMonth(month.monthIndex);
                      setSelectedDateIso(null);
                      setIsYearOverview(false);
                    }}
                    className="mb-3 w-[48%] rounded-3xl p-4"
                    style={{
                      backgroundColor: isDark ? 'rgba(30,33,38,0.76)' : 'rgba(255,255,255,0.78)',
                    }}
                  >
                    <Typography className="text-base font-semibold text-somaCharcoal">{month.name}</Typography>
                    <View className="mt-3 flex-row items-center">
                      {Array.from({ length: 5 }).map((_, dotIndex) => (
                        <View
                          key={`${month.name}-dot-${dotIndex}`}
                          className="mr-1 h-[7px] w-[7px] rounded-full"
                          style={{
                            backgroundColor:
                              dotIndex < Math.min(5, Math.ceil(month.loggedDayCount / 2))
                                ? '#C6878D'
                                : isDark
                                  ? 'rgba(255,255,255,0.14)'
                                  : 'rgba(221,167,165,0.2)',
                          }}
                        />
                      ))}
                    </View>
                    <Typography variant="helper" className="mt-2 text-somaMauve">
                      {month.loggedDayCount} days logged
                    </Typography>
                  </PressableScale>
                ))}
              </View>
            </Animated.ScrollView>
          ) : (
            <>
              <Animated.View
                entering={FadeInUp.duration(300)}
                style={monthContainerStyle}
                className="rounded-3xl px-3 pb-4 pt-3"
              >
                <View
                  className="rounded-3xl px-3 pb-4 pt-3"
                  style={{ backgroundColor: isDark ? 'rgba(27,30,35,0.78)' : 'rgba(255,255,255,0.82)' }}
                >
                <View className="mb-1 flex-row">
                  {calendarWeekdays.map((day, index) => (
                    <View key={`${day}-${index}`} className="flex-1 items-center py-2">
                      <Typography variant="helper" className="text-somaMauve">{day}</Typography>
                    </View>
                  ))}
                </View>

                {monthWeeks.map((week, weekIndex) => (
                  <View key={`week-${weekIndex}`} className="mb-1 flex-row">
                    {week.map((day, dayIndex) => {
                      if (!day) {
                        return <View key={`empty-${weekIndex}-${dayIndex}`} className="h-14 flex-1" />;
                      }

                      const dayLogEvents = logsByDay[day] ?? [];
                      const dayIntensity = getIntensityStyle(dayLogEvents.length, isDark);
                      const isToday =
                        day === today.getDate() &&
                        visibleMonth === today.getMonth() &&
                        visibleYear === today.getFullYear();
                      const targetIso = dayIso(visibleYear, visibleMonth, day);
                      const isSelected = selectedDateIso === targetIso;

                      return (
                        <PressableScale
                          key={`day-${weekIndex}-${day}`}
                          onPress={() => setSelectedDateIso(targetIso)}
                          className="h-14 flex-1 items-center justify-center"
                        >
                          <View
                            className="h-9 w-9 items-center justify-center rounded-full"
                            style={{
                              backgroundColor: isSelected ? 'rgba(221,167,165,0.32)' : dayIntensity.fill,
                              borderWidth: isToday ? 1 : 0,
                              borderColor: isToday ? '#B9868D' : 'transparent',
                            }}
                          >
                            <Typography
                              className={`text-[15px] ${isToday ? 'font-semibold text-somaMauve' : 'text-somaCharcoal'}`}
                            >
                              {day}
                            </Typography>
                          </View>

                          {dayLogEvents.length > 0 ? (
                            <View className="mt-1 h-2 flex-row items-center justify-center">
                              <View className="h-[5px] w-[5px] rounded-full" style={{ backgroundColor: dayIntensity.dot }} />
                            </View>
                          ) : (
                            <View className="mt-1 h-2" />
                          )}
                        </PressableScale>
                      );
                    })}
                  </View>
                ))}
                </View>
              </Animated.View>
            </>
          )}
        </View>
      </PinchGestureHandler>

      <Modal visible={selectedDateIso !== null} transparent animationType="none" onRequestClose={closeSheet}>
        <Pressable className="flex-1 justify-end" onPress={closeSheet}>
          <Animated.View
            className="absolute inset-0"
            style={[
              {
                backgroundColor: 'rgba(0,0,0,0.28)',
              },
              backdropStyle,
            ]}
          />

          <Animated.View
            entering={FadeInDown.duration(220)}
            style={sheetStyle}
            className="rounded-t-[30px] px-6 pb-8 pt-4"
          >
            <Pressable
              onPress={(event) => event.stopPropagation()}
              className="rounded-t-[30px]"
              style={{
                backgroundColor: isDark ? 'rgba(24,27,32,0.98)' : 'rgba(255,252,250,0.98)',
              }}
            >
              <View className="items-center pb-2 pt-1">
                <View className="h-1.5 w-12 rounded-full bg-[#D8B9BE]" />
              </View>

              <Typography className="mb-3 text-xl font-semibold text-somaCharcoal">{selectedDateLabel || todayIso}</Typography>

              {selectedDayLogs.length === 0 ? (
                <Typography variant="muted" className="pb-5 text-somaMauve">
                  No logs for this day
                </Typography>
              ) : (
                <View className="pb-3">
                  {selectedDayLogs.slice(0, 6).map((event, index) => (
                    <Animated.View
                      key={event.id}
                      entering={FadeInUp.delay(index * 36).duration(220)}
                      className="mb-2 rounded-2xl p-3"
                      style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.86)' }}
                    >
                      <View className="flex-row items-center justify-between">
                        <Typography className="font-semibold text-somaCharcoal">{event.title}</Typography>
                        <Typography variant="helper" className="text-somaMauve">
                          {toDisplayTime(event.startTime)}
                        </Typography>
                      </View>
                    </Animated.View>
                  ))}
                </View>
              )}
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </Screen>
  );
}
