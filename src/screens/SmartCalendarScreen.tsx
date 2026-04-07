import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, PanResponder, ScrollView, View } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming,
} from "react-native-reanimated";

import {
    useCycleCalendar,
    type CycleDataMap,
    type CycleStatus,
} from "@/src/domain/calendar";
import {
  useEndCurrentCycle,
  useStartNewCycle,
} from "@/src/domain/cycle";
import { useCurrentCycle } from "@/src/domain/cycle";
import { useQueryClient } from "@tanstack/react-query";
import { CURRENT_CYCLE_KEY } from "@/src/domain/cycle";
import { ScreenErrorBoundary } from "@/src/components/ScreenErrorBoundary";
import { CalendarHeader } from "@/src/components/calendar/CalendarHeader";
import {
    dayIso,
    formatMonthYear,
    getAdjacentMonthState,
    parseIso,
    resolveMonthSelectionDirection,
    resolveMonthSwipeDirection,
    resolveTransitionDirectionFromNavigation,
    shouldCaptureMonthPan,
} from "@/src/components/calendar/calendarUtils";
import { CycleLegend } from "@/src/components/calendar/CycleLegend";
import { DayRow } from "@/src/components/calendar/DayRow";
import { MiniMonth } from "@/src/components/calendar/MiniMonth";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { Screen } from "@/src/components/ui/Screen";
import { Typography } from "@/src/components/ui/Typography";
import { useAppTheme } from "@/src/context/ThemeContext";
import {
    buildMonthGrid,
    calendarWeekdays,
} from "@/src/features/cycle/uiCycleData";
import { HapticsService } from "@/src/services/haptics/HapticsService";
import { cycleCalendarMotion, cycleCalendarTheme } from "@/src/theme/tokens";

export type { CycleDataMap, CycleStatus };

type CalendarScreenProps = {
  cycleData?: CycleDataMap;
};

