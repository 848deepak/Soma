import { useEffect, useMemo, useState } from "react";
import { PanResponder, View } from "react-native";
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
} from "@/hooks/useCycleCalendar";
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
  const { isDark } = useAppTheme();
  const [isYearOverview, setIsYearOverview] = useState(false);
  const [selectedDateIso, setSelectedDateIso] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(new Date().getMonth());
  const [visibleYear, setVisibleYear] = useState(new Date().getFullYear());
  const [monthTransitionDirection, setMonthTransitionDirection] = useState<
    1 | -1
  >(1);
  const monthAnimationSeed = `${visibleYear}-${visibleMonth}`;
  const calendarTheme = isDark
    ? cycleCalendarTheme.dark
    : cycleCalendarTheme.light;

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

  const resolvedCycleData = useCycleCalendar(cycleData);

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

  return (
    <Screen scrollable={false} showAurora={false}>
      <View
        className="flex-1"
        style={{ backgroundColor: calendarTheme.screenBackground }}
      >
        <CalendarHeader
          title="Your Cycle Calendar"
          monthLabel={formatMonthYear(visibleMonth, visibleYear)}
          isDark={isDark}
          onPrev={goPrevMonth}
          onNext={goNextMonth}
          onToggleView={() => {
            void HapticsService.selection();
            setIsYearOverview((prev) => !prev);
          }}
        />

        <View
          className="mt-4 flex-1 rounded-[30px] px-4 pb-4 pt-4"
          style={{
            backgroundColor: calendarTheme.panelBackground,
            shadowColor: "#000000",
            shadowOpacity: 0.06,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
            elevation: 3,
          }}
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
                    className="text-[12px] tracking-[1px] text-somaMauve"
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
                isDark={isDark}
                onPressDate={setSelectedDateIso}
                todayScale={todayScale}
                monthAnimationSeed={monthAnimationSeed}
              />
            ))}
          </Animated.View>

          <Animated.View
            style={[yearContainerStyle, { position: "absolute", inset: 12 }]}
            pointerEvents={isYearOverview ? "auto" : "none"}
          >
            <View className="flex-row flex-wrap justify-between pt-2">
              {Array.from({ length: 12 }).map((_, monthIndex) => (
                <MiniMonth
                  key={`mini-month-${monthIndex}`}
                  monthIndex={monthIndex}
                  year={visibleYear}
                  isSelected={visibleMonth === monthIndex}
                  cycleDataMap={resolvedCycleData}
                  isDark={isDark}
                  onPress={(month) => {
                    setMonthTransitionDirection(
                      resolveMonthSelectionDirection(visibleMonth, month),
                    );
                    setVisibleMonth(month);
                    setIsYearOverview(false);
                  }}
                />
              ))}
            </View>
          </Animated.View>
        </View>

        <CycleLegend isDark={isDark} />

        {selectedDateIso ? (
          <View
            className="mt-4 rounded-[26px] px-5 py-4"
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
      </View>
    </Screen>
  );
}