export function SmartCalendarScreen({ cycleData }: CalendarScreenProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme, isDark, colors } = useAppTheme();
  const currentYear = new Date().getFullYear();
  const [isYearOverview, setIsYearOverview] = useState(false);
  const [selectedDateIso, setSelectedDateIso] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(new Date().getMonth());
  const [visibleYear, setVisibleYear] = useState(new Date().getFullYear());
  const [monthTransitionDirection, setMonthTransitionDirection] = useState<
    1 | -1
  >(1);
  const monthAnimationSeed = `${visibleYear}-${visibleMonth}`;
  const calendarTheme = cycleCalendarTheme[theme];

  const today = new Date();
  const todayIso = dayIso(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const todayScale = useSharedValue(0);
  const monthX = useSharedValue(0);
  const monthOpacity = useSharedValue(1);
  const monthScale = useSharedValue(1);
  const yearOpacity = useSharedValue(0);
  const yearScale = useSharedValue(0.98);

  const resolvedCycleData = useCycleCalendar({
    cycleData,
    visibleMonth,
    visibleYear,
  });
  const { data: currentCycle } = useCurrentCycle();
  const startCycleMutation = useStartNewCycle();
  const endCycleMutation = useEndCurrentCycle();
  const hasActivePeriod = Boolean(currentCycle?.cycle?.id);

  const monthContainerStyle = useAnimatedStyle(() => ({
    opacity: monthOpacity.value,
    transform: [{ translateX: monthX.value }, { scale: monthScale.value }],
  }));

  const yearContainerStyle = useAnimatedStyle(() => ({
    opacity: yearOpacity.value,
    transform: [{ scale: yearScale.value }],
  }));

  const monthWeeks = useMemo(() => {
    const daysInMonth = new Date(visibleYear, visibleMonth + 1, 0).getDate();
    const firstWeekDay = new Date(visibleYear, visibleMonth, 1).getDay();
    return buildMonthGrid(daysInMonth, firstWeekDay);
  }, [visibleYear, visibleMonth]);

  const overviewYears = useMemo(() => {
    const startYear = visibleYear - 8;
    const endYear = visibleYear + 8;
    return Array.from({ length: endYear - startYear + 1 }, (_, index) =>
      startYear + index,
    );
  }, [visibleYear]);

  useEffect(() => {
    todayScale.value = withDelay(
      cycleCalendarMotion.todayIntroDelayMs,
      withSpring(1, {
        damping: cycleCalendarMotion.todayIntroDamping,
        stiffness: cycleCalendarMotion.todayIntroStiffness,
      }),
    );
  }, [todayScale]);

  useEffect(() => {
    monthX.value =
      monthTransitionDirection * cycleCalendarMotion.monthEnterOffsetX;
    monthOpacity.value = cycleCalendarMotion.monthEnterOpacity;
    monthX.value = withSpring(0, {
      damping: cycleCalendarMotion.monthSpringDamping,
      stiffness: cycleCalendarMotion.monthSpringStiffness,
    });
    monthOpacity.value = withTiming(1, {
      duration: cycleCalendarMotion.monthFadeDurationMs,
      easing: Easing.out(Easing.cubic),
    });
  }, [
    visibleMonth,
    visibleYear,
    monthTransitionDirection,
    monthX,
    monthOpacity,
  ]);

  useEffect(() => {
    if (isYearOverview) {
      monthScale.value = withTiming(0.94, {
        duration: cycleCalendarMotion.overviewDurationMs,
        easing: Easing.out(Easing.cubic),
      });
      monthOpacity.value = withTiming(0, {
        duration: cycleCalendarMotion.overviewDurationMs,
        easing: Easing.out(Easing.cubic),
      });
      yearScale.value = withTiming(1, {
        duration: cycleCalendarMotion.overviewDurationMs,
        easing: Easing.out(Easing.cubic),
      });
      yearOpacity.value = withTiming(1, {
        duration: cycleCalendarMotion.overviewDurationMs,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    monthScale.value = withTiming(1, {
      duration: cycleCalendarMotion.overviewDurationMs,
      easing: Easing.out(Easing.cubic),
    });
    monthOpacity.value = withTiming(1, {
      duration: cycleCalendarMotion.overviewDurationMs,
      easing: Easing.out(Easing.cubic),
    });
    yearScale.value = withTiming(0.98, {
      duration: cycleCalendarMotion.overviewDurationMs,
      easing: Easing.out(Easing.cubic),
    });
    yearOpacity.value = withTiming(0, {
      duration: cycleCalendarMotion.overviewFadeOutDurationMs,
      easing: Easing.out(Easing.cubic),
    });
  }, [isYearOverview, monthOpacity, monthScale, yearOpacity, yearScale]);

  const navigateMonth = (direction: "next" | "prev") => {
    void HapticsService.gestureTick();
    setMonthTransitionDirection(
      resolveTransitionDirectionFromNavigation(direction),
    );
    const nextState = getAdjacentMonthState(
      visibleMonth,
      visibleYear,
      direction,
    );
    setVisibleMonth(nextState.month);
    setVisibleYear(nextState.year);
  };

  const goPrevMonth = () => {
    navigateMonth("prev");
  };

  const goNextMonth = () => {
    navigateMonth("next");
  };

  const handleMonthSwipe = (dx: number, vx: number) => {
    if (isYearOverview) return;

    const direction = resolveMonthSwipeDirection(dx, vx);
    if (!direction) return;

    navigateMonth(direction);
  };

  const monthPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          !isYearOverview && shouldCaptureMonthPan(gestureState.dx),
        onPanResponderRelease: (_, gestureState) => {
          handleMonthSwipe(gestureState.dx, gestureState.vx);
        },
      }),
    [isYearOverview],
  );

  const selectedDayStatus = selectedDateIso
    ? resolvedCycleData[selectedDateIso]
    : null;

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    if (typeof error === "object" && error !== null && "message" in error) {
      const message = String((error as { message?: string }).message ?? "").trim();
      if (message) {
        return message;
      }
    }

    return fallback;
  };

  const handleStartPeriod = async () => {
    try {
      await startCycleMutation.mutateAsync();
      Alert.alert("Period started", "Your period has been started for today.");
    } catch (error) {
      const message = getErrorMessage(error, "Could not start period.");

      if (message.toLowerCase().includes("active period")) {
        await queryClient.invalidateQueries({ queryKey: CURRENT_CYCLE_KEY });
        await queryClient.invalidateQueries({ queryKey: ["cycle-history"] });
      }

      Alert.alert("Could not start period", message);
    }
  };

  const handleEndPeriod = async () => {
    try {
      await endCycleMutation.mutateAsync();
      Alert.alert("Period ended", "Your active period has been ended.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not end period.";
      Alert.alert("Could not end period", message);
    }
  };

  const handleLogFlow = () => {
    router.push("/log" as never);
  };

  return (
    <Screen scrollable={false} showAurora={false}>
      <View className="flex-1">
        <CalendarHeader
          monthLabel={formatMonthYear(visibleMonth, visibleYear)}
          yearLabel={String(visibleYear)}
          isYearOverview={isYearOverview}
          themeVariant={theme}
          onPrev={goPrevMonth}
          onNext={goNextMonth}
          onToggleView={() => {
            void HapticsService.selection();
            setIsYearOverview((prev) => !prev);
          }}
        />

        <View
          className={
            isYearOverview
              ? "mt-4 flex-1"
              : "mt-4 rounded-[30px] px-4 pb-3 pt-3"
          }
          style={
            isYearOverview
              ? undefined
              : {
                  backgroundColor: calendarTheme.panelBackground,
                  shadowColor: "#000000",
                  shadowOpacity: 0.06,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 3,
                  overflow: "hidden",
                }
          }
        >
          <Animated.View
            style={monthContainerStyle}
            pointerEvents={isYearOverview ? "none" : "auto"}
            {...monthPanResponder.panHandlers}
          >
            <View className="mb-1 flex-row">
              {calendarWeekdays.map((day, index) => (
                <View
                  key={`weekday-${day}-${index}`}
                  className="flex-1 items-center py-2"
                >
                  <Typography
                    variant="helper"
                    className={`text-[12px] tracking-[1px] ${index === 0 ? "font-semibold text-[#D70015]" : "text-somaMauve"}`}
                    style={index === 0 ? { color: "#D70015" } : undefined}
                  >
                    {day}
                  </Typography>
                </View>
              ))}
            </View>

            {monthWeeks.map((week, weekIndex) => (
              <DayRow
                key={`week-${visibleYear}-${visibleMonth}-${weekIndex}`}
                week={week}
                weekIndex={weekIndex}
                month={visibleMonth}
                year={visibleYear}
                selectedDateIso={selectedDateIso}
                todayIso={todayIso}
                cycleDataMap={resolvedCycleData}
                themeVariant={theme}
                onPressDate={setSelectedDateIso}
                todayScale={todayScale}
                monthAnimationSeed={monthAnimationSeed}
              />
            ))}
          </Animated.View>

          {isYearOverview ? (
            <Animated.View
              style={[
                yearContainerStyle,
                {
                  position: "absolute",
                  inset: 0,
                },
              ]}
              pointerEvents="auto"
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: 2, paddingBottom: 2 }}
              >
                {overviewYears.map((yearItem) => (
                  <View
                    key={`overview-year-${yearItem}`}
                    className="mb-1.5"
                  >
                    <Typography
                      variant="serifSm"
                      className="mb-2 px-1 text-[48px] leading-[52px]"
                      style={{
                        color:
                          yearItem === currentYear
                            ? "#D70015"
                            : isDark
                              ? "#F2F2F2"
                              : "#2D2327",
                      }}
                    >
                      {yearItem}
                    </Typography>

                    <View className="flex-row flex-wrap justify-between">
                      {Array.from({ length: 12 }).map((_, monthIndex) => (
                        <MiniMonth
                          key={`mini-month-${yearItem}-${monthIndex}`}
                          monthIndex={monthIndex}
                          year={yearItem}
                          isSelected={
                            visibleYear === yearItem && visibleMonth === monthIndex
                          }
                          cycleDataMap={resolvedCycleData}
                          themeVariant={theme}
                          onPress={(month) => {
                            setMonthTransitionDirection(
                              resolveMonthSelectionDirection(visibleMonth, month),
                            );
                            setVisibleMonth(month);
                            setVisibleYear(yearItem);
                            setIsYearOverview(false);
                          }}
                        />
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </Animated.View>
          ) : null}
        </View>

        {!isYearOverview ? <CycleLegend themeVariant={theme} /> : null}

        {!isYearOverview && selectedDateIso ? (
          <View
            className="mt-3 rounded-[26px] px-5 py-4"
            style={{
              backgroundColor: calendarTheme.detailBackground,
            }}
          >
            <Typography
              variant="serifSm"
              className="text-[36px] text-somaCharcoal dark:text-darkTextPrimary"
            >
              {parseIso(selectedDateIso).getDate()}
            </Typography>
            <Typography className="mt-1 text-base text-somaCharcoal dark:text-darkTextPrimary">
              {selectedDayStatus
                ? `${selectedDayStatus.replace("_", " ")} day`
                : "No cycle marker for this date"}
            </Typography>
          </View>
        ) : null}

        {!isYearOverview ? (
          <View
            className="mt-3 rounded-[26px] p-3"
            style={{
              backgroundColor: calendarTheme.detailBackground,
            }}
          >
            {!hasActivePeriod ? (
              <PressableScale
                onPress={handleStartPeriod}
                disabled={startCycleMutation.isPending}
                style={{
                  borderRadius: 999,
                  paddingVertical: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.primary,
                  opacity: startCycleMutation.isPending ? 0.7 : 1,
                }}
              >
                <Typography style={{ color: "#FFFFFF", fontWeight: "600" }}>
                  {startCycleMutation.isPending
                    ? "Starting..."
                    : "Start Period"}
                </Typography>
              </PressableScale>
            ) : (
              <View className="flex-row gap-3">
                <PressableScale
                  onPress={handleLogFlow}
                  style={{
                    flex: 1,
                    borderRadius: 999,
                    paddingVertical: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: isDark
                      ? "rgba(255,255,255,0.24)"
                      : "rgba(199,150,150,0.45)",
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(255,255,255,0.72)",
                  }}
                >
                  <Typography
                    style={{
                      color: isDark ? "#F2F2F2" : colors.textPrimary,
                      fontWeight: "700",
                    }}
                  >
                    Log Flow
                  </Typography>
                </PressableScale>

                <PressableScale
                  onPress={handleEndPeriod}
                  disabled={endCycleMutation.isPending}
                  style={{
                    flex: 1,
                    borderRadius: 999,
                    paddingVertical: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: colors.primary,
                    opacity: endCycleMutation.isPending ? 0.7 : 1,
                  }}
                >
                  <Typography style={{ color: "#FFFFFF", fontWeight: "600" }}>
                    {endCycleMutation.isPending ? "Ending..." : "End Period"}
                  </Typography>
                </PressableScale>
              </View>
            )}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

export function SmartCalendarScreenWithErrorBoundary() {
  return (
    <ScreenErrorBoundary screenName="SmartCalendarScreen">
      <SmartCalendarScreen />
    </ScreenErrorBoundary>
  );
}
